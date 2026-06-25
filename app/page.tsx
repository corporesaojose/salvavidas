"use client";

import { useEffect, useState } from "react";
import type { BlockType, FormState, MissaoResult, Step } from "@/lib/missao/types";
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
  identificacao: { nomeCompleto: "", idade: "", bairro: "", nomeIndicador: "" },
  historicoTreino: {
    historico: null,
    oQuePraticava: "",
    qualAtividade: "",
    objetivos: [],
    outroObjetivo: "",
    diasSemana: null,
    horarioPreferencia: null,
  },
  habitos: { stress: null, sono: null, alimentacao: null, agua: null, energia: null, horasSentado: null },
  saude: {
    problemaSaude: { tem: null, descricao: "" },
    doresLesoes: { tem: null, descricao: "" },
    cirurgiaRecente: { tem: null, descricao: "" },
    historicoFamiliar: { tem: null, descricao: "" },
  },
  motivacao: {
    porQueAgora: "",
    nivelMotivacao: 5,
    desafios: [],
    outroDesafio: "",
    desejosFuturos: [],
    outroDesejoFuturo: "",
  },
};

export default function MissaoPage() {
  const [step, setStep] = useState<Step>({ type: "welcome" });
  const [formState, setFormState] = useState<FormState>(INITIAL_STATE);
  const [result, setResult] = useState<MissaoResult | null>(null);
  const [telefone, setTelefone] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTelefone(params.get("telefone") || "");
  }, []);

  function goTo(type: BlockType) {
    setStep({ type });
  }

  function handleCalculatingDone() {
    const computed = calculateResult(formState);
    setResult(computed);
    goTo("result");

    fetch("/api/leads/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formState, result: computed, telefone }),
    }).catch((err) => console.error("Erro ao salvar lead:", err));
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

      {step.type === "calculating" && <CalculatingScreen onDone={handleCalculatingDone} />}

      {step.type === "result" && result && (
        <ResultScreen result={result} firstName={firstName} />
      )}
    </>
  );
}
