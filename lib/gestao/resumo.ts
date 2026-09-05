import type { RowDataPacket } from "mysql2";
import { getDbPool } from "@/lib/db";
import { garantirSchema } from "@/lib/gestao/schema";
import { TOTAL_PENDENCIAS } from "@/lib/gestao/pendencias";

/**
 * Retrato para a leitura semanal dos sócios. Só agregado — nome de cliente fica no
 * relatório, não no resumo.
 *
 * Conversão é sempre por PESSOA, nunca por lançamento: relançar o passe para quem teve
 * imprevisto é parte do processo (ver conhecimento/02-regras-dos-vouchers.md), e contar
 * por lançamento inflaria o número.
 */

export interface ResumoPeriodo {
  rotulo: string;
  de: string;
  ate: string;
  vouchers: number;
  pessoas: number;
  fecharam: number;
  conversao: number | null;
  mediaDias: number | null;
  semNenhumTreino: number;
}

export interface ResumoGestao {
  semana: ResumoPeriodo;
  mesAtual: ResumoPeriodo;
  mesAnterior: ResumoPeriodo;
  porTipoNoMes: { plano: string; pessoas: number; fecharam: number; conversao: number | null }[];
  emCurso: { total: number; emRisco: number; engajados: number; semTreinador: number };
  equipe: { anotacoesNaSemana: number; exclusoes: number; pendenciasAbertas: number };
  atualizadoEm: string | null;
}

function dia(data: Date) {
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}`;
}

function hojeSaoPaulo() {
  return new Date(Date.now() - 3 * 3600000);
}

async function periodo(rotulo: string, de: string, ate: string): Promise<ResumoPeriodo> {
  const pool = getDbPool();
  const [linhas] = await pool.query<RowDataPacket[]>(
    `SELECT v.matricula, v.frequencia, v.fechou_plano
     FROM freepass_vouchers v
     LEFT JOIN freepass_exclusoes e ON e.chave = v.chave
     WHERE e.chave IS NULL AND v.inicio_vigencia BETWEEN ? AND ?`,
    [de, ate]
  );

  const pessoas = new Set(linhas.map((l) => l.matricula));
  const fecharam = new Set(
    linhas.filter((l) => Number(l.fechou_plano) === 1).map((l) => l.matricula)
  );
  const soma = linhas.reduce((s, l) => s + (Number(l.frequencia) || 0), 0);

  return {
    rotulo,
    de,
    ate,
    vouchers: linhas.length,
    pessoas: pessoas.size,
    fecharam: fecharam.size,
    conversao: pessoas.size ? Math.round((fecharam.size / pessoas.size) * 1000) / 10 : null,
    mediaDias: linhas.length ? Math.round((soma / linhas.length) * 10) / 10 : null,
    semNenhumTreino: linhas.filter((l) => Number(l.frequencia) === 0).length,
  };
}

export async function montarResumo(): Promise<ResumoGestao> {
  await garantirSchema();
  const pool = getDbPool();

  const hoje = hojeSaoPaulo();
  const umDia = 86400000;

  const inicioSemana = dia(new Date(hoje.getTime() - 7 * umDia));
  const fimSemana = dia(hoje);

  const primeiroDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const primeiroDoMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const ultimoDoMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);

  const [semana, mesAtual, mesAnterior] = await Promise.all([
    periodo("últimos 7 dias", inicioSemana, fimSemana),
    periodo("mês atual", dia(primeiroDoMes), dia(hoje)),
    periodo("mês anterior", dia(primeiroDoMesAnterior), dia(ultimoDoMesAnterior)),
  ]);

  // Por tipo, dentro do mês corrente.
  const [porTipo] = await pool.query<RowDataPacket[]>(
    `SELECT v.plano, v.matricula, MAX(v.fechou_plano) AS fechou
     FROM freepass_vouchers v
     LEFT JOIN freepass_exclusoes e ON e.chave = v.chave
     WHERE e.chave IS NULL AND v.inicio_vigencia BETWEEN ? AND ?
     GROUP BY v.plano, v.matricula`,
    [dia(primeiroDoMes), dia(hoje)]
  );

  const agrupado: Record<string, { pessoas: number; fecharam: number }> = {};
  for (const linha of porTipo) {
    const plano = linha.plano as string;
    agrupado[plano] = agrupado[plano] || { pessoas: 0, fecharam: 0 };
    agrupado[plano].pessoas++;
    if (Number(linha.fechou) === 1) agrupado[plano].fecharam++;
  }

  // Passes correndo agora: é sobre eles que dá para agir esta semana.
  const agora = dia(hoje);
  const [emCurso] = await pool.query<RowDataPacket[]>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN v.frequencia <= 1
                 AND DATEDIFF(?, v.inicio_vigencia) >= DATEDIFF(v.fim_vigencia, v.inicio_vigencia) / 2
                THEN 1 ELSE 0 END) AS em_risco,
       SUM(CASE WHEN v.frequencia >= 3 THEN 1 ELSE 0 END) AS engajados,
       SUM(CASE WHEN v.treinador_web IS NULL OR v.treinador_web = '' THEN 1 ELSE 0 END) AS sem_treinador
     FROM freepass_vouchers v
     LEFT JOIN freepass_exclusoes e ON e.chave = v.chave
     WHERE e.chave IS NULL AND v.fechou_plano = 0
       AND v.inicio_vigencia <= ? AND v.fim_vigencia >= ?`,
    [agora, agora, agora]
  );

  const [equipe] = await pool.query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM freepass_anotacoes WHERE criado_em >= ?) AS anotacoes,
       (SELECT COUNT(*) FROM freepass_exclusoes) AS exclusoes,
       (SELECT COUNT(*) FROM freepass_pendencias) AS pendencias_resolvidas`,
    [inicioSemana]
  );

  const [atualizacao] = await pool.query<RowDataPacket[]>(
    `SELECT MAX(atualizado_em) AS ultima FROM freepass_vouchers`
  );

  return {
    semana,
    mesAtual,
    mesAnterior,
    porTipoNoMes: Object.keys(agrupado).map((plano) => ({
      plano,
      pessoas: agrupado[plano].pessoas,
      fecharam: agrupado[plano].fecharam,
      conversao: agrupado[plano].pessoas
        ? Math.round((agrupado[plano].fecharam / agrupado[plano].pessoas) * 1000) / 10
        : null,
    })),
    emCurso: {
      total: Number(emCurso[0]?.total) || 0,
      emRisco: Number(emCurso[0]?.em_risco) || 0,
      engajados: Number(emCurso[0]?.engajados) || 0,
      semTreinador: Number(emCurso[0]?.sem_treinador) || 0,
    },
    equipe: {
      anotacoesNaSemana: Number(equipe[0]?.anotacoes) || 0,
      exclusoes: Number(equipe[0]?.exclusoes) || 0,
      pendenciasAbertas: TOTAL_PENDENCIAS - (Number(equipe[0]?.pendencias_resolvidas) || 0),
    },
    atualizadoEm: atualizacao[0]?.ultima ? String(atualizacao[0].ultima) : null,
  };
}
