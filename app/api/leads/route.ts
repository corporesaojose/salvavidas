import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import type { FormState, MissaoResult } from "@/lib/missao/types";

interface LeadPayload {
  formState: FormState;
  result: MissaoResult;
}

export async function POST(req: NextRequest) {
  try {
    const { formState, result } = (await req.json()) as LeadPayload;

    if (!formState?.identificacao?.nomeCompleto) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const pool = getDbPool();
    await pool.query(
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro ao salvar lead:", err);
    return NextResponse.json({ error: "Erro ao salvar lead" }, { status: 500 });
  }
}
