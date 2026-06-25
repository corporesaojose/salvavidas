export type HistoricoTreino = "nunca" | "parei" | "atual";

export type Objetivo =
  | "emagrecer"
  | "massa_muscular"
  | "saude_longevidade"
  | "reduzir_stress"
  | "performance_esporte"
  | "outro";

export type DiasSemana = "2x" | "3x" | "4x_mais";

export type HorarioPreferencia = "manha" | "tarde" | "noite";

export type NivelHabito = "otimo" | "bom" | "regular" | "precisa_melhorar";

export type HorasSentado = "menos_4h" | "4_6h" | "6_8h" | "mais_8h";

export type DesejoFuturo =
  | "subir_escadas"
  | "brincar_filhos_netos"
  | "viajar_disposicao"
  | "praticar_esporte"
  | "sentir_bem_confiante"
  | "independencia_velhice"
  | "outro";

export type Desafio =
  | "falta_tempo"
  | "falta_motivacao"
  | "nao_gosto_academia"
  | "ja_tentei_nao_consegui"
  | "nao_sei_por_onde_comecar"
  | "dificuldade_financeira"
  | "problemas_saude"
  | "falta_companhia"
  | "outro";

export interface IdentificacaoData {
  nomeCompleto: string;
  idade: string;
  bairro: string;
  nomeIndicador: string;
}

export interface HistoricoTreinoData {
  historico: HistoricoTreino | null;
  oQuePraticava: string;
  qualAtividade: string;
  objetivos: Objetivo[];
  outroObjetivo: string;
  diasSemana: DiasSemana | null;
  horarioPreferencia: HorarioPreferencia | null;
}

export interface HabitosData {
  stress: NivelHabito | null;
  sono: NivelHabito | null;
  alimentacao: NivelHabito | null;
  agua: NivelHabito | null;
  energia: NivelHabito | null;
  horasSentado: HorasSentado | null;
}

export interface SaudeItem {
  tem: boolean | null;
  descricao: string;
}

export interface SaudeData {
  problemaSaude: SaudeItem;
  doresLesoes: SaudeItem;
  cirurgiaRecente: SaudeItem;
  historicoFamiliar: SaudeItem;
}

export interface MotivacaoData {
  porQueAgora: string;
  nivelMotivacao: number;
  desafios: Desafio[];
  outroDesafio: string;
  desejosFuturos: DesejoFuturo[];
  outroDesejoFuturo: string;
}

export interface FormState {
  identificacao: IdentificacaoData;
  historicoTreino: HistoricoTreinoData;
  habitos: HabitosData;
  saude: SaudeData;
  motivacao: MotivacaoData;
}

export type NivelProntidao = "alto" | "medio" | "baixo";

export interface HabitoScore {
  key: keyof HabitosData;
  label: string;
  emoji: string;
  score: number;
  nivel: NivelHabito;
}

export interface MissaoResult {
  scoreProntidao: number;
  nivelProntidao: NivelProntidao;
  nivelLabel: string;
  mensagem: string;
  habitos: HabitoScore[];
}

export type BlockType =
  | "welcome"
  | "block1"
  | "block1_feedback"
  | "block2"
  | "block2_feedback"
  | "block3"
  | "block3_feedback"
  | "block4"
  | "block4_feedback"
  | "block5"
  | "calculating"
  | "result";

export interface Step {
  type: BlockType;
}
