"use client";

import { useEffect, useState } from "react";
import Logo from "./Logo";

export default function WelcomeScreen({ onStart }: { onStart: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center"
      style={{
        background:
          "radial-gradient(circle at top right, rgba(214,224,77,0.12), transparent 55%), #1a1a1a",
      }}
    >
      <div
        className="w-full max-w-lg flex flex-col items-center gap-8"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}
      >
        <Logo variant="dark" />

        <div className="flex flex-col gap-4">
          <span className="eyebrow">Missão Salva-Vidas</span>
          <h1 className="text-white text-[clamp(1.8rem,6vw,2.6rem)]">
            Sua missão<br />
            <span className="text-lime-400">começa aqui.</span>
          </h1>
          <p className="text-[#faf8f0]/70 leading-relaxed text-base font-normal normal-case">
            Em poucos minutos vamos te conhecer melhor e montar o seu{" "}
            <strong className="text-white">Perfil de Saúde</strong>. No final, sua experiência
            de 15 dias na Corpore já estará garantida.
          </p>
        </div>

        <button onClick={onStart} className="btn-primary w-full">
          Começar minha missão →
        </button>

        <p className="text-xs text-[#faf8f0]/35">
          Leva menos de 3 minutos • 100% gratuito
        </p>
      </div>
    </div>
  );
}
