import type { RowDataPacket } from "mysql2";
import { getDbPool } from "@/lib/db";

/**
 * As chances que aparecem no alerta ("Chance hoje: 32%") são a conversão histórica da
 * Corpore por faixa de dias treinados. Elas se movem sozinhas conforme a operação muda.
 *
 * Como o número é calculado, e por que assim:
 *
 * - Só entram vouchers **já encerrados**: enquanto a vigência corre, a pessoa ainda pode
 *   fechar, e contar isso como "não fechou" puxaria a taxa para baixo todo dia.
 * - O banco acumula: o sync faz upsert e nunca apaga, então a base histórica cresce a
 *   cada mês em vez de andar junto com a janela de 150 dias da varredura.
 * - Amostra pequena não vira régua: abaixo de MINIMO_POR_FAIXA lançamentos, a faixa usa
 *   o valor de referência de mai-ago/2026 (conhecimento/03-referencias.md). Sem isso,
 *   uma semana fraca faria o alerta anunciar "chance 0%".
 * - Exclusões da equipe ficam de fora, como em todo o resto do relatório.
 */

const MINIMO_POR_FAIXA = 30;

/** Régua apurada em mai-ago/2026, usada enquanto a faixa não tem amostra própria. */
const REFERENCIA_BASE: Record<Faixa, number> = {
  nenhum: 6.9,
  "1a2": 18.5,
  "3a5": 32.4,
  "6mais": 52.3,
};

export type Faixa = "nenhum" | "1a2" | "3a5" | "6mais";

export interface TaxaFaixa {
  faixa: Faixa;
  taxa: number;
  amostra: number;
  origem: "apurado" | "referencia";
}

export function faixaDe(treinos: number): Faixa {
  if (treinos === 0) return "nenhum";
  if (treinos <= 2) return "1a2";
  if (treinos <= 5) return "3a5";
  return "6mais";
}

export async function taxasPorFaixa(hoje: string): Promise<Record<Faixa, TaxaFaixa>> {
  const pool = getDbPool();

  const [linhas] = await pool.query<RowDataPacket[]>(
    `SELECT v.frequencia, v.fechou_plano
     FROM freepass_vouchers v
     LEFT JOIN freepass_exclusoes e ON e.chave = v.chave
     WHERE e.chave IS NULL AND v.fim_vigencia < ?`,
    [hoje]
  );

  const acumulado: Record<Faixa, { total: number; fechou: number }> = {
    nenhum: { total: 0, fechou: 0 },
    "1a2": { total: 0, fechou: 0 },
    "3a5": { total: 0, fechou: 0 },
    "6mais": { total: 0, fechou: 0 },
  };

  for (const linha of linhas) {
    const faixa = faixaDe(Number(linha.frequencia) || 0);
    acumulado[faixa].total++;
    if (Number(linha.fechou_plano) === 1) acumulado[faixa].fechou++;
  }

  const resultado = {} as Record<Faixa, TaxaFaixa>;
  (Object.keys(acumulado) as Faixa[]).forEach((faixa) => {
    const { total, fechou } = acumulado[faixa];
    const suficiente = total >= MINIMO_POR_FAIXA;
    resultado[faixa] = {
      faixa,
      taxa: suficiente
        ? Math.round((fechou / total) * 1000) / 10
        : REFERENCIA_BASE[faixa],
      amostra: total,
      origem: suficiente ? "apurado" : "referencia",
    };
  });

  return resultado;
}

export function comoTexto(taxa: TaxaFaixa) {
  return String(Math.round(taxa.taxa)) + "%";
}
