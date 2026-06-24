"use client";

import { ETAPAS, TOTAL_ETAPAS } from "@/lib/missao/questions";

export default function ProgressBar({ etapaAtual }: { etapaAtual: number }) {
  const etapa = ETAPAS[etapaAtual - 1];
  return (
    <div className="w-full max-w-md mx-auto mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="eyebrow">
          Etapa {etapaAtual} de {TOTAL_ETAPAS}
        </span>
        <span className="text-xs text-[#faf8f0]/50">{etapa?.label}</span>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${(etapaAtual / TOTAL_ETAPAS) * 100}%` }}
        />
      </div>
      {etapa && (
        <p className="mt-3 text-sm text-[#faf8f0]/70 font-medium">{etapa.motivacional}</p>
      )}
    </div>
  );
}
