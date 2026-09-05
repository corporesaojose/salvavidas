import type { RowDataPacket } from "mysql2";
import { getDbPool } from "@/lib/db";
import { garantirSchema } from "@/lib/gestao/schema";
import { acharPessoa } from "@/lib/gestao/pessoas";

/**
 * Alerta só existe quando ainda dá para mudar o desfecho.
 *
 * A régua vem da apuração de mai-ago/2026 (lib/gestao/conhecimento/03-referencias.md):
 * quem termina o voucher com 1-2 treinos fecha 18,5%; com 3-5, 32,4%; com 6+, 52,3%.
 * Ou seja, o que converte é mudar de faixa — e só dá para mudar de faixa enquanto o
 * passe está correndo. Passou na catraca, venceu ontem e fechou plano são registro:
 * ficam no relatório e no resumo semanal, não interrompem ninguém.
 */

const DIA = 86400000;

/** Metade da vigência consumida e no máximo um treino: é a última janela útil. */
const TRAVOU_MAX_TREINOS = 1;
const TRAVOU_FRACAO_VIGENCIA = 0.5;

/** Já tinha rotina (3+ treinos) e sumiu: a perda mais cara, porque já estava dentro. */
const REGREDIU_MIN_TREINOS = 3;
const REGREDIU_DIAS_SEM_VIR = 4;

export type TipoAlerta = "travou" | "regrediu";

export interface ItemAlerta {
  chave: string;
  tipo: TipoAlerta;
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

  // Só passes correndo hoje, e nunca os que a equipe excluiu do relatório.
  const [linhas] = await pool.query<RowDataPacket[]>(
    `SELECT v.* FROM freepass_vouchers v
     LEFT JOIN freepass_exclusoes e ON e.chave = v.chave
     WHERE e.chave IS NULL
       AND v.inicio_vigencia <= ?
       AND v.fim_vigencia >= ?
       AND v.fechou_plano = 0`,
    [hoje, hoje]
  );

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
      plano: linha.plano as string,
      diaDaVigencia,
      duracao,
      diasRestantes,
      treinos,
      ultimoAcesso,
      diasSemVir,
      consultora: (linha.consultora as string) || (linha.lancado_por as string) || null,
      treinadorWeb: (linha.treinador_web as string) || null,
    };

    if (
      treinos >= REGREDIU_MIN_TREINOS &&
      diasSemVir !== null &&
      diasSemVir >= REGREDIU_DIAS_SEM_VIR &&
      diasRestantes >= 1
    ) {
      itens.push({
        ...base,
        tipo: "regrediu",
        chanceAtual: treinos >= 6 ? "52%" : "32%",
        acao: `Já tinha rotina e parou há ${diasSemVir} dias. Ligar hoje: com ${diasRestantes} dia(s) de passe ainda dá para retomar.`,
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
        chanceAtual: treinos === 0 ? "7%" : "18%",
        acao:
          treinos === 0
            ? `Metade do voucher passou sem nenhum treino. Marcar o primeiro treino nos próximos ${Math.min(diasRestantes, 3)} dias — sem isso, fecha em 7% dos casos.`
            : `Um treino em ${diaDaVigencia} dias. Dois treinos nesta semana levam a chance de 18% para 32%.`,
      });
    }
  }

  // Cada item vai para a consultora e para o treinador vinculado.
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
    incluir(item.consultora, "consultora", item);
    incluir(item.treinadorWeb, "treinador", item);
  }

  // Dentro do card, o mais urgente primeiro: quem já engajou e sumiu, depois quem tem
  // menos dias de passe pela frente.
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
