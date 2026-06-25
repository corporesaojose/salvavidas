"use client";

import { useState } from "react";
import type { MotivacaoData } from "@/lib/missao/types";
import { DESAFIOS, DESEJOS_FUTUROS } from "@/lib/missao/questions";
import StepShell from "./StepShell";
import QuestionHeader from "./QuestionHeader";
import BackButton from "./BackButton";
import OptionButton from "./OptionButton";
import { useStepTransition } from "./useStepTransition";

const inputClass =
  "w-full rounded-card bg-[#232320] border border-[#faf8f0]/15 px-4 py-3.5 text-white placeholder:text-[#faf8f0]/30 outline-none focus:border-lime-400 transition-colors normal-case font-normal text-base";

const MOTIVACAO_EMOJI = ["😴", "😴", "😕", "😕", "🙂", "🙂", "💪", "💪", "🔥", "🔥", "🚀"];

const TOTAL_STEPS = 4;

export default function Block5Motivacao({
  data,
  onChange,
  onNext,
}: {
  data: MotivacaoData;
  onChange: (data: MotivacaoData) => void;
  onNext: () => void;
}) {
  const [subStep, setSubStep] = useState(0);
  const [touched, setTouched] = useState(false);
  const visible = useStepTransition(subStep);
  const counter = `${subStep + 1}/${TOTAL_STEPS}`;

  function handleContinue() {
    if (subStep === 0) {
      setTouched(true);
      if (!data.porQueAgora.trim()) return;
      setSubStep(1);
      setTouched(false);
      return;
    }
    if (subStep === 1) {
      setSubStep(2);
      return;
    }
    if (subStep === 2) {
      setTouched(true);
      if (data.desafios.length === 0) return;
      setSubStep(3);
      setTouched(false);
      return;
    }
    setTouched(true);
    if (data.desejosFuturos.length === 0) return;
    onNext();
  }

  return (
    <StepShell etapaAtual={5}>
      {subStep > 0 && (
        <BackButton
          onClick={() => {
            setSubStep((s) => s - 1);
            setTouched(false);
          }}
        />
      )}
      <div className="card p-6 flex flex-col gap-6">
        {subStep === 0 && (
          <>
            <QuestionHeader
              icon="✨"
              blockLabel="Motivação"
              counter={counter}
              title="O que te fez decidir entrar nessa missão agora?"
              visible={visible}
            />
            <div
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(10px)",
                transition: "opacity 0.35s ease 0.12s, transform 0.35s ease 0.12s",
              }}
            >
              <input
                className={inputClass}
                value={data.porQueAgora}
                autoFocus
                onChange={(e) => onChange({ ...data, porQueAgora: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                placeholder="Conte com suas palavras"
              />
              {touched && !data.porQueAgora.trim() && (
                <p className="text-xs text-[#cc4b3c] mt-2">Preencha esse campo para continuar.</p>
              )}
            </div>
          </>
        )}

        {subStep === 1 && (
          <>
            <QuestionHeader
              icon="🔥"
              blockLabel="Motivação"
              counter={counter}
              title="Quão motivado(a) você está para sua missão de saúde?"
              subtext="De 0 a 10"
              visible={visible}
            />
            <div
              className="flex flex-col items-center gap-4"
              style={{ opacity: visible ? 1 : 0, transition: "opacity 0.4s ease 0.12s" }}
            >
              <span className="text-5xl">{MOTIVACAO_EMOJI[data.nivelMotivacao]}</span>
              <div className="flex items-center gap-4 w-full">
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={data.nivelMotivacao}
                  onChange={(e) => onChange({ ...data, nivelMotivacao: Number(e.target.value) })}
                  className="w-full accent-lime-400"
                />
                <span className="text-2xl font-display text-lime-400 w-12 text-center">
                  {data.nivelMotivacao}
                </span>
              </div>
            </div>
          </>
        )}

        {subStep === 2 && (
          <>
            <QuestionHeader
              icon="🚧"
              blockLabel="Motivação"
              counter={counter}
              title="Qual é o seu maior desafio hoje?"
              subtext="Pode marcar mais de um"
              visible={visible}
            />
            <div className="flex flex-col gap-2">
              {DESAFIOS.map((opt, i) => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  selected={data.desafios.includes(opt.value)}
                  visible={visible}
                  delay={0.12 + i * 0.05}
                  onClick={() => {
                    const next = data.desafios.includes(opt.value)
                      ? data.desafios.filter((v) => v !== opt.value)
                      : [...data.desafios, opt.value];
                    onChange({ ...data, desafios: next });
                  }}
                />
              ))}
            </div>
            {data.desafios.includes("outro") && (
              <input
                className={inputClass}
                value={data.outroDesafio}
                onChange={(e) => onChange({ ...data, outroDesafio: e.target.value })}
                placeholder="Qual outro desafio?"
              />
            )}
            {touched && data.desafios.length === 0 && (
              <p className="text-xs text-[#cc4b3c]">Marque ao menos um desafio para continuar.</p>
            )}
          </>
        )}

        {subStep === 3 && (
          <>
            <QuestionHeader
              icon="🏆"
              blockLabel="Motivação"
              counter={counter}
              title="O que você quer conseguir fazer daqui a 20 ou 30 anos que hoje sente que está difícil ou perdendo?"
              subtext="Pode marcar mais de um"
              visible={visible}
            />
            <div className="flex flex-col gap-2">
              {DESEJOS_FUTUROS.map((opt, i) => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  selected={data.desejosFuturos.includes(opt.value)}
                  visible={visible}
                  delay={0.12 + i * 0.05}
                  onClick={() => {
                    const next = data.desejosFuturos.includes(opt.value)
                      ? data.desejosFuturos.filter((v) => v !== opt.value)
                      : [...data.desejosFuturos, opt.value];
                    onChange({ ...data, desejosFuturos: next });
                  }}
                />
              ))}
            </div>
            {data.desejosFuturos.includes("outro") && (
              <input
                className={inputClass}
                value={data.outroDesejoFuturo}
                onChange={(e) => onChange({ ...data, outroDesejoFuturo: e.target.value })}
                placeholder="O que mais?"
              />
            )}
            {touched && data.desejosFuturos.length === 0 && (
              <p className="text-xs text-[#cc4b3c]">Marque ao menos uma opção para continuar.</p>
            )}
          </>
        )}
      </div>

      <button onClick={handleContinue} className="btn-primary w-full">
        {subStep < 3 ? "Continuar →" : "Concluir minha missão →"}
      </button>
    </StepShell>
  );
}
