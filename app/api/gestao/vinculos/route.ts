import crypto from "crypto";
import type { RowDataPacket } from "mysql2";
import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { garantirSchema } from "@/lib/gestao/schema";
import { rotuloPlano } from "@/lib/gestao/planos";

export const dynamic = "force-dynamic";

/**
 * Vouchers correndo sem vínculo no cadastro da Pacto. Sem treinador web ninguém é dono
 * da experiência; sem orientador (o campo que a casa chama de consultor) o cliente fica
 * sem responsável comercial — e nos dois casos ele some do acompanhamento.
 *
 * A recepção corrige, então a lista vai para o canal dela.
 */
function tokenConfere(request: NextRequest) {
  const esperado = process.env.GESTAO_SYNC_TOKEN || "";
  if (!esperado) return false;
  const recebido = request.headers.get("x-sync-token") || "";
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!tokenConfere(request)) {
    return NextResponse.json({ ok: false, erro: "Token inválido." }, { status: 401 });
  }

  const url = new URL(request.url);
  const repetir = url.searchParams.get("repetir") === "1";
  const marcar = url.searchParams.get("marcar") !== "0";

  await garantirSchema();
  const pool = getDbPool();
  const hoje = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);

  const [linhas] = await pool.query<RowDataPacket[]>(
    `SELECT v.chave, v.matricula, v.nome, v.plano, v.inicio_vigencia, v.fim_vigencia,
            v.treinador_web, v.coordenador
     FROM freepass_vouchers v
     LEFT JOIN freepass_exclusoes e ON e.chave = v.chave
     WHERE e.chave IS NULL
       AND v.inicio_vigencia <= ? AND v.fim_vigencia >= ?
       AND (v.treinador_web IS NULL OR v.treinador_web = ''
            OR v.coordenador IS NULL OR v.coordenador = '')
     ORDER BY v.inicio_vigencia ASC`,
    [hoje, hoje]
  );

  // Já avisados ficam de fora: a recepção não precisa da mesma lista todo dia.
  const [avisados] = await pool.query<RowDataPacket[]>(
    `SELECT chave FROM freepass_alertas WHERE tipo = 'vinculo'`
  );
  const jaAvisados = new Set(avisados.map((a) => a.chave as string));

  const todos = linhas.map((l) => {
    const faltando: string[] = [];
    if (!l.treinador_web) faltando.push("treinador web");
    if (!l.coordenador) faltando.push("orientador");
    return {
      chave: l.chave as string,
      matricula: l.matricula as string,
      nome: l.nome as string,
      plano: rotuloPlano(l.plano as string),
      faltando,
    };
  });

  const itens = repetir ? todos : todos.filter((i) => !jaAvisados.has(i.chave));

  if (marcar && itens.length) {
    for (const item of itens) {
      await pool.query(
        `INSERT IGNORE INTO freepass_alertas (chave, tipo, destinatario) VALUES (?, 'vinculo', 'recepcao')`,
        [item.chave]
      );
    }
  }

  return NextResponse.json({ ok: true, itens, total: itens.length, emAberto: todos.length });
}
