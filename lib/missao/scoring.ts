import { HABITOS_LIST, NIVEIS_HABITO } from "./questions";
import type { FormState, HabitoScore, MissaoResult, NivelProntidao } from "./types";

function habitoScore(value: string | null): number {
  if (!value) return 40;
  return NIVEIS_HABITO.find((n) => n.value === value)?.score ?? 40;
}

function getNivelProntidao(score: number): { nivel: NivelProntidao; label: string; mensagem: string } {
  if (score >= 70) {
    return {
      nivel: "alto",
      label: "Pronto para decolar",
      mensagem: "Seu corpo está pedindo movimento. A hora é agora.",
    };
  }
  if (score >= 45) {
    return {
      nivel: "medio",
      label: "Missão possível",
      mensagem: "Com o treino certo, você vai se surpreender rápido.",
    };
  }
  return {
    nivel: "baixo",
    label: "Missão necessária",
    mensagem: "É exatamente aqui que a Corpore faz a diferença.",
  };
}

export function calculateResult(state: FormState): MissaoResult {
  const habitos: HabitoScore[] = HABITOS_LIST.map((h) => {
    const value = state.habitos[h.key];
    return {
      key: h.key,
      label: h.label,
      emoji: h.emoji,
      score: habitoScore(value),
      nivel: value ?? "regular",
    };
  });

  const habitosAvg = habitos.reduce((sum, h) => sum + h.score, 0) / habitos.length;
  const motivacaoScore = state.motivacao.nivelMotivacao * 10;

  const desafiosCount = state.motivacao.desafios.length;
  const desafiosScore = Math.max(0, 100 - desafiosCount * 12);

  const scoreProntidao = Math.round(habitosAvg * 0.4 + motivacaoScore * 0.4 + desafiosScore * 0.2);

  const { nivel, label, mensagem } = getNivelProntidao(scoreProntidao);

  return {
    scoreProntidao,
    nivelProntidao: nivel,
    nivelLabel: label,
    mensagem,
    habitos,
  };
}
