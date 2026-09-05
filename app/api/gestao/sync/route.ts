import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { garantirSchema } from "@/lib/gestao/schema";

export const dynamic = "force-dynamic";

// Quem alimenta esta rota é o workflow do n8n que varre a Pacto dia a dia. Ele manda
// a janela inteira a cada rodada; aqui é upsert, então reprocessar é seguro.
interface VoucherEntrada {
  matricula?: string;
  nome?: string;
  fotoUrl?: string | null;
  treinadorWeb?: string | null;
  coordenador?: string | null;
  consultora?: string | null;
  inicioVigencia?: string;
  fimVigencia?: string;
  plano?: string;
  frequencia?: number | string;
  fechouPlano?: string | boolean;
  planoFechado?: string | null;
  dataContrato?: string | null;
  lancadoPor?: string | null;
  situacaoAtual?: string | null;
}

function tokenConfere(request: NextRequest) {
  const esperado = process.env.GESTAO_SYNC_TOKEN || "";
  if (!esperado) return false;
  const recebido = request.headers.get("x-sync-token") || "";
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function data(valor: unknown) {
  const texto = String(valor || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

export async function POST(request: NextRequest) {
  if (!tokenConfere(request)) {
    return NextResponse.json({ ok: false, erro: "Token inválido." }, { status: 401 });
  }

  let corpo: { vouchers?: VoucherEntrada[] };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "JSON inválido." }, { status: 400 });
  }

  const vouchers = Array.isArray(corpo.vouchers) ? corpo.vouchers : [];
  if (!vouchers.length) {
    return NextResponse.json({ ok: false, erro: "Nenhum voucher no payload." }, { status: 400 });
  }

  await garantirSchema();
  const pool = getDbPool();

  let gravados = 0;
  const ignorados: string[] = [];

  for (const v of vouchers) {
    const matricula = String(v.matricula || "").trim();
    const inicio = data(v.inicioVigencia);
    const fim = data(v.fimVigencia);
    if (!matricula || !inicio || !fim) {
      ignorados.push(`${matricula || "sem matrícula"} ${v.inicioVigencia || ""}`.trim());
      continue;
    }

    const chave = `${matricula}_${inicio}`;
    const fechou =
      v.fechouPlano === true || String(v.fechouPlano || "").toLowerCase() === "sim" ? 1 : 0;

    await pool.query(
      `INSERT INTO freepass_vouchers
        (chave, matricula, nome, foto_url, treinador_web, coordenador, consultora,
         inicio_vigencia, fim_vigencia, plano, frequencia, fechou_plano, plano_fechado,
         data_contrato, lancado_por, situacao_atual)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         nome = VALUES(nome),
         foto_url = VALUES(foto_url),
         treinador_web = VALUES(treinador_web),
         coordenador = VALUES(coordenador),
         consultora = VALUES(consultora),
         fim_vigencia = VALUES(fim_vigencia),
         plano = VALUES(plano),
         frequencia = VALUES(frequencia),
         fechou_plano = VALUES(fechou_plano),
         plano_fechado = VALUES(plano_fechado),
         data_contrato = VALUES(data_contrato),
         lancado_por = VALUES(lancado_por),
         situacao_atual = VALUES(situacao_atual)`,
      [
        chave,
        matricula,
        String(v.nome || "").slice(0, 160),
        v.fotoUrl || null,
        v.treinadorWeb || null,
        v.coordenador || null,
        v.consultora || null,
        inicio,
        fim,
        String(v.plano || "").slice(0, 40),
        Number(v.frequencia) || 0,
        fechou,
        v.planoFechado || null,
        data(v.dataContrato),
        v.lancadoPor || null,
        v.situacaoAtual || null,
      ]
    );
    gravados++;
  }

  return NextResponse.json({ ok: true, gravados, ignorados });
}
