"use client";

import { useState } from "react";
import type { HabitosData } from "@/lib/missao/types";
import { HABITOS_LIST, NIVEIS_HABITO } from "@/lib/missao/questions";
import StepShell from "./StepShell";
import QuestionHeader from "./QuestionHeader";
import BackButton from "./BackButton";
import OptionButton from "./OptionButton";
import { useStepTransition } from "./useStepTransition";

export default function Block3Habitos({
  data,
  onChange,
  onNext,
}: {
  data: HabitosData;
  onChange: (data: HabitosData) => void;
  onNext: () => void;
}) {
  const [subStep, setSubStep] = useState(0);
  const visible = useStepTransition(subStep);

  const habito = HABITOS_LIST[subStep];
  const counter = `${subStep + 1}/${HABITOS_LIST.length}`;

  function select(value: HabitosData[typeof habito.key]) {
    onChange({ ...data, [habito.key]: value });
    setTimeout(() => {
      if (subStep < HABITOS_LIST.length - 1) {
        setSubStep((s) => s + 1);
      } else {
        onNext();
      }
    }, 280);
  }

  return (
    <StepShell etapaAtual={3}>
      {subStep > 0 && <BackButton onClick={() => setSubStep((s) => s - 1)} />}
      <div className="card p-6 flex flex-col gap-5">
        <QuestionHeader
          icon={habito.emoji}
          blockLabel="Hábitos de Vida"
          counter={counter}
          title={`Como estão seus hábitos de ${habito.label}?`}
          visible={visible}
        />
        <div className="flex flex-col gap-2">
          {NIVEIS_HABITO.map((nivel, i) => (
            <OptionButton
              key={nivel.value}
              emoji={nivel.emoji}
              label={nivel.label}
              selected={data[habito.key] === nivel.value}
              visible={visible}
              delay={0.12 + i * 0.06}
              onClick={() => select(nivel.value)}
            />
          ))}
        </div>
      </div>
    </StepShell>
  );
}
