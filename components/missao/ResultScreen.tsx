"use client";

import { useEffect, useState } from "react";
import type { MissaoResult } from "@/lib/missao/types";
import Logo from "./Logo";
import RadarChart from "./RadarChart";

const NIVEL_COLOR: Record<MissaoResult["nivelProntidao"], string> = {
  alto: "#d6e04d",
  medio: "#e0a93b",
  baixo: "#cc4b3c",
};

export default function ResultScreen({
  result,
  firstName,
}: {
  result: MissaoResult;
  firstName: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const color = NIVEL_COLOR[result.nivelProntidao];

  return (
    <div
      className="min-h-screen flex flex-col items-center px-6 py-12"
      style={{
        background:
          "radial-gradient(circle at top right, rgba(214,224,77,0.12), transparent 55%), #1a1a1a",
      }}
    >
      <div
        className="w-full max-w-md flex flex-col items-center gap-6 text-center"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}
      >
        <Logo variant="dark" />

        <div>
          <span className="eyebrow">Missão cumprida{firstName ? `, ${firstName}` : ""}</span>
          <h1 className="text-white text-2xl mt-2">Seu Perfil de Saúde</h1>
        </div>

        <RadarChart habitos={result.habitos} />

        <div
          className="w-full rounded-card px-6 py-5"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${color}40` }}
        >
          <span className="eyebrow" style={{ color }}>
            Nível de Prontidão
          </span>
          <p className="text-xl font-display text-white mt-2 normal-case" style={{ letterSpacing: 0 }}>
            {result.nivelLabel}
          </p>
          <p className="text-sm text-[#faf8f0]/70 mt-2 normal-case">{result.mensagem}</p>
        </div>

        <div className="w-full grid grid-cols-2 gap-3">
          {result.habitos.map((h) => (
            <div
              key={h.key}
              className="card flex items-center gap-2 px-4 py-3 text-left"
            >
              <span className="text-xl">{h.emoji}</span>
              <div>
                <p className="text-xs text-[#faf8f0]/60 normal-case">{h.label}</p>
                <p className="text-sm font-bold text-white normal-case">{h.score}</p>
              </div>
            </div>
          ))}
        </div>

        <div
          className="w-full rounded-card px-6 py-5"
          style={{ background: "#d6e04d" }}
        >
          <p className="text-sm font-semibold text-[#1a1a1a] normal-case leading-relaxed">
            Sua experiência de 15 dias na Corpore está garantida. Nossa equipe vai entrar em
            contato em breve para agendar seu primeiro treino. Fique de olho no WhatsApp!
          </p>
        </div>
      </div>
    </div>
  );
}
