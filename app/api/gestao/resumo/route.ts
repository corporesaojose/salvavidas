import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { montarResumo } from "@/lib/gestao/resumo";

export const dynamic = "force-dynamic";

// Retrato agregado para a leitura semanal dos sócios. O n8n busca aqui e posta no canal.
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

  const resumo = await montarResumo();
  return NextResponse.json({ ok: true, resumo });
}
