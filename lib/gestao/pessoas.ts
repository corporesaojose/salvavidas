// Nome como aparece na Pacto -> usuário do Slack, para os alertas mencionarem quem
// precisa agir. A chave é normalizada (maiúsculas, sem acento) na hora da busca, porque
// a Pacto grava o nome completo em caixa alta e nem sempre igual ao perfil do Slack.
//
// Quem não estiver aqui aparece pelo nome, sem menção — melhor não notificar do que
// notificar a pessoa errada.
export interface PessoaSlack {
  slackId: string;
  papel: "consultora" | "treinador" | "coordenacao" | "fisio" | "recepcao";
}

const MAPA: Record<string, PessoaSlack> = {
  // Comercial / recepção
  "BEATRIZ VITORIA DA SILVA": { slackId: "U0BD900UBCK", papel: "consultora" },
  "STEPHANIE DOS SANTOS VIEIRA": { slackId: "U0BQWPMBJ03", papel: "consultora" },
  // Há duas contas com o nome Jéssica Melo no workspace; esta é a que tem o cargo
  // de recepcionista no perfil e o nome igual ao que a Pacto grava. Confirmar.
  "JESSICA MELO ROSA": { slackId: "U0BJ39ZRF2A", papel: "consultora" },
  "LIVIAN ROSANE DE OLIVEIRA": { slackId: "U0BULN5FP7W", papel: "consultora" },
  "ALINE ALMEIDA BOMFIM DE MORAES": { slackId: "U0BG6F8DDL5", papel: "consultora" },

  // Treinadores (vínculo TW na Pacto)
  "RENATO HENRIQUE SILVA PAGNAN": { slackId: "U0BEU5U9F08", papel: "treinador" },
  "BRENO HENRIQUE BARBATO SANTOS": { slackId: "U0BDT5JRLCB", papel: "treinador" },
  "KAIQUE FERNANDES": { slackId: "U0BFUQ3TN73", papel: "treinador" },
  "ARTHUR LOCATELLI BARBOSA": { slackId: "U0BNN54JMND", papel: "treinador" },
  "FILIPE DA SILVA PAIXAO": { slackId: "U0BFWJ494SY", papel: "treinador" },
  "JOAO VICTOR DE OLIVEIRA": { slackId: "U0BF6FPD65A", papel: "treinador" },
  "FERNANDO DA SILVA LIMA": { slackId: "U0BPFNP5FT2", papel: "treinador" },
  "RICARDO SERGIO FRIAS FONSECA": { slackId: "U0BFKSCQHKJ", papel: "treinador" },
  "DANIELI VENTURINI": { slackId: "U0BE3T4HS7Q", papel: "treinador" },
  "ARI HENRIQUE LEONOR PINTO LARA": { slackId: "U0BQN61DQAF", papel: "treinador" },

  // Coordenação (vínculo OR na Pacto)
  "ANDRE ARAUJO SANCHES": { slackId: "U0BEVU1LLPK", papel: "coordenacao" },
  "MAURICIO ASSAF": { slackId: "U0BERC31518", papel: "coordenacao" },

  // Fisioterapia
  "VICTORIA SCHIRMER DA SILVA": { slackId: "U0BQNQZ2JUQ", papel: "fisio" },
};

function normalizar(nome: string) {
  return nome
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function acharPessoa(nomePacto: string | null | undefined): PessoaSlack | null {
  if (!nomePacto) return null;
  return MAPA[normalizar(nomePacto)] || null;
}

/** Menção pronta para o Slack, ou o nome puro quando a pessoa não está mapeada. */
export function mencionar(nomePacto: string | null | undefined): string {
  if (!nomePacto) return "sem responsável";
  const pessoa = acharPessoa(nomePacto);
  return pessoa ? `<@${pessoa.slackId}>` : nomePacto;
}

// Sem correspondência no Slack até agora (aparecem só pelo nome nos alertas):
// FELIPE MATHEUS GONCALVES DA SILVA, JOAO PEDRO, CAROLINE, IVAN, LIVIA.
