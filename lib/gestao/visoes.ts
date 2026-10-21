import type { Voucher } from "@/lib/gestao/dados";

/**
 * As três leituras de voucher, como o Fernando as definiu em 20/10/2026 depois de a
 * lista de fechamentos dele não bater com a do relatório — a diferença era só de régua.
 * São três recortes do mesmo dado, e a regra que organiza tudo é: **toda métrica declara
 * qual data está usando**.
 *
 * 1. COORTE — manda o início do voucher, e **sem prazo**. O fechamento volta e credita o
 *    mês em que a experiência começou, por mais tempo que leve: voucher em janeiro,
 *    contrato em julho, é venda de janeiro — uma venda tardia. Mês nenhum fecha de vez;
 *    é característica, não erro (daí `tardia`, para o mês não subir sem explicação).
 * 2. MÊS CORRENTE — a vigência inteira: quem tinha voucher em pé em algum dia do mês e
 *    quantos contratos saíram no mês. Visão de operação, não serve para comparar meses
 *    (um mês herda voucher do anterior).
 * 3. COMISSÃO — manda a data da VENDA: o dia em que o contrato foi lançado e pago, que
 *    não é o dia em que o acesso do plano começa (a venda sai num dia e o acesso pode
 *    começar semanas depois). Fecha o mês e congela: nunca recalcula, senão coorte e
 *    comissão reescreveriam o passado e se pagaria duas vezes.
 *
 * Os três desempates que ele escolheu estão implementados aqui e em nenhum outro lugar:
 * janela de crédito de 45 dias, crédito para o treinador do voucher mais recente antes
 * do contrato, e relançamento encadeado como uma oportunidade só.
 */

/**
 * Janela de crédito, **da comissão**. Contrato assinado até 45 dias depois do fim da
 * vigência é comissão de voucher; passou disso é venda nova — continua na lista, porque
 * alguém vendeu, mas não é comissionada como voucher nem para o treinador nem para o
 * comercial. Caso de referência: Eliza Castro, voucher até 30/07 e contrato em 02/10,
 * 64 dias depois — conversão da coorte de julho, venda nova na comissão de outubro.
 *
 * A coorte não usa este número: ela não tem prazo. O mesmo 45 separa dois lançamentos —
 * encadeados até 45 dias um do outro são a mesma oportunidade.
 */
export const JANELA_CREDITO_DIAS = 45;

/**
 * A régua auditada do trimestre é sobre os dois vouchers de experiência padrão. Os de 30
 * dias e 3 meses saem de ações pontuais e caso a caso (ver conhecimento/02), com volume e
 * dinâmica diferentes — misturá-los mudaria o número que o Fernando já conferiu à mão.
 * A tela deixa trocar para todos os tipos; o padrão é este.
 */
export const TIPOS_EXPERIENCIA = ["Experiencia 7 dias", "Voucher 15 dias"];

/* ---------- datas, sempre em ISO (YYYY-MM-DD), sempre comparadas como texto ---------- */

function distanciaEmDias(de: string, ate: string) {
  return (Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000;
}

export function somarDias(dia: string, quantos: number) {
  return new Date(Date.parse(`${dia}T00:00:00Z`) + quantos * 86400000).toISOString().slice(0, 10);
}

export function mesDe(dia: string) {
  return dia.slice(0, 7);
}

export function primeiroDiaDoMes(mes: string) {
  return `${mes}-01`;
}

export function ultimoDiaDoMes(mes: string) {
  const [ano, numero] = mes.split("-").map(Number);
  return new Date(Date.UTC(ano, numero, 0)).toISOString().slice(0, 10);
}

/* ---------- oportunidade: a unidade de contagem das três visões ---------- */

/**
 * O contrato é dado da PESSOA, não do lançamento: a coluna `data_contrato` vem repetida
 * em todas as linhas de quem fechou (e às vezes só em uma delas, a última sincronizada).
 * Por isso ele é lido uma vez por matrícula e cada oportunidade decide por conta própria
 * se aquele contrato cai na sua janela — foi assim que apareceu o caso da Lucimara
 * Fernandes (016821), com oportunidade em maio e outra em julho e o contrato de 09/08
 * pertencendo só à de julho, embora as três linhas dela estejam marcadas como fechadas.
 */
export interface ContratoDaPessoa {
  matricula: string;
  nome: string;
  /**
   * A data que manda: a da venda quando o sync já a trouxe, senão o início do acesso do
   * plano. É ela que decide de qual voucher a venda é, se cabe na janela da comissão e
   * em que mês a comissão cai.
   */
  data: string;
  /** O dia em que a venda foi lançada e paga, quando conhecido. */
  dataVenda: string | null;
  /** Início do acesso do plano — o que a Pacto chama de contrato. */
  dataAcesso: string | null;
  /**
   * A venda ainda está sendo lida pelo início do acesso, porque o sync não trouxe a data
   * de pagamento dela. A tela conta quantas são: enquanto houver, o mês mistura réguas.
   */
  semDataDeVenda: boolean;
  plano: string | null;
  /** Duração do plano em meses; null enquanto o sync não a trouxer. */
  planoMeses: number | null;
  /** Plano curto demais para comissão. Ver `MESES_MINIMO_COMISSAO`. */
  planoCurto: boolean;
  /** Ainda sem duração conhecida: não dá para dizer se comissiona. */
  semDuracao: boolean;
}

/**
 * A casa paga comissão de plano com **6 meses ou mais** de duração — regra do Fernando
 * em 21/10/2026. Mensal, trimestral e quadrimestral existem e são raros, mas acontecem,
 * e não entram: o Estevam Ferri fechou um de 1 mês e R$ 610.
 *
 * O nome do plano não serve para separar: "PLANO CTG FISIO" é a descrição tanto do
 * mensal quanto dos anuais de 12 a 17 meses. A duração vem calculada das fases do
 * contrato no período de acesso (CA, AT, RA, BO do mesmo contrato), do menor início ao
 * maior fim — conta que o sync faz com o que já tem em mãos, sem chamada nova.
 */
export const MESES_MINIMO_COMISSAO = 6;

/** Uma sequência de lançamentos encadeados: uma oportunidade de venda, uma experiência. */
export interface Oportunidade {
  matricula: string;
  nome: string;
  fotoUrl: string | null;
  /** Do mais antigo ao mais recente. */
  lancamentos: Voucher[];
  chaves: string[];
  /** Início do lançamento MAIS RECENTE: é a data da coorte (relançamento reinicia). */
  inicio: string;
  /** Início do primeiro lançamento: onde a vigência da oportunidade começa. */
  inicioPrimeiro: string;
  /** Maior fim de vigência da sequência. */
  fim: string;
  /** Mês da coorte, YYYY-MM. */
  coorte: string;
  /** Fim da vigência mais a janela de crédito. */
  limiteCredito: string;
  /** Tipo do lançamento mais recente. */
  tipo: string;
  /** Soma dos dias de treino de todos os lançamentos da sequência. */
  treinos: number;
  treinadorWeb: string | null;
  professor: string | null;
  /** O contrato da pessoa, quando esta oportunidade é a dona dele. */
  contrato: ContratoDaPessoa | null;
  fechou: boolean;
  /**
   * Fechou depois dos 45 dias do fim da vigência. Continua sendo conversão desta coorte
   * — a coorte não tem prazo —, mas não é comissionada como voucher.
   */
  tardia: boolean;
  /** Fechou dentro dos 45 dias: é a venda que gera comissão de voucher. */
  comissionada: boolean;
  /** O lançamento mais recente antes do contrato: é dele que sai o crédito. */
  lancamentoOrigem: Voucher | null;
}

export interface BaseVisoes {
  hoje: string;
  /** Tipos de voucher no recorte; null quando são todos. */
  tipos: string[] | null;
  oportunidades: Oportunidade[];
  contratos: Map<string, ContratoDaPessoa>;
  /** A visão 3 inteira: um contrato por linha, já com treinador creditado e origem. */
  comissao: LinhaComissao[];
  /**
   * Contratos de quem não tem nenhum voucher dentro do recorte — normalmente plano
   * fechado depois de um voucher de 30 dias ou 3 meses. Não há voucher a creditar, e
   * somá-los inflaria a comissão; ficam de fora da lista e contados aqui, para a tela
   * dizer quantos são em vez de deixá-los desaparecer.
   */
  contratosForaDoRecorte: ContratoDaPessoa[];
  /** Lançamentos de um dia só, descartados — ver `ehPasseDeAssinatura`. */
  passesDeAssinatura: Voucher[];
  /** Lançamentos deixados de fora pelo recorte de tipo. */
  foraDoTipo: number;
  meses: string[];
}

/**
 * Vigência de um único dia não é experiência: é o passe que a recepção lança para a
 * pessoa passar na catraca no dia em que assina o contrato (Francisco Manoel Corrêa
 * Dias, 017227, e mais sete casos até outubro de 2026 — todos com um treino só e seis
 * deles com contrato no mesmo dia ou no dia seguinte). Contá-los como voucher inventa
 * conversão: a Eliza Castro passaria a figurar como coorte de outubro com 100% de
 * conversão, quando o voucher dela foi em julho, não converteu na janela e a venda de
 * 02/10 é venda nova — exatamente o que a regra dos 45 dias existe para separar.
 *
 * Eles ficam fora das três visões, mas o contrato que carregam continua valendo: é dado
 * da pessoa (ver `ContratoDaPessoa`), e por isso a comissão não perde ninguém.
 */
export function ehPasseDeAssinatura(voucher: Voucher) {
  return voucher.inicioVigencia === voucher.fimVigencia;
}

function acompanhante(voucher: Voucher) {
  return voucher.treinadorWeb || voucher.professor || null;
}

/**
 * Agrupa os lançamentos em oportunidades e aplica as regras de desempate. Recebe os
 * vouchers já sem os excluídos logicamente — exclusão é decisão da equipe e vale para
 * qualquer leitura.
 */
export function prepararVisoes(
  vouchers: Voucher[],
  opcoes: { hoje: string; tipos?: string[] | null }
): BaseVisoes {
  const { hoje } = opcoes;
  const tipos = opcoes.tipos && opcoes.tipos.length ? opcoes.tipos : null;

  // O contrato sai da base inteira, antes de qualquer recorte: ele é da pessoa, não do
  // lançamento, e pode estar gravado numa linha que o recorte descarta.
  const contratos = new Map<string, ContratoDaPessoa>();
  for (const voucher of vouchers) {
    if (!voucher.dataContrato && !voucher.dataVenda) continue;
    const atual = contratos.get(voucher.matricula);

    if (!atual) {
      contratos.set(voucher.matricula, {
        matricula: voucher.matricula,
        nome: voucher.nome,
        data: voucher.dataVenda || (voucher.dataContrato as string),
        dataVenda: voucher.dataVenda,
        dataAcesso: voucher.dataContrato,
        semDataDeVenda: !voucher.dataVenda,
        plano: voucher.planoFechado,
        planoMeses: voucher.planoMeses ?? null,
        // `== null` de propósito: pega também undefined, que é o que vem quando a
        // coluna ainda não existe no banco ou o payload não mandou o campo.
        planoCurto: voucher.planoMeses != null && voucher.planoMeses < MESES_MINIMO_COMISSAO,
        semDuracao: voucher.planoMeses == null,
      });
      continue;
    }

    // As outras linhas da pessoa completam o que falta: o sync pode gravar a venda ou a
    // duração em qualquer uma delas, não necessariamente na primeira que aparece aqui.
    if (atual.semDataDeVenda && voucher.dataVenda) {
      atual.dataVenda = voucher.dataVenda;
      atual.data = voucher.dataVenda;
      atual.semDataDeVenda = false;
    }
    if (atual.semDuracao && voucher.planoMeses != null) {
      atual.planoMeses = voucher.planoMeses;
      atual.planoCurto = voucher.planoMeses < MESES_MINIMO_COMISSAO;
      atual.semDuracao = false;
    }
    if (!atual.dataAcesso && voucher.dataContrato) atual.dataAcesso = voucher.dataContrato;
    if (!atual.plano && voucher.planoFechado) atual.plano = voucher.planoFechado;
  }

  const passesDeAssinatura = vouchers.filter(ehPasseDeAssinatura);
  const semPasse = vouchers.filter((v) => !ehPasseDeAssinatura(v));
  const noRecorte = tipos ? semPasse.filter((v) => tipos.includes(v.plano)) : semPasse;

  const porPessoa = new Map<string, Voucher[]>();
  for (const voucher of noRecorte) {
    const lista = porPessoa.get(voucher.matricula);
    if (lista) lista.push(voucher);
    else porPessoa.set(voucher.matricula, [voucher]);
  }

  const oportunidades: Oportunidade[] = [];
  for (const lista of Array.from(porPessoa.values())) {
    lista.sort(
      (a, b) => a.inicioVigencia.localeCompare(b.inicioVigencia) || a.chave.localeCompare(b.chave)
    );

    // Relançamento encadeado até 45 dias do fim do anterior é a mesma oportunidade;
    // intervalo maior é oportunidade nova. A conta é contra o fim acumulado da
    // sequência, não contra o último lançamento, porque vigências se sobrepõem.
    let sequencia: Voucher[] = [lista[0]];
    let fimAcumulado = lista[0].fimVigencia;
    for (const voucher of lista.slice(1)) {
      if (distanciaEmDias(fimAcumulado, voucher.inicioVigencia) <= JANELA_CREDITO_DIAS) {
        sequencia.push(voucher);
      } else {
        oportunidades.push(montarOportunidade(sequencia));
        sequencia = [voucher];
        fimAcumulado = voucher.fimVigencia;
        continue;
      }
      if (voucher.fimVigencia > fimAcumulado) fimAcumulado = voucher.fimVigencia;
    }
    oportunidades.push(montarOportunidade(sequencia));
  }

  oportunidades.sort(
    (a, b) => a.inicio.localeCompare(b.inicio) || a.nome.localeCompare(b.nome)
  );

  const meses = Array.from(new Set(oportunidades.map((o) => o.coorte))).sort();
  const { linhas, foraDoRecorte } = creditarContratos(oportunidades, contratos);

  return {
    hoje,
    tipos,
    oportunidades,
    contratos,
    comissao: linhas,
    contratosForaDoRecorte: foraDoRecorte,
    passesDeAssinatura,
    foraDoTipo: semPasse.length - noRecorte.length,
    meses,
  };
}

function montarOportunidade(sequencia: Voucher[]): Oportunidade {
  const recente = sequencia[sequencia.length - 1];
  const fim = sequencia.reduce(
    (maior, v) => (v.fimVigencia > maior ? v.fimVigencia : maior),
    sequencia[0].fimVigencia
  );
  const limiteCredito = somarDias(fim, JANELA_CREDITO_DIAS);

  // O contrato é creditado depois, em creditarContratos: quem fica com ele depende de
  // todas as oportunidades da pessoa, não dá para decidir olhando uma só.
  const contrato = null;

  return {
    matricula: recente.matricula,
    nome: recente.nome,
    fotoUrl: recente.fotoUrl,
    lancamentos: sequencia,
    chaves: sequencia.map((v) => v.chave),
    inicio: recente.inicioVigencia,
    inicioPrimeiro: sequencia[0].inicioVigencia,
    fim,
    coorte: mesDe(recente.inicioVigencia),
    limiteCredito,
    tipo: recente.plano,
    treinos: sequencia.reduce((soma, v) => soma + v.frequencia, 0),
    treinadorWeb: recente.treinadorWeb,
    professor: recente.professor,
    contrato,
    fechou: false,
    tardia: false,
    comissionada: false,
    lancamentoOrigem: null,
  };
}

/**
 * Credita cada contrato à oportunidade dona dele e devolve a lista da comissão.
 *
 * A regra da coorte **não tem prazo**: o contrato é da coorte do voucher mais recente
 * que a pessoa começou antes dele, por mais tempo que tenha passado. Voucher em janeiro,
 * a pessoa some, volta em julho e fecha: para a coorte é venda de janeiro, uma venda
 * tardia. A coorte só troca de dono quando a pessoa faz uma experiência nova — e aí o
 * voucher novo é uma oportunidade nova, que é o encadeamento logo acima.
 *
 * Os 45 dias são critério **da comissão**, não da coorte: contrato até 45 dias depois do
 * fim da vigência é comissão de voucher; passou disso é venda nova, continua aparecendo
 * na lista (alguém vendeu), mas não é comissionada como voucher.
 */
function creditarContratos(
  oportunidades: Oportunidade[],
  contratos: Map<string, ContratoDaPessoa>
): { linhas: LinhaComissao[]; foraDoRecorte: ContratoDaPessoa[] } {
  const porPessoa = new Map<string, Oportunidade[]>();
  for (const oportunidade of oportunidades) {
    const lista = porPessoa.get(oportunidade.matricula);
    if (lista) lista.push(oportunidade);
    else porPessoa.set(oportunidade.matricula, [oportunidade]);
  }

  const linhas: LinhaComissao[] = [];
  const foraDoRecorte: ContratoDaPessoa[] = [];

  for (const [matricula, contrato] of Array.from(contratos.entries())) {
    // O voucher de origem é o lançamento mais recente que já havia começado quando o
    // contrato saiu; a oportunidade dele fica com a venda.
    let dona: Oportunidade | null = null;
    let lancamento: Voucher | null = null;
    for (const oportunidade of porPessoa.get(matricula) || []) {
      for (const candidato of oportunidade.lancamentos) {
        if (candidato.inicioVigencia > contrato.data) continue;
        if (!lancamento || candidato.inicioVigencia >= lancamento.inicioVigencia) {
          lancamento = candidato;
          dona = oportunidade;
        }
      }
    }

    if (!dona || !lancamento) {
      foraDoRecorte.push(contrato);
      continue;
    }

    dona.contrato = contrato;
    dona.fechou = true;
    dona.tardia = contrato.data > dona.limiteCredito;
    dona.comissionada = !dona.tardia;
    dona.lancamentoOrigem = lancamento;

    // Coordenador não recebe: olha quem levaria o crédito e, sem treinador web, quem
    // acompanhou.
    const coordenador = ehCoordenador(lancamento.treinadorWeb || lancamento.professor);

    linhas.push({
      matricula,
      nome: lancamento.nome,
      fotoUrl: lancamento.fotoUrl,
      mes: mesDe(contrato.data),
      dataContrato: contrato.data,
      semDataDeVenda: contrato.semDataDeVenda,
      planoFechado: contrato.plano,
      planoMeses: contrato.planoMeses,
      planoCurto: contrato.planoCurto,
      semDuracao: contrato.semDuracao,
      treinadorCreditado: lancamento.treinadorWeb,
      professorNoVoucher: lancamento.treinadorWeb ? null : lancamento.professor,
      origem: dona,
      treinos: dona.treinos,
      dentroDaJanela: dona.comissionada,
      diasDepoisDaVigencia: distanciaEmDias(dona.fim, contrato.data),
      creditadoCoordenador: coordenador,
      comissionada: dona.comissionada && !contrato.planoCurto && !coordenador,
      motivoFora: !dona.comissionada
        ? "venda-nova"
        : contrato.planoCurto
        ? "plano-curto"
        : coordenador
        ? "coordenador"
        : null,
    });
  }

  linhas.sort(
    (a, b) => a.dataContrato.localeCompare(b.dataContrato) || a.nome.localeCompare(b.nome)
  );
  foraDoRecorte.sort((a, b) => a.data.localeCompare(b.data));
  return { linhas, foraDoRecorte };
}

/* ---------- visão 1: coorte ---------- */

export interface CoorteMes {
  /** YYYY-MM, ou um rótulo de período quando é soma de meses. */
  mes: string;
  pessoas: number;
  lancamentos: number;
  fecharam: number;
  conversao: number | null;
  /**
   * Quantos desses fechamentos vieram depois dos 45 dias. Sem isso um mês antigo sobe
   * sem explicação: a coorte não fecha nunca, porque não tem prazo.
   */
  tardias: number;
  treinosMedia: number | null;
  semNenhumTreino: number;
}

function somarCoorte(mes: string, oportunidades: Oportunidade[]): CoorteMes {
  const fecharam = oportunidades.filter((o) => o.fechou).length;
  const treinos = oportunidades.reduce((soma, o) => soma + o.treinos, 0);
  return {
    mes,
    pessoas: oportunidades.length,
    lancamentos: oportunidades.reduce((soma, o) => soma + o.lancamentos.length, 0),
    fecharam,
    conversao: oportunidades.length
      ? Math.round((fecharam / oportunidades.length) * 1000) / 10
      : null,
    tardias: oportunidades.filter((o) => o.tardia).length,
    treinosMedia: oportunidades.length
      ? Math.round((treinos / oportunidades.length) * 10) / 10
      : null,
    semNenhumTreino: oportunidades.filter((o) => o.treinos === 0).length,
  };
}

export function coortePorMes(base: BaseVisoes): CoorteMes[] {
  return base.meses.map((mes) =>
    somarCoorte(
      mes,
      base.oportunidades.filter((o) => o.coorte === mes)
    )
  );
}

/** Total de um intervalo de meses da coorte — é como se lê um trimestre. */
export function totalCoorte(base: BaseVisoes, meses: string[]): CoorteMes {
  const dentro = new Set(meses);
  return somarCoorte(
    meses.join("+"),
    base.oportunidades.filter((o) => dentro.has(o.coorte))
  );
}

export interface Trimestre {
  id: string;
  rotulo: string;
  meses: string[];
}

const NOMES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Os trimestres que a base cobre, para ler a coorte do jeito que o Fernando pediu. */
export function trimestresDisponiveis(meses: string[]): Trimestre[] {
  const vistos = new Map<string, string[]>();
  for (const mes of meses) {
    const [ano, numero] = mes.split("-").map(Number);
    const id = `${ano}-T${Math.floor((numero - 1) / 3) + 1}`;
    const lista = vistos.get(id);
    if (lista) lista.push(mes);
    else vistos.set(id, [mes]);
  }
  return Array.from(vistos.entries()).map(([id, lista]) => {
    const primeiro = Number(lista[0].split("-")[1]) - 1;
    const base = Math.floor(primeiro / 3) * 3;
    return {
      id,
      rotulo: `${id.split("-")[1].replace("T", "")}º tri · ${NOMES_CURTOS[base]}–${NOMES_CURTOS[base + 2]}`,
      meses: lista,
    };
  });
}

/* ---------- visão 2: mês corrente ---------- */

export interface MovimentoMes {
  mes: string;
  /** Pessoas com voucher válido em algum dia do mês — a vigência inteira. */
  emPe: number;
  /** Oportunidades cuja coorte é este mês. */
  iniciados: number;
  /** Contratos assinados no mês, pelo mesmo critério da comissão. */
  contratos: number;
  /** Treinos dos lançamentos que começaram no mês. */
  treinos: number;
  /** O mês ainda está correndo. */
  emCurso: boolean;
}

export function movimentoMensal(base: BaseVisoes): MovimentoMes[] {
  const mesDeHoje = mesDe(base.hoje);
  // Contrato aqui é o mesmo conjunto da comissão, pelo mesmo critério: duas visões da
  // mesma página não podem contar contrato de maneira diferente.
  const contratosPorMes = new Map<string, number>();
  for (const linha of base.comissao) {
    contratosPorMes.set(linha.mes, (contratosPorMes.get(linha.mes) || 0) + 1);
  }

  // Meses da coorte mais os meses em que só houve contrato (venda nova de voucher velho).
  const meses = Array.from(
    new Set(base.meses.concat(Array.from(contratosPorMes.keys())))
  ).sort();

  return meses.map((mes) => {
    const inicio = primeiroDiaDoMes(mes);
    const fim = ultimoDiaDoMes(mes);
    const emPe = base.oportunidades.filter(
      (o) => o.inicioPrimeiro <= fim && o.fim >= inicio
    );
    const iniciados = base.oportunidades.filter((o) => o.coorte === mes);
    return {
      mes,
      emPe: emPe.length,
      iniciados: iniciados.length,
      contratos: contratosPorMes.get(mes) || 0,
      treinos: iniciados.reduce((soma, o) => soma + o.treinos, 0),
      emCurso: mes === mesDeHoje,
    };
  });
}

/* ---------- visão 3: comissão ---------- */

export interface LinhaComissao {
  matricula: string;
  nome: string;
  fotoUrl: string | null;
  /** Mês da assinatura: é o que fecha e congela. */
  mes: string;
  /** A data que vale: a da venda, ou o início do acesso enquanto ela não vier. */
  dataContrato: string;
  /** Ainda lida pelo início do acesso: o sync não trouxe a data de pagamento. */
  semDataDeVenda: boolean;
  planoFechado: string | null;
  /** Duração do plano em meses, quando conhecida. */
  planoMeses: number | null;
  /** Plano curto demais: aparece na lista, marcado, mas fora da contagem. */
  planoCurto: boolean;
  /** Sem duração conhecida: ainda não dá para dizer se comissiona. */
  semDuracao: boolean;
  /** Treinador web do voucher mais recente antes do contrato. */
  treinadorCreditado: string | null;
  /** Quem acompanhou sem ser treinador web — informação, não crédito. */
  professorNoVoucher: string | null;
  /** O voucher que originou a venda: o mais recente da pessoa antes do contrato. */
  origem: Oportunidade;
  /** Dias de treino na vigência do voucher de origem. */
  treinos: number;
  /**
   * Contrato dentro dos 45 dias do fim da vigência: é comissão de voucher. Fora disso é
   * venda nova — continua na lista, porque alguém vendeu, mas não é comissionada.
   */
  dentroDaJanela: boolean;
  /** Dias entre o fim da vigência e a assinatura. Negativo: assinou durante a vigência. */
  diasDepoisDaVigencia: number;
  /** Quem levaria o crédito é coordenador, e coordenador não recebe comissão. */
  creditadoCoordenador: boolean;
  /** A venda entra na conta da comissão. */
  comissionada: boolean;
  /** Por que ficou de fora, quando ficou. Um motivo só, o primeiro que se aplica. */
  motivoFora: MotivoForaDaComissao | null;
}

export type MotivoForaDaComissao = "venda-nova" | "plano-curto" | "coordenador";

export const TEXTO_MOTIVO_FORA: Record<MotivoForaDaComissao, string> = {
  "venda-nova": "venda nova",
  "plano-curto": "plano curto",
  coordenador: "coordenador",
};

/**
 * Coordenadores não recebem comissão de voucher — regra do Fernando em 21/10/2026, a
 * partir do João Marcelo Michelletti Torres, creditado ao André Araujo Sanches.
 *
 * Os dois aparecem na base como treinador web de alguns vouchers (André em 8, Mauricio
 * em 1) e o Mauricio também como professor, então a exclusão olha os dois campos: o
 * treinador web e, quando não há, quem acompanhou. A regra do Fernando fala em "quem
 * montou o treino" — esse dado a Pacto não expõe por API, e o vínculo de professor é o
 * mais próximo que existe aqui.
 */
export const COORDENADORES_SEM_COMISSAO = ["ANDRÉ ARAUJO SANCHES", "MAURICIO ASSAF"];

function semAcento(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();
}

export function ehCoordenador(nome: string | null) {
  if (!nome) return false;
  const alvo = semAcento(nome);
  return COORDENADORES_SEM_COMISSAO.some((c) => semAcento(c) === alvo);
}

export interface ComissaoDoTreinador {
  treinador: string;
  contratos: number;
}

/**
 * Quantos contratos cada treinador leva no mês. Cada contrato conta uma vez só, e só
 * entra o que é comissionado como voucher: venda nova, plano curto e coordenador não
 * geram crédito de treinador.
 */
export function comissaoPorTreinador(linhas: LinhaComissao[]): ComissaoDoTreinador[] {
  const contagem = new Map<string, number>();
  for (const linha of linhas.filter((l) => l.comissionada)) {
    const quem = linha.treinadorCreditado || "sem treinador vinculado";
    contagem.set(quem, (contagem.get(quem) || 0) + 1);
  }
  return Array.from(contagem.entries())
    .map(([treinador, contratos]) => ({ treinador, contratos }))
    .sort((a, b) => b.contratos - a.contratos || a.treinador.localeCompare(b.treinador));
}
