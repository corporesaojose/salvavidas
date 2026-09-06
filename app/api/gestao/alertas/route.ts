import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { jaAlertados, montarAlertasDoDia, registrarEnvio } from "@/lib/gestao/alertas";
import { taxasPorFaixa } from "@/lib/gestao/referencias";

export const dynamic = "force-dynamic";

// O n8n chama esta rota uma vez por dia, monta a DM de cada pessoa e envia. A regra de
// quem merece alerta fica aqui, versionada com o resto — o n8n só entrega.
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

  // ?repetir=1 devolve tudo, inclusive o que já foi avisado (útil para testar sem
  // esperar o próximo caso aparecer). ?marcar=0 monta sem registrar o envio.
  const url = new URL(request.url);
  const repetir = url.searchParams.get("repetir") === "1";
  const marcar = url.searchParams.get("marcar") !== "0";

  const todos = await montarAlertasDoDia();

  let cards = todos;
  if (!repetir) {
    const enviados = await jaAlertados();
    cards = todos
      .map((card) => ({
        ...card,
        itens: card.itens.filter(
          (i) => !enviados.has(`${i.chave}|${i.tipo}|${card.destinatario}`)
        ),
      }))
      .filter((card) => card.itens.length > 0);
  }

  if (marcar && cards.length) await registrarEnvio(cards);

  // As reguas vao junto: da para conferir de onde saiu cada porcentagem do card.
  const hoje = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
  const taxas = await taxasPorFaixa(hoje);

  return NextResponse.json({
    ok: true,
    taxas,
    cards,
    totalPessoas: cards.length,
    totalItens: cards.reduce((soma, c) => soma + c.itens.length, 0),
  });
}
