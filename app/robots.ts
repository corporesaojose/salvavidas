import type { MetadataRoute } from "next";

const AREAS_INTERNAS = ["/gestao", "/gestao/", "/api/"];

// Rastreadores de IA que publicam user-agent próprio. A landing continua liberada
// para todos; o que fica fora é a área interna.
const ROBOS_DE_IA = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "Bytespider",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: AREAS_INTERNAS },
      { userAgent: ROBOS_DE_IA, disallow: AREAS_INTERNAS },
    ],
    host: "https://salvavidas.corporetraininggym.com.br",
  };
}
