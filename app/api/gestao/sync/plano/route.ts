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
 * - `congelados` — nada a fazer. Vai só como lista de chaves, para a varredura
 *   reconhecer o que já é conhecido e não enriquecer de novo.
 */

// Dias após o fim da vigência em que um contrato ainda é creditado ao voucher.
const CARENCIA_DIAS = 45;

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
            plano, codigo_pessoa, treinador_web, coordenador, fechou_plano, frequencia
     FROM freepass_vouchers`
  );

  const ativos = [];
  const carencia = [];
  const congelados: string[] = [];

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
      faltaVinculo: !linha.treinador_web || !linha.coordenador,
      fechouPlano: Number(linha.fechou_plano) === 1,
    };

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

    congelados.push(marca(linha));
  }

  return NextResponse.json({
    ok: true,
    hoje,
    carenciaDias: CARENCIA_DIAS,
    total: linhas.length,
    ativos,
    carencia,
    congelados,
  });
}
