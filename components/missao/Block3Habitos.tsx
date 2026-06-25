"use client";

import { useState } from "react";
import type { HabitosData } from "@/lib/missao/types";
import { HABITOS_LIST, HORAS_SENTADO, NIVEIS_HABITO } from "@/lib/missao/questions";
import StepShell from "./StepShell";
import QuestionHeader from "./QuestionHeader";
import BackButton from "./BackButton";
import OptionButton from "./OptionButton";
import { useStepTransition } from "./useStepTransition";

const TOTAL_STEPS = HABITOS_LIST.length + 2;
const ENERGIA_STEP = HABITOS_LIST.length;

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
  const counter = `${subStep + 1}/${TOTAL_STEPS}`;

  function advance() {
    if (subStep < TOTAL_STEPS - 1) {
      setSubStep((s) => s + 1);
    } else {
      onNext();
    }
  }

  function selectAndAdvance<K extends keyof HabitosData>(key: K, value: HabitosData[K]) {
    onChange({ ...data, [key]: value });
    setTimeout(advance, 280);
  }

  if (subStep < HABITOS_LIST.length) {
    const habito = HABITOS_LIST[subStep];
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
                onClick={() => selectAndAdvance(habito.key, nivel.value)}
              />
            ))}
          </div>
        </div>
      </StepShell>
    );
  }

  if (subStep === ENERGIA_STEP) {
    return (
      <StepShell etapaAtual={3}>
        <BackButton onClick={() => setSubStep((s) => s - 1)} />
        <div className="card p-6 flex flex-col gap-5">
          <QuestionHeader
            icon="⚡"
            blockLabel="Hábitos de Vida"
            counter={counter}
            title="Como está seu nível de energia no dia a dia?"
            visible={visible}
          />
          <div className="flex flex-col gap-2">
            {NIVEIS_HABITO.map((nivel, i) => (
              <OptionButton
                key={nivel.value}
                emoji={nivel.emoji}
                label={nivel.label}
                selected={data.energia === nivel.value}
                visible={visible}
                delay={0.12 + i * 0.06}
                onClick={() => selectAndAdvance("energia", nivel.value)}
              />
            ))}
          </div>
        </div>
      </StepShell>
    );
  }

  return (
    <StepShell etapaAtual={3}>
      <BackButton onClick={() => setSubStep((s) => s - 1)} />
      <div className="card p-6 flex flex-col gap-5">
        <QuestionHeader
          icon="🪑"
          blockLabel="Hábitos de Vida"
          counter={counter}
          title="Quantas horas por dia você fica sentado aproximadamente?"
          visible={visible}
        />
        <div className="flex flex-col gap-2">
          {HORAS_SENTADO.map((opt, i) => (
            <OptionButton
              key={opt.value}
              label={opt.label}
              selected={data.horasSentado === opt.value}
              visible={visible}
              delay={0.12 + i * 0.06}
              onClick={() => selectAndAdvance("horasSentado", opt.value)}
            />
          ))}
        </div>
      </div>
    </StepShell>
  );
}
