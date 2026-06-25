import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import type { FormState, MissaoResult } from "@/lib/missao/types";
import {
  OBJETIVOS,
  HORARIOS,
  NIVEIS_HABITO,
  HORAS_SENTADO,
  DESAFIOS,
  DESEJOS_FUTUROS,
} from "@/lib/missao/questions";

interface LeadPayload {
  formState: FormState;
  result: MissaoResult;
  telefone?: string;
}

function labelFor<T extends string>(
  list: { value: T; label: string }[],
  value: T | null
): string | null {
  return list.find((item) => item.value === value)?.label ?? null;
}

function labelsFor<T extends string>(list: { value: T; label: string }[], values: T[]): string[] {
  return values.map((value) => labelFor(list, value) ?? value);
}

function historicoTreinoLabel(formState: FormState): string {
  const { historico, oQuePraticava, qualAtividade } = formState.historicoTreino;
  const base =
    historico === "atual"
      ? "Treina atualmente"
      : historico === "parei"
        ? "Já treinou, parou"
        : "Nunca treinou";
  const atividade = oQuePraticava || qualAtividade;
  return atividade ? `${base} — ${atividade}` : base;
}

function objetivoLabel(formState: FormState): string {
  const { objetivos, outroObjetivo } = formState.historicoTreino;
  const labels = labelsFor(OBJETIVOS, objetivos).map((label) =>
    label === "Outro" && outroObjetivo ? outroObjetivo : label
  );
  return labels.join(", ");
}

function diasSemanaNumero(diasSemana: FormState["historicoTreino"]["diasSemana"]): number | null {
  if (!diasSemana) return null;
  return { "2x": 2, "3x": 3, "4x_mais": 4 }[diasSemana];
}

function saudeItemLabel(item: FormState["saude"]["problemaSaude"]): string | boolean {
  if (!item.tem) return false;
  return item.tem && item.descricao ? `Sim — ${item.descricao}` : true;
}

async function sendN8nWebhook(payload: Record<string, unknown>) {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Erro ao notificar webhook N8N:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { formState, result, telefone } = (await req.json()) as LeadPayload;

    if (!formState?.identificacao?.nomeCompleto) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const pool = getDbPool();
    const [insertResult] = await pool.query<import("mysql2/promise").ResultSetHeader>(
      `INSERT INTO leads (
        nome_completo, idade, bairro, nome_indicador,
        historico_treino, o_que_praticava, qual_atividade,
        objetivos, outro_objetivo, dias_semana, horario_preferencia,
        habito_stress, habito_sono, habito_alimentacao, habito_agua, habito_energia, horas_sentado,
        problema_saude, dores_lesoes, cirurgia_recente, historico_familiar,
        por_que_agora, nivel_motivacao, desafios, outro_desafio, desejos_futuros, outro_desejo_futuro,
        score_prontidao, nivel_prontidao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        formState.identificacao.nomeCompleto,
        Number(formState.identificacao.idade),
        formState.identificacao.bairro,
        formState.identificacao.nomeIndicador,
        formState.historicoTreino.historico,
        formState.historicoTreino.oQuePraticava || null,
        formState.historicoTreino.qualAtividade || null,
        JSON.stringify(formState.historicoTreino.objetivos),
        formState.historicoTreino.outroObjetivo || null,
        formState.historicoTreino.diasSemana,
        formState.historicoTreino.horarioPreferencia,
        formState.habitos.stress,
        formState.habitos.sono,
        formState.habitos.alimentacao,
        formState.habitos.agua,
        formState.habitos.energia,
        formState.habitos.horasSentado,
        formState.saude.problemaSaude.tem ? formState.saude.problemaSaude.descricao : null,
        formState.saude.doresLesoes.tem ? formState.saude.doresLesoes.descricao : null,
        formState.saude.cirurgiaRecente.tem ? formState.saude.cirurgiaRecente.descricao : null,
        formState.saude.historicoFamiliar.tem ? formState.saude.historicoFamiliar.descricao : null,
        formState.motivacao.porQueAgora,
        formState.motivacao.nivelMotivacao,
        JSON.stringify(formState.motivacao.desafios),
        formState.motivacao.outroDesafio || null,
        JSON.stringify(formState.motivacao.desejosFuturos),
        formState.motivacao.outroDesejoFuturo || null,
        result.scoreProntidao,
        result.nivelProntidao,
      ]
    );

    const leadId = insertResult.insertId;

    await sendN8nWebhook({
      lead_id: leadId,
      telefone: telefone || null,
      nome: formState.identificacao.nomeCompleto,
      idade: Number(formState.identificacao.idade),
      bairro: formState.identificacao.bairro,
      indicado_por: formState.identificacao.nomeIndicador,
      historico_treino: historicoTreinoLabel(formState),
      objetivo: objetivoLabel(formState),
      dias_semana: diasSemanaNumero(formState.historicoTreino.diasSemana),
      horario: labelFor(HORARIOS, formState.historicoTreino.horarioPreferencia),
      stress: labelFor(NIVEIS_HABITO, formState.habitos.stress),
      sono: labelFor(NIVEIS_HABITO, formState.habitos.sono),
      alimentacao: labelFor(NIVEIS_HABITO, formState.habitos.alimentacao),
      hidratacao: labelFor(NIVEIS_HABITO, formState.habitos.agua),
      energia: labelFor(NIVEIS_HABITO, formState.habitos.energia),
      horas_sentado: labelFor(HORAS_SENTADO, formState.habitos.horasSentado),
      problema_saude: saudeItemLabel(formState.saude.problemaSaude),
      dores_lesoes: saudeItemLabel(formState.saude.doresLesoes),
      cirurgia_recente: saudeItemLabel(formState.saude.cirurgiaRecente),
      historico_familiar: saudeItemLabel(formState.saude.historicoFamiliar),
      por_que_agora: formState.motivacao.porQueAgora,
      motivacao_nivel: formState.motivacao.nivelMotivacao,
      desafios: labelsFor(DESAFIOS, formState.motivacao.desafios).map((label) =>
        label === "Outro" && formState.motivacao.outroDesafio ? formState.motivacao.outroDesafio : label
      ),
      decatlon: labelsFor(DESEJOS_FUTUROS, formState.motivacao.desejosFuturos).map((label) =>
        label === "Outro" && formState.motivacao.outroDesejoFuturo
          ? formState.motivacao.outroDesejoFuturo
          : label
      ),
      score_prontidao: result.scoreProntidao,
      nivel: result.nivelLabel,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro ao salvar lead:", err);
    return NextResponse.json({ error: "Erro ao salvar lead" }, { status: 500 });
  }
}
