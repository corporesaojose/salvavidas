"use client";

import { useState } from "react";
import type { HistoricoTreinoData } from "@/lib/missao/types";
import {
  DIAS_SEMANA,
  HORARIOS,
  OBJETIVOS,
} from "@/lib/missao/questions";
import StepShell from "./StepShell";
import QuestionHeader from "./QuestionHeader";
import BackButton from "./BackButton";
import OptionButton from "./OptionButton";
import { useStepTransition } from "./useStepTransition";

const inputClass =
  "w-full rounded-card bg-[#232320] border border-[#faf8f0]/15 px-4 py-3.5 text-white placeholder:text-[#faf8f0]/30 outline-none focus:border-lime-400 transition-colors normal-case font-normal text-base";

type StepId =
  | "historico"
  | "oQuePraticava"
  | "qualAtividade"
  | "objetivos"
  | "diasSemana"
  | "horarioPreferencia";

function getSteps(data: HistoricoTreinoData): StepId[] {
  const steps: StepId[] = ["historico"];
  if (data.historico === "parei") steps.push("oQuePraticava");
  if (data.historico === "atual") steps.push("qualAtividade");
  steps.push("objetivos", "diasSemana", "horarioPreferencia");
  return steps;
}

export default function Block2HistoricoTreino({
  data,
  onChange,
  onNext,
}: {
  data: HistoricoTreinoData;
  onChange: (data: HistoricoTreinoData) => void;
  onNext: () => void;
}) {
  const [subStep, setSubStep] = useState(0);
  const [touched, setTouched] = useState(false);
  const visible = useStepTransition(subStep);

  const steps = getSteps(data);
  const stepId = steps[subStep];

  function advance() {
    setTouched(false);
    if (subStep < steps.length - 1) {
      setSubStep((s) => s + 1);
    } else {
      onNext();
    }
  }

  function goBack() {
    setTouched(false);
    setSubStep((s) => Math.max(0, s - 1));
  }

  function selectAndAdvance<K extends keyof HistoricoTreinoData>(key: K, value: HistoricoTreinoData[K]) {
    onChange({ ...data, [key]: value });
    setTimeout(advance, 280);
  }

  function handleContinue() {
    setTouched(true);
    if (stepId === "oQuePraticava" && !data.oQuePraticava.trim()) return;
    if (stepId === "qualAtividade" && !data.qualAtividade.trim()) return;
    if (stepId === "objetivos" && data.objetivos.length === 0) return;
    advance();
  }

  const counter = `${subStep + 1}/${steps.length}`;

  return (
    <StepShell etapaAtual={2}>
      {subStep > 0 && <BackButton onClick={goBack} />}
      <div className="card p-6 flex flex-col gap-5">
        {stepId === "historico" && (
          <>
            <QuestionHeader
              icon="🏃"
              blockLabel="Histórico de Treino"
              counter={counter}
              title="Já treina ou já treinou em algum período?"
              visible={visible}
            />
            <div className="flex flex-col gap-2">
              {[
                { value: "nunca" as const, label: "Nunca treinei", emoji: "🌱" },
                { value: "parei" as const, label: "Já treinei, mas parei", emoji: "⏸️" },
                { value: "atual" as const, label: "Treino atualmente", emoji: "🔥" },
              ].map((opt, i) => (
                <OptionButton
                  key={opt.value}
                  emoji={opt.emoji}
                  label={opt.label}
                  selected={data.historico === opt.value}
                  visible={visible}
                  delay={0.12 + i * 0.06}
                  onClick={() => selectAndAdvance("historico", opt.value)}
                />
              ))}
            </div>
          </>
        )}

        {stepId === "oQuePraticava" && (
          <>
            <QuestionHeader icon="🕘" blockLabel="Histórico de Treino" counter={counter} title="O que você praticava?" visible={visible} />
            <input
              className={inputClass}
              value={data.oQuePraticava}
              autoFocus
              onChange={(e) => onChange({ ...data, oQuePraticava: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleContinue()}
              placeholder="Ex: musculação, futebol, corrida..."
            />
            {touched && !data.oQuePraticava.trim() && (
              <p className="text-xs text-[#cc4b3c]">Preencha esse campo para continuar.</p>
            )}
          </>
        )}

        {stepId === "qualAtividade" && (
          <>
            <QuestionHeader icon="💪" blockLabel="Histórico de Treino" counter={counter} title="Qual atividade?" visible={visible} />
            <input
              className={inputClass}
              value={data.qualAtividade}
              autoFocus
              onChange={(e) => onChange({ ...data, qualAtividade: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleContinue()}
              placeholder="Ex: musculação, pilates, corrida..."
            />
            {touched && !data.qualAtividade.trim() && (
              <p className="text-xs text-[#cc4b3c]">Preencha esse campo para continuar.</p>
            )}
          </>
        )}

        {stepId === "objetivos" && (
          <>
            <QuestionHeader
              icon="🎯"
              blockLabel="Histórico de Treino"
              counter={counter}
              title="Quais são seus objetivos?"
              subtext="Pode marcar mais de um"
              visible={visible}
            />
            <div className="flex flex-col gap-2">
              {OBJETIVOS.map((opt, i) => (
                <OptionButton
                  key={opt.value}
                  emoji={opt.emoji}
                  label={opt.label}
                  selected={data.objetivos.includes(opt.value)}
                  visible={visible}
                  delay={0.12 + i * 0.06}
                  onClick={() => {
                    const next = data.objetivos.includes(opt.value)
                      ? data.objetivos.filter((v) => v !== opt.value)
                      : [...data.objetivos, opt.value];
                    onChange({ ...data, objetivos: next });
                  }}
                />
              ))}
            </div>
            {data.objetivos.includes("outro") && (
              <input
                className={inputClass}
                value={data.outroObjetivo}
                onChange={(e) => onChange({ ...data, outroObjetivo: e.target.value })}
                placeholder="Qual outro objetivo?"
              />
            )}
            {touched && data.objetivos.length === 0 && (
              <p className="text-xs text-[#cc4b3c]">Marque ao menos um objetivo.</p>
            )}
          </>
        )}

        {stepId === "diasSemana" && (
          <>
            <QuestionHeader icon="📅" blockLabel="Histórico de Treino" counter={counter} title="Quantos dias pretende treinar na semana?" visible={visible} />
            <div className="flex flex-col gap-2">
              {DIAS_SEMANA.map((opt, i) => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  selected={data.diasSemana === opt.value}
                  visible={visible}
                  delay={0.12 + i * 0.06}
                  onClick={() => selectAndAdvance("diasSemana", opt.value)}
                />
              ))}
            </div>
          </>
        )}

        {stepId === "horarioPreferencia" && (
          <>
            <QuestionHeader icon="⏰" blockLabel="Histórico de Treino" counter={counter} title="Qual horário de preferência?" visible={visible} />
            <div className="flex flex-col gap-2">
              {HORARIOS.map((opt, i) => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  selected={data.horarioPreferencia === opt.value}
                  visible={visible}
                  delay={0.12 + i * 0.06}
                  onClick={() => selectAndAdvance("horarioPreferencia", opt.value)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {(stepId === "oQuePraticava" || stepId === "qualAtividade" || stepId === "objetivos") && (
        <button onClick={handleContinue} className="btn-primary w-full">
          Continuar →
        </button>
      )}
    </StepShell>
  );
}
