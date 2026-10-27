/**
 * Dia e horário que o cliente combinou de voltar no fim da ATM. Quem guarda é o app da ATM
 * (atm.corporetraininggym.com.br); aqui só se pergunta, por matrícula, em lote.
 *
 * Precisa de ATM_INGEST_SECRET (o mesmo valor do app da ATM). Sem ele, ou com a ATM fora do
 * ar, volta null: os alertas do dia saem do mesmo jeito, só sem as regras do dia combinado e sem
 * acusar voucher sem ATM (null = não deu para consultar, Map vazio = ninguém tem dia combinado).
 */

export interface ProximoTreino {
  /** YYYY-MM-DD */
  data: string;
  /** HH:MM */
  hora: string;
}

const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export async function buscarProximosTreinos(matriculas: string[]): Promise<Map<string, ProximoTreino> | null> {
  const resultado = new Map<string, ProximoTreino>();
  const segredo = process.env.ATM_INGEST_SECRET || "";
  const lista = Array.from(new Set(matriculas.map((m) => String(m || "").replace(/^0+/, "")).filter(Boolean)));
  if (!segredo) return null;
  if (!lista.length) return resultado;

  const base = (process.env.ATM_PUBLIC_URL || "https://atm.corporetraininggym.com.br").replace(/\/+$/, "");
  try {
    const resposta = await fetch(`${base}/api/atm-sessoes/proximo-treino/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-atm-ingest-secret": segredo },
      body: JSON.stringify({ matriculas: lista }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!resposta.ok) return null;
    const corpo = await resposta.json();
    for (const [matricula, item] of Object.entries<Record<string, unknown>>(corpo?.itens || {})) {
      const data = String(item?.data || "");
      const hora = String(item?.hora || "");
      if (/^\d{4}-\d{2}-\d{2}$/.test(data) && /^\d{2}:\d{2}$/.test(hora)) resultado.set(matricula, { data, hora });
    }
  } catch (erro) {
    console.error("Não consegui buscar o próximo treino na ATM:", erro);
    return null;
  }
  return resultado;
}

/** "quarta, 22/10, às 7h" / "às 7h30". Dia da semana pela data pura, sem fuso. */
export function formatarCombinado({ data, hora }: ProximoTreino): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  const diaSemana = DIAS_SEMANA[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()];
  const [h, min] = hora.split(":");
  return `${diaSemana}, ${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}, às ${Number(h)}h${min === "00" ? "" : min}`;
}
