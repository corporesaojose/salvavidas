"use client";

import { useState } from "react";
import type { SaudeData, SaudeItem } from "@/lib/missao/types";
import StepShell from "./StepShell";
import QuestionHeader from "./QuestionHeader";
import BackButton from "./BackButton";
import OptionButton from "./OptionButton";
import { useStepTransition } from "./useStepTransition";

const inputClass =
  "w-full rounded-card bg-[#232320] border border-[#faf8f0]/15 px-4 py-3.5 text-white placeholder:text-[#faf8f0]/30 outline-none focus:border-lime-400 transition-colors normal-case font-normal text-base";

const QUESTIONS = [
  { key: "problemaSaude" as const, icon: "🩺", title: "Tem algum problema de saúde?", placeholder: "Qual?" },
  { key: "doresLesoes" as const, icon: "🦴", title: "Tem ou já teve alguma lesão?", placeholder: "Qual?" },
  { key: "cirurgiaRecente" as const, icon: "🏥", title: "Fez alguma cirurgia recente?", placeholder: "Qual?" },
  {
    key: "historicoFamiliar" as const,
    icon: "🧬",
    title:
      "Algum familiar próximo (pai, mãe ou irmãos) teve infarto, AVC, diabetes ou Alzheimer antes dos 60 anos?",
    placeholder: "Qual?",
  },
];

export default function Block4Saude({
  data,
  onChange,
  onNext,
}: {
  data: SaudeData;
  onChange: (data: SaudeData) => void;
  onNext: () => void;
}) {
  const [subStep, setSubStep] = useState(0);
  const visible = useStepTransition(subStep);

  const q = QUESTIONS[subStep];
  const value = data[q.key];
  const counter = `${subStep + 1}/${QUESTIONS.length}`;

  function setValue(v: SaudeItem) {
    onChange({ ...data, [q.key]: v });
  }

  function advance() {
    if (subStep < QUESTIONS.length - 1) {
      setSubStep((s) => s + 1);
    } else {
      onNext();
    }
  }

  function handleNao() {
    setValue({ tem: false, descricao: "" });
    setTimeout(advance, 280);
  }

  const isValid = value.tem === false || (value.tem === true && value.descricao.trim().length > 0);

  return (
    <StepShell etapaAtual={4}>
      {subStep > 0 && <BackButton onClick={() => setSubStep((s) => s - 1)} />}
      <div className="card p-6 flex flex-col gap-5">
        <QuestionHeader icon={q.icon} blockLabel="Saúde" counter={counter} title={q.title} visible={visible} />
        <div className="flex gap-2">
          <OptionButton label="Não" selected={value.tem === false} visible={visible} delay={0.12} onClick={handleNao} />
          <OptionButton
            label="Sim"
            selected={value.tem === true}
            visible={visible}
            delay={0.18}
            onClick={() => setValue({ tem: true, descricao: value.descricao })}
          />
        </div>
        {value.tem === true && (
          <input
            className={inputClass}
            value={value.descricao}
            autoFocus
            onChange={(e) => setValue({ tem: true, descricao: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && isValid && advance()}
            placeholder={q.placeholder}
          />
        )}
      </div>

      {value.tem === true && (
        <button onClick={advance} disabled={!isValid} className="btn-primary w-full">
          Continuar →
        </button>
      )}
    </StepShell>
  );
}
