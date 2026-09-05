import type { RowDataPacket } from "mysql2";
import { getDbPool } from "@/lib/db";
import { garantirSchema } from "@/lib/gestao/schema";

export interface Voucher {
  chave: string;
  matricula: string;
  nome: string;
  fotoUrl: string | null;
  treinadorWeb: string | null;
  coordenador: string | null;
  consultora: string | null;
  inicioVigencia: string;
  fimVigencia: string;
  plano: string;
  frequencia: number;
  fechou: boolean;
  planoFechado: string | null;
  dataContrato: string | null;
  lancadoPor: string | null;
  situacaoAtual: string | null;
}

export interface Anotacao {
  id: number;
  chave: string;
  texto: string;
  autor: string;
  em: string;
}

export interface Exclusao {
  chave: string;
  justificativa: string;
  autor: string;
  em: string;
}

export interface Pendencia {
  id: string;
  autor: string;
  nota: string | null;
  em: string;
}

export interface DadosGestao {
  vouchers: Voucher[];
  anotacoes: Anotacao[];
  exclusoes: Exclusao[];
  pendencias: Pendencia[];
  atualizadoEm: string | null;
}

function dia(valor: unknown): string {
  if (valor instanceof Date) {
    // O pool já roda em -03:00; formatar pelos componentes locais evita voltar um dia.
    const dois = (n: number) => String(n).padStart(2, "0");
    return `${valor.getFullYear()}-${dois(valor.getMonth() + 1)}-${dois(valor.getDate())}`;
  }
  return String(valor || "").slice(0, 10);
}

function momento(valor: unknown): string {
  if (valor instanceof Date) {
    const dois = (n: number) => String(n).padStart(2, "0");
    return `${dois(valor.getDate())}/${dois(valor.getMonth() + 1)}/${valor.getFullYear()} ${dois(valor.getHours())}:${dois(valor.getMinutes())}`;
  }
  return String(valor || "");
}

export async function carregarDados(): Promise<DadosGestao> {
  await garantirSchema();
  const pool = getDbPool();

  const [vouchers] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM freepass_vouchers ORDER BY inicio_vigencia ASC, nome ASC`
  );
  const [anotacoes] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM freepass_anotacoes ORDER BY criado_em ASC`
  );
  const [exclusoes] = await pool.query<RowDataPacket[]>(`SELECT * FROM freepass_exclusoes`);
  const [pendencias] = await pool.query<RowDataPacket[]>(`SELECT * FROM freepass_pendencias`);
  const [atualizacao] = await pool.query<RowDataPacket[]>(
    `SELECT MAX(atualizado_em) AS ultima FROM freepass_vouchers`
  );

  return {
    vouchers: vouchers.map((v) => ({
      chave: v.chave,
      matricula: v.matricula,
      nome: v.nome,
      fotoUrl: v.foto_url,
      treinadorWeb: v.treinador_web,
      coordenador: v.coordenador,
      consultora: v.consultora,
      inicioVigencia: dia(v.inicio_vigencia),
      fimVigencia: dia(v.fim_vigencia),
      plano: v.plano,
      frequencia: Number(v.frequencia) || 0,
      fechou: Boolean(v.fechou_plano),
      planoFechado: v.plano_fechado,
      dataContrato: v.data_contrato ? dia(v.data_contrato) : null,
      lancadoPor: v.lancado_por,
      situacaoAtual: v.situacao_atual,
    })),
    anotacoes: anotacoes.map((a) => ({
      id: Number(a.id),
      chave: a.chave,
      texto: a.texto,
      autor: a.autor,
      em: momento(a.criado_em),
    })),
    exclusoes: exclusoes.map((e) => ({
      chave: e.chave,
      justificativa: e.justificativa,
      autor: e.autor,
      em: momento(e.criado_em),
    })),
    pendencias: pendencias.map((p) => ({
      id: p.id,
      autor: p.autor,
      nota: p.nota,
      em: momento(p.criado_em),
    })),
    atualizadoEm: atualizacao[0]?.ultima ? momento(atualizacao[0].ultima) : null,
  };
}
