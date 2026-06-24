"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Analisando seus hábitos...",
  "Calculando seu nível de prontidão...",
  "Montando seu perfil de saúde...",
];

export default function CalculatingScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => Math.min(s + 1, MESSAGES.length - 1));
    }, 700);
    const t = setTimeout(onDone, 2400);
    return () => {
      clearInterval(interval);
      clearTimeout(t);
    };
  }, [onDone]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center"
      style={{
        background:
          "radial-gradient(circle at top right, rgba(214,224,77,0.12), transparent 55%), #1a1a1a",
      }}
    >
      <div className="flex flex-col items-center gap-6">
        <div
          className="w-16 h-16 rounded-full border-4 border-lime-400 border-t-transparent animate-spin"
          aria-hidden
        />
        <p className="text-base font-semibold text-white normal-case">{MESSAGES[step]}</p>
      </div>
    </div>
  );
}
