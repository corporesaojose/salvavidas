import type { RowDataPacket } from "mysql2";
import { getDbPool } from "@/lib/db";
import { garantirSchema } from "@/lib/gestao/schema";
import { acharPessoa } from "@/lib/gestao/pessoas";
import { rotuloPlano, termoNaFrase } from "@/lib/gestao/planos";
import { comoTexto, faixaDe, taxasPorFaixa } from "@/lib/gestao/referencias";
import { buscarProximosTreinos, formatarCombinado } from "@/lib/gestao/proximoTreino";

/**
 * Alerta só existe quando ainda dá para mudar o desfecho.
 *
 * A régua vem da apuração de mai-ago/2026 (lib/gestao/conhecimento/03-referencias.md):
 * quem termina o voucher com 1-2 treinos fecha 18,5%; com 3-5, 32,4%; com 6+, 52,3%.
 * Ou seja, o que converte é mudar de faixa — e só dá para mudar de faixa enquanto o
 * voucher está correndo. Passou na catraca, venceu ontem e fechou plano são registro:
 * ficam no relatório e no resumo semanal, não interrompem ninguém.
 */

const DIA = 86400000;

/** Metade da vigência consumida e no máximo um treino: é a última janela útil. */
const TRAVOU_MAX_TREINOS = 1;
const TRAVOU_FRACAO_VIGENCIA = 0.5;

/** Já tinha rotina (3+ treinos) e sumiu: a perda mais cara, porque já estava dentro. */
const REGREDIU_MIN_TREINOS = 3;
const REGREDIU_DIAS_SEM_VIR = 4;

/**
 * Dia combinado na ATM (decisão do Fernando, 27/10/2026). No fim da ATM o cliente marca o dia
 * e o horário do primeiro treino. Se não passa na catraca desde esse dia, o treinador é avisado
 * 1, 3 e 5 dias depois (no 5º a consultora também, para ajudar no contato) — só enquanto o
 * voucher corre. Quem veio recebe o status na metade da vigência (no voucher de 15 e de 30 dias;
 * na experiência de 7 dias, no 7º dia) — só o treinador, ou treinador e consultora quando o
 * cliente faltou no combinado e voltou depois. Na experiência, quem faltou e voltou recebe também
 * o status da metade, com a consultora.
 * As regras de "travou" e "regrediu" continuam valendo para todos.
 */
const FALTOU_DIAS = [5, 3, 1] as const;
const FALTOU_COM_CONSULTORA = 5;
const STATUS_DIA_DA_VIGENCIA = 7;
/** A partir desta duração (vouchers de 15 e 30 dias) o status do 7º dia vira o da metade. */
const STATUS_NA_METADE_A_PARTIR_DE = 14;

export type TipoAlerta = "travou" | "regrediu" | "faltou_1" | "faltou_3" | "faltou_5" | "status_7" | "metade";

export interface ItemAlerta {
  chave: string;
  tipo: TipoAlerta;
  /** Título curto do aviso, mostrado acima da linha do voucher. */
  rotulo: string;
  /** Além do treinador (ou professor), a consultora também recebe. */
  paraConsultora: boolean;
  matricula: string;
  nome: string;
  fotoUrl: string | null;
  plano: string;
  diaDaVigencia: number;
  duracao: number;
  diasRestantes: number;
  treinos: number;
  ultimoAcesso: string | null;
  diasSemVir: number | null;
  chanceAtual: string;
  acao: string;
  consultora: string | null;
  treinadorWeb: string | null;
  professor: string | null;
}

export interface CardDiario {
  destinatario: string;
  slackId: string | null;
  papel: string;
  itens: ItemAlerta[];
}

function dia(valor: unknown): string | null {
  if (valor instanceof Date) {
    const dois = (n: number) => String(n).padStart(2, "0");
    return `${valor.getFullYear()}-${dois(valor.getMonth() + 1)}-${dois(valor.getDate())}`;
  }
  const texto = String(valor || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

function diferencaEmDias(de: string, ate: string) {
  return Math.round((Date.parse(ate + "T12:00:00") - Date.parse(de + "T12:00:00")) / DIA);
}

function hojeSaoPaulo(): string {
  // O pool já roda em -03:00; para a data usada nas contas, o horário local do
  // servidor pode estar em UTC, então a conversão é explícita.
  const agora = new Date(Date.now() - 3 * 3600000);
  return agora.toISOString().slice(0, 10);
}

/**
 * Monta os alertas do dia, agrupados por quem precisa agir. Consultora e treinador
 * vinculado recebem a mesma linha — os dois têm o que fazer, e um cobra o outro.
 */
export async function montarAlertasDoDia(hoje = hojeSaoPaulo()): Promise<CardDiario[]> {
  await garantirSchema();
  const pool = getDbPool();

  // Só vouchers correndo hoje, e nunca os que a equipe excluiu do relatório.
  const [linhas] = await pool.query<RowDataPacket[]>(
    `SELECT v.* FROM freepass_vouchers v
     LEFT JOIN freepass_exclusoes e ON e.chave = v.chave
     WHERE e.chave IS NULL
       AND v.inicio_vigencia <= ?
       AND v.fim_vigencia >= ?
       AND v.fechou_plano = 0`,
    [hoje, hoje]
  );

  // A regua sai do historico da propria Corpore, nao de numero fixo no codigo.
  const taxas = await taxasPorFaixa(hoje);

  // Dia combinado na ATM, e quem ja recebeu o aviso de falta (para o status da metade).
  const combinados = await buscarProximosTreinos(linhas.map((l) => String(l.matricula || "")));
  const [faltasAvisadas] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT chave FROM freepass_alertas WHERE tipo = 'faltou_1'`
  );
  const faltouNoCombinado = new Set(faltasAvisadas.map((l) => String(l.chave)));

  const itens: ItemAlerta[] = [];

  for (const linha of linhas) {
    const inicio = dia(linha.inicio_vigencia);
    const fim = dia(linha.fim_vigencia);
    if (!inicio || !fim) continue;

    const duracao = Math.max(diferencaEmDias(inicio, fim), 1);
    const diaDaVigencia = diferencaEmDias(inicio, hoje);
    const diasRestantes = diferencaEmDias(hoje, fim);
    const treinos = Number(linha.frequencia) || 0;
    const ultimoAcesso = dia(linha.ultimo_acesso);
    const diasSemVir = ultimoAcesso ? diferencaEmDias(ultimoAcesso, hoje) : null;

    const base = {
      chave: linha.chave as string,
      matricula: linha.matricula as string,
      nome: linha.nome as string,
      fotoUrl: (linha.foto_url as string) || null,
      plano: rotuloPlano(linha.plano as string),
      diaDaVigencia,
      duracao,
      diasRestantes,
      treinos,
      ultimoAcesso,
      diasSemVir,
      consultora: (linha.consultora as string) || (linha.lancado_por as string) || null,
      treinadorWeb: (linha.treinador_web as string) || null,
      professor: (linha.professor as string) || null,
    };
    const chance = comoTexto(taxas[faixaDe(treinos)]);
    const dataCurta = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
    const resumoTreinos =
      `${treinos} ${treinos === 1 ? "treino" : "treinos"} até agora` +
      (ultimoAcesso ? `, último em ${dataCurta(ultimoAcesso)}` : "");
    const proximoPasso =
      treinos >= 3
        ? "Sugestão: manter o ritmo e já combinar os próximos treinos."
        : `Sugestão: combinar os próximos treinos — com 3 ou mais a chance vai para ${comoTexto(taxas["3a5"])}.`;

    // ---- Dia combinado na ATM ----
    // Vale o combinado que cai dentro da vigencia. "Veio" = passou na catraca no dia combinado
    // ou depois (o sync guarda so o ultimo acesso, nao o historico dia a dia).
    const combinado = combinados.get(String(linha.matricula || "").replace(/^0+/, ""));
    if (combinado && combinado.data >= inicio && combinado.data <= fim) {
      const quando = formatarCombinado(combinado);
      const veio = !!ultimoAcesso && ultimoAcesso >= combinado.data;
      const depois = diferencaEmDias(combinado.data, hoje);
      if (!veio && depois >= 1) {
        const marco = FALTOU_DIAS.find((n) => depois >= n)!;
        const comConsultora = marco >= FALTOU_COM_CONSULTORA;
        itens.push({
          ...base,
          tipo: `faltou_${marco}` as TipoAlerta,
          rotulo: marco === 1 ? "Não veio no dia combinado na ATM" : `${depois} dias depois do combinado, sem vir`,
          paraConsultora: comConsultora,
          chanceAtual: chance,
          acao:
            marco === 1
              ? `Combinou na ATM de voltar ${quando} e não passou na catraca. Sugestão: mandar mensagem dizendo que estava esperando e marcar um novo dia.`
              : `Combinou na ATM de voltar ${quando} e não veio até hoje. Sugestão: falar de novo e marcar o dia, ainda restam ${diasRestantes} dia(s) de acesso.` +
                (comConsultora ? " A consultora também recebeu este aviso para ajudar no contato." : ""),
        });
      }
      const faltou = faltouNoCombinado.has(base.chave);
      const comoFoi = faltou
        ? `Faltou no dia combinado (${dataCurta(combinado.data)}) e voltou depois.`
        : "Veio no dia combinado.";
      const statusNaMetade = duracao >= STATUS_NA_METADE_A_PARTIR_DE;
      if (veio && !statusNaMetade && diaDaVigencia >= STATUS_DIA_DA_VIGENCIA) {
        itens.push({
          ...base,
          tipo: "status_7",
          rotulo: `Status no ${STATUS_DIA_DA_VIGENCIA}º dia`,
          paraConsultora: false,
          chanceAtual: chance,
          acao: `${resumoTreinos}. ${comoFoi} ${proximoPasso}`,
        });
      }
      if (veio && (statusNaMetade || faltou) && diaDaVigencia >= duracao * 0.5) {
        itens.push({
          ...base,
          tipo: "metade",
          rotulo: `Metade d${termoNaFrase(linha.plano as string)}`,
          paraConsultora: faltou,
          chanceAtual: chance,
          acao: `${resumoTreinos}. ${comoFoi} ${proximoPasso}`,
        });
      }
    }

    if (
      treinos >= REGREDIU_MIN_TREINOS &&
      diasSemVir !== null &&
      diasSemVir >= REGREDIU_DIAS_SEM_VIR &&
      diasRestantes >= 1
    ) {
      itens.push({
        ...base,
        tipo: "regrediu",
        rotulo: "Parou de vir",
        paraConsultora: true,
        chanceAtual: comoTexto(taxas[faixaDe(treinos)]),
        acao: `Já tinha rotina e parou há ${diasSemVir} dias. Sugestão: entrar em contato, ainda restam ${diasRestantes} dia(s) de acesso.`,
      });
      continue;
    }

    if (
      treinos <= TRAVOU_MAX_TREINOS &&
      diaDaVigencia >= duracao * TRAVOU_FRACAO_VIGENCIA &&
      diasRestantes >= 1
    ) {
      itens.push({
        ...base,
        tipo: "travou",
        rotulo: "Voucher travado",
        paraConsultora: true,
        chanceAtual: comoTexto(taxas[faixaDe(treinos)]),
        acao:
          treinos === 0
            ? `Metade d${termoNaFrase(linha.plano as string)} passou sem nenhum treino. Sugestão: marcar o primeiro treino nos próximos ${Math.min(diasRestantes, 3)} dias — sem isso, fecha em ${comoTexto(taxas.nenhum)} dos casos.`
            : `Um treino em ${diaDaVigencia} dias. Sugestão: dois treinos nesta semana levam a chance de ${comoTexto(taxas["1a2"])} para ${comoTexto(taxas["3a5"])}.`,
      });
    }
  }

  // Cada item vai para a consultora e para quem acompanha tecnicamente — treinador web
  // quando existe, senão o professor (vínculo PR, às vezes a fisioterapeuta). É quem
  // tem como marcar o treino que falta.
  const porPessoa = new Map<string, CardDiario>();

  function incluir(nome: string | null, papel: string, item: ItemAlerta) {
    if (!nome) return;
    const chave = nome.toUpperCase();
    if (!porPessoa.has(chave)) {
      porPessoa.set(chave, {
        destinatario: nome,
        slackId: acharPessoa(nome)?.slackId || null,
        papel,
        itens: [],
      });
    }
    porPessoa.get(chave)!.itens.push(item);
  }

  for (const item of itens) {
    if (item.paraConsultora) incluir(item.consultora, "consultora", item);
    incluir(
      item.treinadorWeb || item.professor,
      item.treinadorWeb ? "treinador" : "professor",
      item
    );
  }

  // Dentro do card, o mais urgente primeiro: quem já engajou e sumiu, depois quem tem
  // menos dias de voucher pela frente.
  for (const card of Array.from(porPessoa.values())) {
    card.itens.sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === "regrediu" ? -1 : 1;
      return a.diasRestantes - b.diasRestantes;
    });
  }

  return Array.from(porPessoa.values()).sort((a, b) => b.itens.length - a.itens.length);
}

/** Registra o envio para não repetir o mesmo alerta amanhã e para medir depois. */
export async function registrarEnvio(cards: CardDiario[]) {
  const pool = getDbPool();
  for (const card of cards) {
    for (const item of card.itens) {
      await pool.query(
        `INSERT IGNORE INTO freepass_alertas (chave, tipo, destinatario) VALUES (?, ?, ?)`,
        [item.chave, item.tipo, card.destinatario]
      );
    }
  }
}

/** Alertas já enviados, para o endpoint devolver só o que é novo. */
export async function jaAlertados(): Promise<Set<string>> {
  const pool = getDbPool();
  const [linhas] = await pool.query<RowDataPacket[]>(
    `SELECT chave, tipo, destinatario FROM freepass_alertas`
  );
  return new Set(linhas.map((l) => `${l.chave}|${l.tipo}|${l.destinatario}`));
}
