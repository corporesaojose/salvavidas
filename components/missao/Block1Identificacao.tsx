"use client";

import { useState } from "react";
import type { IdentificacaoData } from "@/lib/missao/types";
import StepShell from "./StepShell";
import QuestionHeader from "./QuestionHeader";
import BackButton from "./BackButton";
import { useStepTransition } from "./useStepTransition";

const inputClass =
  "w-full rounded-card bg-[#232320] border border-[#faf8f0]/15 px-4 py-3.5 text-white placeholder:text-[#faf8f0]/30 outline-none focus:border-lime-400 transition-colors normal-case font-normal text-base";

const QUESTIONS = [
  { key: "nomeCompleto" as const, icon: "👋", title: "Qual o seu nome completo?", placeholder: "Seu nome completo" },
  { key: "bairro" as const, icon: "📍", title: "Em qual bairro você mora?", placeholder: "Seu bairro" },
  { key: "nomeIndicador" as const, icon: "💚", title: "Quem te convidou para essa missão?", subtext: "Nome e sobrenome de quem te deu o voucher", placeholder: "Nome e sobrenome" },
];

export default function Block1Identificacao({
  data,
  onChange,
  onNext,
}: {
  data: IdentificacaoData;
  onChange: (data: IdentificacaoData) => void;
  onNext: () => void;
}) {
  const [subStep, setSubStep] = useState(0);
  const [touched, setTouched] = useState(false);
  const visible = useStepTransition(subStep);

  const q = QUESTIONS[subStep];
  const value = data[q.key];
  const isValid = value.trim().length > 1;

  function handleNext() {
    setTouched(true);
    if (!isValid) return;
    if (subStep < QUESTIONS.length - 1) {
      setSubStep((s) => s + 1);
      setTouched(false);
    } else {
      onNext();
    }
  }

  return (
    <StepShell etapaAtual={1}>
      {subStep > 0 && (
        <BackButton
          onClick={() => {
            setSubStep((s) => s - 1);
            setTouched(false);
          }}
        />
      )}
      <div className="card p-6 flex flex-col gap-5">
        <QuestionHeader
          icon={q.icon}
          blockLabel="Identificação"
          counter={`${subStep + 1}/${QUESTIONS.length}`}
          title={q.title}
          subtext={q.subtext}
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
            value={value}
            autoFocus
            onChange={(e) => onChange({ ...data, [q.key]: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleNext()}
            placeholder={q.placeholder}
          />
          {touched && !isValid && (
            <p className="text-xs text-[#cc4b3c] mt-2">Preencha esse campo para continuar.</p>
          )}
        </div>
      </div>

      <button onClick={handleNext} disabled={!isValid} className="btn-primary w-full">
        {subStep < QUESTIONS.length - 1 ? "Continuar →" : "Avançar →"}
      </button>
    </StepShell>
  );
}
