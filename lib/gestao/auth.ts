import crypto from "crypto";
import { cookies } from "next/headers";

// Acesso do /gestao: uma senha só, compartilhada pela equipe. Quem entra também diz o
// nome — é ele que assina anotações, exclusões e pendências resolvidas.
export const COOKIE_SESSAO = "gestao_sessao";
const DIAS_VALIDADE = 30;

function segredo() {
  // Sem segredo configurado o cookie não pode ser assinado, e o login é recusado —
  // melhor barrar do que assinar com um valor previsível.
  return process.env.GESTAO_SEGREDO || "";
}

export function senhaConfigurada() {
  return Boolean(process.env.GESTAO_SENHA && segredo());
}

export function senhaConfere(candidata: string) {
  const esperada = process.env.GESTAO_SENHA || "";
  if (!esperada || !candidata) return false;
  const a = Buffer.from(candidata);
  const b = Buffer.from(esperada);
  // Comprimentos diferentes vazam informação em comparação normal; iguala antes.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function assinar(payload: string) {
  return crypto.createHmac("sha256", segredo()).update(payload).digest("base64url");
}

export function criarToken(nome: string) {
  const expira = Date.now() + DIAS_VALIDADE * 86400000;
  const payload = Buffer.from(JSON.stringify({ nome, expira })).toString("base64url");
  return `${payload}.${assinar(payload)}`;
}

export function lerToken(token: string | undefined): { nome: string } | null {
  if (!token || !segredo()) return null;
  const [payload, assinatura] = token.split(".");
  if (!payload || !assinatura) return null;

  const esperada = assinar(payload);
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const dados = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!dados.expira || dados.expira < Date.now()) return null;
    return { nome: String(dados.nome || "").slice(0, 80) };
  } catch {
    return null;
  }
}

export function sessaoAtual() {
  return lerToken(cookies().get(COOKIE_SESSAO)?.value);
}

export function opcoesCookie() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: true,
    path: "/",
    maxAge: DIAS_VALIDADE * 86400,
  };
}
