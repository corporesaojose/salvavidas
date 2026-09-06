import type { RowDataPacket } from "mysql2";
import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { tokenSyncConfere } from "@/lib/gestao/auth";
import { garantirSchema } from "@/lib/gestao/schema";

export const dynamic = "force-dynamic";

// Quem alimenta esta rota é o workflow do n8n. Ele manda só o que ainda muda (ver
// /api/gestao/sync/plano), então o payload é parcial por natureza: campo ausente
// significa "não fui buscar", nunca "apagou". O UPDATE abaixo preserva o que já existe.
interface VoucherEntrada {
  matricula?: string;
  nome?: string;
  fotoUrl?: string | null;
  treinadorWeb?: string | null;
  coordenador?: string | null;
  consultora?: string | null;
  dataLancamento?: string | null;
  codigoPessoa?: number | string | null;
  inicioVigencia?: string;
  fimVigencia?: string;
  plano?: string;
  frequencia?: number | string;
  fechouPlano?: string | boolean;
  planoFechado?: string | null;
  dataContrato?: string | null;
  lancadoPor?: string | null;
  situacaoAtual?: string | null;
  primeiroAcesso?: string | null;
  ultimoAcesso?: string | null;
}

function tokenConfere(request: NextRequest) {
  return tokenSyncConfere(request.headers.get("x-sync-token") || "");
}

function data(valor: unknown) {
  const texto = String(valor || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

// Diagnóstico: o que o processo que responde agora enxerga no banco. Serve para
// separar "não gravou" de "gravou e a página está servindo resposta velha".
export async function GET(request: NextRequest) {
  if (!tokenConfere(request)) {
    return NextResponse.json({ ok: false, erro: "Token inválido." }, { status: 401 });
  }

  await garantirSchema();
  const pool = getDbPool();

  const [totais] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total, MIN(inicio_vigencia) AS primeiro,
            MAX(inicio_vigencia) AS ultimo, MAX(atualizado_em) AS atualizado
     FROM freepass_vouchers`
  );
  const [porPlano] = await pool.query<RowDataPacket[]>(
    `SELECT plano, COUNT(*) AS total FROM freepass_vouchers GROUP BY plano`
  );
  const [registros] = await pool.query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM freepass_anotacoes) AS anotacoes,
       (SELECT COUNT(*) FROM freepass_exclusoes) AS exclusoes,
       (SELECT COUNT(*) FROM freepass_pendencias) AS pendencias`
  );

  return NextResponse.json({
    ok: true,
    banco: process.env.DB_NAME || null,
    vouchers: totais[0],
    porPlano,
    registros: registros[0],
    agora: new Date().toISOString(),
  });
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
         data_lancamento, codigo_pessoa, inicio_vigencia, fim_vigencia, plano, frequencia,
         fechou_plano, plano_fechado, data_contrato, lancado_por, situacao_atual,
         primeiro_acesso, ultimo_acesso)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         nome = COALESCE(NULLIF(VALUES(nome), ''), nome),
         foto_url = COALESCE(VALUES(foto_url), foto_url),
         treinador_web = COALESCE(VALUES(treinador_web), treinador_web),
         coordenador = COALESCE(VALUES(coordenador), coordenador),
         consultora = COALESCE(VALUES(consultora), consultora),
         data_lancamento = COALESCE(VALUES(data_lancamento), data_lancamento),
         codigo_pessoa = COALESCE(VALUES(codigo_pessoa), codigo_pessoa),
         fim_vigencia = VALUES(fim_vigencia),
         plano = COALESCE(NULLIF(VALUES(plano), ''), plano),
         frequencia = GREATEST(VALUES(frequencia), frequencia),
         fechou_plano = GREATEST(VALUES(fechou_plano), fechou_plano),
         plano_fechado = COALESCE(VALUES(plano_fechado), plano_fechado),
         data_contrato = COALESCE(VALUES(data_contrato), data_contrato),
         lancado_por = COALESCE(VALUES(lancado_por), lancado_por),
         situacao_atual = COALESCE(VALUES(situacao_atual), situacao_atual),
         primeiro_acesso = COALESCE(VALUES(primeiro_acesso), primeiro_acesso),
         ultimo_acesso = COALESCE(VALUES(ultimo_acesso), ultimo_acesso)`,
      [
        chave,
        matricula,
        String(v.nome || "").slice(0, 160),
        v.fotoUrl || null,
        v.treinadorWeb || null,
        v.coordenador || null,
        v.consultora || null,
        data(v.dataLancamento),
        Number(v.codigoPessoa) || null,
        inicio,
        fim,
        String(v.plano || "").slice(0, 40),
        Number(v.frequencia) || 0,
        fechou,
        v.planoFechado || null,
        data(v.dataContrato),
        v.lancadoPor || null,
        v.situacaoAtual || null,
        data(v.primeiroAcesso),
        data(v.ultimoAcesso),
      ]
    );
    gravados++;
  }

  return NextResponse.json({ ok: true, gravados, ignorados });
}
