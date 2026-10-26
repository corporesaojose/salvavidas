import type { RowDataPacket } from "mysql2";
import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { tokenSyncConfere } from "@/lib/gestao/auth";
import { garantirSchema } from "@/lib/gestao/schema";

export const dynamic = "force-dynamic";

/**
 * O que o sync do n8n ainda precisa buscar na Pacto hoje.
 *
 * Voucher tem prazo: 7, 15 ou 30 dias. Depois que a vigência fecha, a frequência
 * daqueles dias não muda mais e o vínculo já foi conferido — reprocessar tudo todo dia
 * era pagar centenas de chamadas na Pacto para reescrever o mesmo valor. Aqui o banco
 * responde o que sobrou de trabalho real:
 *
 * - `ativos` — vigência correndo hoje. Frequência e contrato ainda mudam; vínculo só é
 *   buscado quando está faltando (`faltaVinculo`), porque uma vez preenchido não muda.
 * - `carencia` — venceu há pouco e a pessoa não fechou plano. A frequência está
 *   congelada, mas o contrato ainda pode ser assinado depois do voucher. Só o sync
 *   semanal olha esta lista.
 * - `revisarVinculo` — voucher já encerrado que continua sem ninguém acompanhando
 *   (nem treinador web nem professor). Vínculo pode ser cadastrado depois da vigência
 *   vencer, e sem reconferir isso o relatório acusa um voucher órfão para sempre.
 *   Custa uma chamada por voucher e só o sync de domingo olha esta lista.
 * - `completarVenda` — fechou plano, o voucher já encerrou e falta a data da venda ou a
 *   duração do plano. Sem esta lista nenhuma das outras alcança essa pessoa de novo, e
 *   os dois campos só existem no contrato da Pacto: foi o que deixou o 3º trimestre de
 *   2026 inteiro posicionado pelo início do acesso em vez do dia da venda. Uma entrada
 *   por pessoa, não por lançamento — o contrato é dado da pessoa.
 * - `congelados` — nada a fazer. Vai só como lista de chaves, para a varredura
 *   reconhecer o que já é conhecido e não enriquecer de novo.
 */

// Dias após o fim da vigência em que um contrato ainda é creditado ao voucher.
const CARENCIA_DIAS = 45;

// Teto da revisão de vínculo numa rodada. O que não couber volta no domingo seguinte —
// o que importa é não deixar a rodada semanal crescer sem limite junto com a base.
const REVISAO_VINCULO_MAX = 80;

// Teto da complementação de venda numa rodada. A fila drena sozinha: depois da primeira
// varredura só entra quem acabou de fechar e saiu das outras listas, então ela fica
// vazia na maior parte dos dias.
const COMPLETAR_VENDA_MAX = 40;

function hojeSaoPaulo(): string {
  const agora = new Date(Date.now() - 3 * 3600000);
  return agora.toISOString().slice(0, 10);
}

function dia(valor: unknown): string | null {
  if (valor instanceof Date) {
    const dois = (n: number) => String(n).padStart(2, "0");
    return `${valor.getFullYear()}-${dois(valor.getMonth() + 1)}-${dois(valor.getDate())}`;
  }
  const texto = String(valor || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

/**
 * Como a varredura reconhece um voucher que já está no banco. Ela só conhece matrícula
 * e data de lançamento; a chave do banco usa o início da vigência, que pode ser outro
 * dia. Linhas antigas ainda não têm `data_lancamento` — caem no início da vigência e se
 * corrigem sozinhas na primeira vez que passarem pelo enriquecimento.
 */
function marca(linha: RowDataPacket) {
  const lancamento = dia(linha.data_lancamento) || dia(linha.inicio_vigencia);
  return `${linha.matricula}|${lancamento}`;
}

export async function GET(request: NextRequest) {
  if (!tokenSyncConfere(request.headers.get("x-sync-token") || "")) {
    return NextResponse.json({ ok: false, erro: "Token inválido." }, { status: 401 });
  }

  await garantirSchema();
  const pool = getDbPool();
  const hoje = hojeSaoPaulo();

  const [linhas] = await pool.query<RowDataPacket[]>(
    `SELECT chave, matricula, nome, data_lancamento, inicio_vigencia, fim_vigencia,
            plano, codigo_pessoa, treinador_web, professor, coordenador, fechou_plano,
            frequencia, data_venda, plano_meses, data_contrato
     FROM freepass_vouchers`
  );

  const ativos = [];
  const carencia = [];
  const revisarVinculo = [];
  const congelados: string[] = [];

  /**
   * Estado de contrato por pessoa, acumulado ao longo da varredura. Precisa ser por
   * pessoa, e não por linha, porque `data_venda` e `data_contrato` costumam estar
   * gravadas em só uma das linhas de quem recebeu voucher mais de uma vez.
   */
  type EstadoDaPessoa = {
    fechou: boolean;
    temVenda: boolean;
    temDuracao: boolean;
    emCurso: boolean;
    dataContrato: string | null;
    alvo: (typeof linhas)[number] | null;
    inicioDoAlvo: string;
  };
  const porPessoa = new Map<string, EstadoDaPessoa>();

  for (const linha of linhas) {
    const inicio = dia(linha.inicio_vigencia);
    const fim = dia(linha.fim_vigencia);
    if (!inicio || !fim) continue;

    const detalhe = {
      chave: linha.chave as string,
      matricula: String(linha.matricula),
      nome: linha.nome as string,
      dataLancamento: dia(linha.data_lancamento),
      inicioVigencia: inicio,
      fimVigencia: fim,
      plano: linha.plano as string,
      codigoPessoa: linha.codigo_pessoa ? Number(linha.codigo_pessoa) : null,
      // Consultora fica de fora de propósito: nem todo voucher tem uma, e cobrar isso
      // faria a busca de vínculo se repetir todo dia sem nunca completar.
      faltaVinculo: (!linha.treinador_web && !linha.professor) || !linha.coordenador,
      fechouPlano: Number(linha.fechou_plano) === 1,
      // A comissão paga pela data da venda. Sem este campo aqui o sync não teria como
      // saber que ela já foi gravada, e buscaria período e contrato na Pacto toda
      // rodada para quem já fechou — chamada à toa, que é o que esta rota existe para
      // evitar.
      dataVenda: dia(linha.data_venda),
    };

    const pessoa: EstadoDaPessoa = porPessoa.get(detalhe.matricula) || {
      fechou: false,
      temVenda: false,
      temDuracao: false,
      emCurso: false,
      dataContrato: null,
      alvo: null,
      inicioDoAlvo: "",
    };
    if (detalhe.fechouPlano) pessoa.fechou = true;
    if (detalhe.dataVenda) pessoa.temVenda = true;
    if (linha.plano_meses != null) pessoa.temDuracao = true;
    if (fim >= hoje) pessoa.emCurso = true;
    if (!pessoa.dataContrato) pessoa.dataContrato = dia(linha.data_contrato);
    // A gravação vai na linha do voucher mais recente: é a oportunidade a que a venda
    // pertence, e é dela que o relatório lê a data.
    if (!pessoa.alvo || inicio > pessoa.inicioDoAlvo) {
      pessoa.alvo = linha;
      pessoa.inicioDoAlvo = inicio;
    }
    porPessoa.set(detalhe.matricula, pessoa);

    if (fim >= hoje) {
      ativos.push(detalhe);
      continue;
    }

    const diasDesdeOFim = Math.round(
      (Date.parse(`${hoje}T12:00:00`) - Date.parse(`${fim}T12:00:00`)) / 86400000
    );

    if (!detalhe.fechouPlano && diasDesdeOFim <= CARENCIA_DIAS) {
      carencia.push(detalhe);
      continue;
    }

    // Encerrado, mas sem ninguém acompanhando: o vínculo pode ter sido cadastrado
    // depois, então vale uma reconferida. Precisa do código da pessoa — sem ele a
    // chamada de vínculo não existe, e quem não tem cai no enriquecimento completo.
    const semAcompanhamento = !linha.treinador_web && !linha.professor;
    if (semAcompanhamento && detalhe.codigoPessoa) {
      revisarVinculo.push(detalhe);
    }

    congelados.push(marca(linha));
  }

  // Vigência mais recente primeiro: é de quem a recepção ainda tem lembrança e de quem
  // o vínculo tem mais chance de ter acabado de aparecer.
  revisarVinculo.sort((a, b) => b.fimVigencia.localeCompare(a.fimVigencia));

  // Fechou, o voucher já encerrou e falta a data da venda ou a duração do plano. Quem
  // ainda está com vigência correndo fica de fora: já está em `ativos`, e lá o sync
  // busca o contrato enquanto a data da venda não vier.
  const completarVenda = [];
  for (const pessoa of Array.from(porPessoa.values())) {
    if (!pessoa.fechou || pessoa.emCurso || !pessoa.alvo) continue;
    if (pessoa.temVenda && pessoa.temDuracao) continue;

    const linha = pessoa.alvo;
    const inicio = dia(linha.inicio_vigencia);
    const fim = dia(linha.fim_vigencia);
    if (!inicio || !fim) continue;

    completarVenda.push({
      chave: linha.chave as string,
      matricula: String(linha.matricula),
      nome: linha.nome as string,
      dataLancamento: dia(linha.data_lancamento),
      codigoPessoa: linha.codigo_pessoa ? Number(linha.codigo_pessoa) : null,
      inicioVigencia: inicio,
      fimVigencia: fim,
      plano: linha.plano as string,
      // O início do acesso é o que identifica de qual contrato se trata quando a pessoa
      // tem mais de um na Pacto.
      dataContrato: pessoa.dataContrato,
      faltaVenda: !pessoa.temVenda,
      faltaDuracao: !pessoa.temDuracao,
    });
  }
  // Mais recente primeiro: é o mês que ainda vai ser fechado para pagamento.
  completarVenda.sort((a, b) => b.fimVigencia.localeCompare(a.fimVigencia));

  return NextResponse.json({
    ok: true,
    hoje,
    carenciaDias: CARENCIA_DIAS,
    total: linhas.length,
    ativos,
    carencia,
    revisarVinculo: revisarVinculo.slice(0, REVISAO_VINCULO_MAX),
    revisarVinculoEmAberto: revisarVinculo.length,
    completarVenda: completarVenda.slice(0, COMPLETAR_VENDA_MAX),
    completarVendaEmAberto: completarVenda.length,
    congelados,
  });
}
