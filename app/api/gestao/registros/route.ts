import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { sessaoAtual } from "@/lib/gestao/auth";
import { garantirSchema } from "@/lib/gestao/schema";

export const dynamic = "force-dynamic";

// Tudo que a equipe registra passa por aqui: anotação, exclusão (com justificativa),
// restauração e o checklist de pendências. O autor vem sempre da sessão — o cliente
// não escolhe em nome de quem grava.
export async function POST(request: NextRequest) {
  const sessao = sessaoAtual();
  if (!sessao) {
    return NextResponse.json({ ok: false, erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  }

  let corpo: {
    acao?: string;
    chave?: string;
    texto?: string;
    justificativa?: string;
    id?: string;
    nota?: string;
  };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "Requisição inválida." }, { status: 400 });
  }

  await garantirSchema();
  const pool = getDbPool();
  const autor = sessao.nome;
  const chave = String(corpo.chave || "").slice(0, 64);

  switch (corpo.acao) {
    case "anotar": {
      const texto = String(corpo.texto || "").trim();
      if (!chave || !texto) {
        return NextResponse.json({ ok: false, erro: "Escreva a anotação." }, { status: 400 });
      }
      await pool.query(
        "INSERT INTO freepass_anotacoes (chave, texto, autor) VALUES (?, ?, ?)",
        [chave, texto.slice(0, 4000), autor]
      );
      return NextResponse.json({ ok: true });
    }

    case "excluir": {
      const justificativa = String(corpo.justificativa || "").trim();
      if (!chave || justificativa.length < 5) {
        return NextResponse.json(
          { ok: false, erro: "A justificativa é obrigatória." },
          { status: 400 }
        );
      }
      await pool.query(
        `INSERT INTO freepass_exclusoes (chave, justificativa, autor)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE justificativa = VALUES(justificativa), autor = VALUES(autor)`,
        [chave, justificativa.slice(0, 2000), autor]
      );
      return NextResponse.json({ ok: true });
    }

    case "restaurar": {
      if (!chave) return NextResponse.json({ ok: false, erro: "Lançamento não informado." }, { status: 400 });
      await pool.query("DELETE FROM freepass_exclusoes WHERE chave = ?", [chave]);
      return NextResponse.json({ ok: true });
    }

    case "resolver": {
      const id = String(corpo.id || "").slice(0, 48);
      if (!id) return NextResponse.json({ ok: false, erro: "Pendência não informada." }, { status: 400 });
      await pool.query(
        `INSERT INTO freepass_pendencias (id, autor, nota)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE autor = VALUES(autor), nota = VALUES(nota)`,
        [id, autor, String(corpo.nota || "").slice(0, 1000) || null]
      );
      return NextResponse.json({ ok: true });
    }

    case "reabrir": {
      const id = String(corpo.id || "").slice(0, 48);
      if (!id) return NextResponse.json({ ok: false, erro: "Pendência não informada." }, { status: 400 });
      await pool.query("DELETE FROM freepass_pendencias WHERE id = ?", [id]);
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ ok: false, erro: "Ação desconhecida." }, { status: 400 });
  }
}
