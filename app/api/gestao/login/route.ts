import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE_SESSAO,
  criarToken,
  opcoesCookie,
  senhaConfere,
  senhaConfigurada,
} from "@/lib/gestao/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!senhaConfigurada()) {
    return NextResponse.json(
      { ok: false, erro: "O acesso ainda não foi configurado no servidor (GESTAO_SENHA e GESTAO_SEGREDO)." },
      { status: 503 }
    );
  }

  let corpo: { senha?: string; nome?: string };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "Requisição inválida." }, { status: 400 });
  }

  const nome = String(corpo.nome || "").trim().slice(0, 80);
  if (!nome) {
    return NextResponse.json({ ok: false, erro: "Diga seu nome — ele assina o que você registrar." }, { status: 400 });
  }
  if (!senhaConfere(String(corpo.senha || ""))) {
    return NextResponse.json({ ok: false, erro: "Senha incorreta." }, { status: 401 });
  }

  const resposta = NextResponse.json({ ok: true, nome });
  resposta.cookies.set(COOKIE_SESSAO, criarToken(nome), opcoesCookie());
  return resposta;
}

export async function DELETE() {
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(COOKIE_SESSAO, "", { ...opcoesCookie(), maxAge: 0 });
  return resposta;
}
