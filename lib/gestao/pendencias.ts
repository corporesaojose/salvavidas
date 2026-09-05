// Conferência da lista enviada pelo comercial: os nomes que não têm voucher
// lançado no período, checados um a um na Pacto (cadastro, treino montado, período de
// acesso e catraca). Cada item vira uma tarefa que a consultora fecha no relatório.
export interface ItemPendencia {
  id: string;
  quem: string;
  detalhe: string;
}

export interface GrupoPendencia {
  grupo: string;
  oque: string;
  alta?: boolean;
  itens: ItemPendencia[];
}

export const PENDENCIAS: GrupoPendencia[] = [
  {
    grupo: "Voucher no nome, nunca lançado",
    alta: true,
    oque:
      'O cadastro diz "voucher" e o treino está montado, mas não existe período de Passe Livre na Pacto — lançar o voucher ou registrar por que não foi concedido.',
    itens: [
      { id: "pl-morikawa", quem: "Andréa Morikawa", detalhe: "mat. 017057 · treino montado · 2 entradas em julho" },
      { id: "pl-rosana", quem: "Rosana Fonseca", detalhe: "mat. 017181 · treino montado · 2 entradas em agosto" },
      { id: "pl-simone", quem: "Simone Camillo", detalhe: "mat. 017128 · treino montado · nenhuma entrada" },
      { id: "pl-miguel", quem: "Miguel Cassio Castro", detalhe: "mat. 017125 · treino montado · voucher só lançado em 01/09" },
    ],
  },
  {
    grupo: "Cadastro aberto e parado",
    oque:
      "Visitantes sem voucher, sem treino e sem nenhuma passagem na catraca — retomar contato ou encerrar o cadastro.",
    itens: [
      { id: "cp-adriana", quem: "Adriana Ribeiro Guimarães", detalhe: "mat. 017071 · cadastro de 14/07" },
      { id: "cp-lourdes", quem: "Maria de Lourdes DCMarretto", detalhe: "mat. 017193 · cadastro de 26/08" },
      { id: "cp-giselly", quem: "Giselly Pereira de Castro", detalhe: "mat. 017203 · cadastro de 01/09" },
      { id: "cp-janaina", quem: "Janaina", detalhe: "três cadastros só com o primeiro nome (015788, 016943, 012903)" },
    ],
  },
  {
    grupo: "Resolvidos por outro caminho",
    oque: "Não precisam de voucher — só de confirmação e de arrumar o cadastro.",
    itens: [
      { id: "ok-thiago", quem: "Thiago Furlanetto Wronski", detalhe: "mat. 017139 · fechou plano sem voucher, 6 treinos até 02/09" },
      { id: "ok-isabella", quem: "Isabella Figueiredo Craveiri", detalhe: "cadastro duplicado — o voucher caiu em Craveiro/013964; unificar" },
    ],
  },
  {
    grupo: "Sem cadastro localizado",
    oque:
      "A busca por nome não devolveu ninguém, ou só homônimos inativos — conferir a grafia ou de onde veio o nome.",
    itens: [
      { id: "sc-ana", quem: "Ana Lagoeiro", detalhe: "nenhum cadastro na Pacto" },
      { id: "sc-karina", quem: "Karina Calabrêz", detalhe: "nenhum cadastro na Pacto" },
      { id: "sc-otavio", quem: "Otávio Correia Bonocchi", detalhe: "nenhum cadastro na Pacto" },
      { id: "sc-sandra", quem: "Sandra Leila Candelária Osman", detalhe: "nenhum cadastro na Pacto" },
      { id: "sc-luciano", quem: "Luciano da Silva Lima Junior", detalhe: "só homônimo inativo desde 2022" },
      { id: "sc-lucimara", quem: "Lucimara Aparecida de Almeida", detalhe: "só homônima inativa desde 2021" },
      { id: "sc-patricia1", quem: "Patricia Alves Garcia Torres", detalhe: "só homônimas sem voucher" },
      { id: "sc-patricia2", quem: "Patricia Dias Ribeiro e Silva", detalhe: "só homônimas já conferidas" },
    ],
  },
];

export const TOTAL_PENDENCIAS = PENDENCIAS.reduce((soma, g) => soma + g.itens.length, 0);
