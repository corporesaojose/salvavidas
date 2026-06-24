"use client";

import { useState } from "react";
import type { BlockType, FormState, Step } from "@/lib/missao/types";
import { FEEDBACK_ETAPAS } from "@/lib/missao/questions";
import { calculateResult } from "@/lib/missao/scoring";

import WelcomeScreen from "@/components/missao/WelcomeScreen";
import Block1Identificacao from "@/components/missao/Block1Identificacao";
import Block2HistoricoTreino from "@/components/missao/Block2HistoricoTreino";
import Block3Habitos from "@/components/missao/Block3Habitos";
import Block4Saude from "@/components/missao/Block4Saude";
import Block5Motivacao from "@/components/missao/Block5Motivacao";
import StepFeedback from "@/components/missao/StepFeedback";
import CalculatingScreen from "@/components/missao/CalculatingScreen";
import ResultScreen from "@/components/missao/ResultScreen";

const INITIAL_STATE: FormState = {
  identificacao: { nomeCompleto: "", bairro: "", nomeIndicador: "" },
  historicoTreino: {
    historico: null,
    oQuePraticava: "",
    ondeTreina: null,
    qualAtividade: "",
    objetivos: [],
    outroObjetivo: "",
    diasSemana: null,
    horarioPreferencia: null,
  },
  habitos: { stress: null, sono: null, alimentacao: null, agua: null },
  saude: {
    problemaSaude: { tem: null, descricao: "" },
    doresLesoes: { tem: null, descricao: "" },
    cirurgiaRecente: { tem: null, descricao: "" },
  },
  motivacao: { nivelMotivacao: 5, desafios: [], outroDesafio: "" },
};

export default function MissaoPage() {
  const [step, setStep] = useState<Step>({ type: "welcome" });
  const [formState, setFormState] = useState<FormState>(INITIAL_STATE);

  function goTo(type: BlockType) {
    setStep({ type });
  }

  const firstName = formState.identificacao.nomeCompleto.trim().split(" ")[0] || "";

  return (
    <>
      {step.type === "welcome" && <WelcomeScreen onStart={() => goTo("block1")} />}

      {step.type === "block1" && (
        <Block1Identificacao
          data={formState.identificacao}
          onChange={(identificacao) => setFormState((fs) => ({ ...fs, identificacao }))}
          onNext={() => goTo("block1_feedback")}
        />
      )}
      {step.type === "block1_feedback" && (
        <StepFeedback message={FEEDBACK_ETAPAS[1]} onNext={() => goTo("block2")} />
      )}

      {step.type === "block2" && (
        <Block2HistoricoTreino
          data={formState.historicoTreino}
          onChange={(historicoTreino) => setFormState((fs) => ({ ...fs, historicoTreino }))}
          onNext={() => goTo("block2_feedback")}
        />
      )}
      {step.type === "block2_feedback" && (
        <StepFeedback message={FEEDBACK_ETAPAS[2]} onNext={() => goTo("block3")} />
      )}

      {step.type === "block3" && (
        <Block3Habitos
          data={formState.habitos}
          onChange={(habitos) => setFormState((fs) => ({ ...fs, habitos }))}
          onNext={() => goTo("block3_feedback")}
        />
      )}
      {step.type === "block3_feedback" && (
        <StepFeedback message={FEEDBACK_ETAPAS[3]} onNext={() => goTo("block4")} />
      )}

      {step.type === "block4" && (
        <Block4Saude
          data={formState.saude}
          onChange={(saude) => setFormState((fs) => ({ ...fs, saude }))}
          onNext={() => goTo("block4_feedback")}
        />
      )}
      {step.type === "block4_feedback" && (
        <StepFeedback message={FEEDBACK_ETAPAS[4]} onNext={() => goTo("block5")} />
      )}

      {step.type === "block5" && (
        <Block5Motivacao
          data={formState.motivacao}
          onChange={(motivacao) => setFormState((fs) => ({ ...fs, motivacao }))}
          onNext={() => goTo("calculating")}
        />
      )}

      {step.type === "calculating" && <CalculatingScreen onDone={() => goTo("result")} />}

      {step.type === "result" && (
        <ResultScreen result={calculateResult(formState)} firstName={firstName} />
      )}
    </>
  );
}
