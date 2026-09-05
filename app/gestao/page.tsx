import type { Metadata } from "next";
import { sessaoAtual, senhaConfigurada } from "@/lib/gestao/auth";
import { carregarDados } from "@/lib/gestao/dados";
import Login from "./Login";
import Relatorio from "./Relatorio";
import "./gestao.css";

// A rota lê banco e sessão a cada acesso: nada de cache.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gestão de Free Pass | Corpore",
  // Página interna: fora de buscador, de cache e de resumo de IA.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default async function GestaoPage() {
  if (!senhaConfigurada()) {
    return (
      <main className="gestao gestao-aviso">
        <div>
          <h1>Acesso ainda não configurado</h1>
          <p>
            Falta definir <code>GESTAO_SENHA</code> e <code>GESTAO_SEGREDO</code> nas variáveis de
            ambiente do servidor. Enquanto isso, ninguém consegue entrar.
          </p>
        </div>
      </main>
    );
  }

  const sessao = sessaoAtual();
  if (!sessao) return <Login />;

  const dados = await carregarDados();
  return <Relatorio dados={dados} usuario={sessao.nome} />;
}
