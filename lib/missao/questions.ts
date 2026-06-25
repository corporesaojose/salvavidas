import type {
  DesejoFuturo,
  DiasSemana,
  Desafio,
  HorarioPreferencia,
  HorasSentado,
  NivelHabito,
  Objetivo,
} from "./types";

export const TOTAL_ETAPAS = 5;

export const ETAPAS = [
  { numero: 1, label: "Identificação", motivacional: "Nos conte quem é você" },
  { numero: 2, label: "Histórico de Treino", motivacional: "Seu histórico de treino" },
  { numero: 3, label: "Hábitos de Vida", motivacional: "Seus hábitos de vida" },
  { numero: 4, label: "Saúde", motivacional: "Sua saúde" },
  { numero: 5, label: "Motivação", motivacional: "Sua motivação para a missão" },
] as const;

export const FEEDBACK_ETAPAS: Record<number, string> = {
  1: "Ótimo! Já te conhecemos melhor.",
  2: "Perfeito! Sabemos o que você quer alcançar.",
  3: "Incrível! Essas informações vão fazer diferença no seu treino.",
  4: "Missão quase completa. Último passo!",
};

export const OBJETIVOS: { value: Objetivo; label: string; emoji: string }[] = [
  { value: "emagrecer", label: "Emagrecer / perder gordura", emoji: "🔥" },
  { value: "massa_muscular", label: "Ganhar massa muscular", emoji: "💪" },
  { value: "saude_longevidade", label: "Saúde e longevidade", emoji: "🌱" },
  { value: "reduzir_stress", label: "Reduzir stress e ansiedade", emoji: "🧠" },
  { value: "performance_esporte", label: "Melhorar performance no esporte", emoji: "⚡" },
  { value: "outro", label: "Outro", emoji: "💭" },
];

export const DIAS_SEMANA: { value: DiasSemana; label: string }[] = [
  { value: "2x", label: "2x por semana" },
  { value: "3x", label: "3x por semana" },
  { value: "4x_mais", label: "4x ou mais por semana" },
];

export const HORARIOS: { value: HorarioPreferencia; label: string }[] = [
  { value: "manha", label: "Manhã (6h-12h)" },
  { value: "tarde", label: "Tarde (12h-18h)" },
  { value: "noite", label: "Noite (18h-22h)" },
];

export const NIVEIS_HABITO: { value: NivelHabito; label: string; emoji: string; score: number }[] = [
  { value: "otimo", label: "Ótimo", emoji: "⚡", score: 100 },
  { value: "bom", label: "Bom", emoji: "👍", score: 70 },
  { value: "regular", label: "Regular", emoji: "⚠️", score: 40 },
  { value: "precisa_melhorar", label: "Precisa melhorar", emoji: "🔴", score: 10 },
];

export const HABITOS_LIST = [
  { key: "stress" as const, label: "Stress", emoji: "🧠" },
  { key: "sono" as const, label: "Sono", emoji: "😴" },
  { key: "alimentacao" as const, label: "Alimentação", emoji: "🍎" },
  { key: "agua" as const, label: "Hidratação", emoji: "💧" },
];

export const HORAS_SENTADO: { value: HorasSentado; label: string }[] = [
  { value: "menos_4h", label: "Menos de 4h" },
  { value: "4_6h", label: "4h a 6h" },
  { value: "6_8h", label: "6h a 8h" },
  { value: "mais_8h", label: "Mais de 8h" },
];

export const DESAFIOS: { value: Desafio; label: string }[] = [
  { value: "falta_tempo", label: "Falta de tempo" },
  { value: "falta_motivacao", label: "Falta de motivação" },
  { value: "nao_gosto_academia", label: "Não gosto de academia" },
  { value: "ja_tentei_nao_consegui", label: "Já tentei antes e não consegui manter" },
  { value: "nao_sei_por_onde_comecar", label: "Não sei por onde começar" },
  { value: "dificuldade_financeira", label: "Dificuldade financeira" },
  { value: "problemas_saude", label: "Problemas de saúde ou limitação física" },
  { value: "falta_companhia", label: "Falta de companhia para treinar" },
  { value: "outro", label: "Outro" },
];

export const DESEJOS_FUTUROS: { value: DesejoFuturo; label: string }[] = [
  { value: "subir_escadas", label: "Subir escadas sem se cansar" },
  { value: "brincar_filhos_netos", label: "Brincar com meus filhos ou netos sem limitação" },
  { value: "viajar_disposicao", label: "Viajar com disposição e energia" },
  { value: "praticar_esporte", label: "Praticar um esporte ou atividade que amo" },
  { value: "sentir_bem_confiante", label: "Me sentir bem e confiante com meu corpo" },
  { value: "independencia_velhice", label: "Ter independência e autonomia na velhice" },
  { value: "outro", label: "Outro" },
];
