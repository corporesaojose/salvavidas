"use client";

import { Fragment, useMemo, useState } from "react";
import type { Voucher } from "@/lib/gestao/dados";
import { rotuloPlano } from "@/lib/gestao/planos";
import type { LinhaComissao } from "@/lib/gestao/visoes";
import {
  JANELA_CREDITO_DIAS,
  TIPOS_EXPERIENCIA,
  coortePorMes,
  comissaoPorTreinador,
  movimentoMensal,
  prepararVisoes,
  totalCoorte,
  trimestresDisponiveis,
} from "@/lib/gestao/visoes";

/**
 * As três leituras de voucher na tela. Toda a regra está em lib/gestao/visoes.ts: aqui
 * não se decide nada, só se mostra — e cada visão declara, na própria interface, qual
 * data está usando, porque foi a confusão entre elas que gerou o problema.
 *
 * A coorte se lê mês a mês (o trimestre entra como subtotal, para conferir contra o que
 * já foi apurado à mão) e a comissão se lê por trimestre com os meses separados: ela
 * fecha e congela por mês, então somar o trimestre num número só esconderia o que se
 * paga.
 */

const MESES_CURTOS: Record<string, string> = {
  "01": "jan", "02": "fev", "03": "mar", "04": "abr", "05": "mai", "06": "jun",
  "07": "jul", "08": "ago", "09": "set", "10": "out", "11": "nov", "12": "dez",
};

const MESES_LONGOS: Record<string, string> = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
};

function rotuloDoMes(mes: string) {
  const [ano, numero] = mes.split("-");
  return `${MESES_CURTOS[numero] || numero}/${ano.slice(2)}`;
}

function nomeDoMes(mes: string) {
  const [ano, numero] = mes.split("-");
  return `${MESES_LONGOS[numero] || numero} de ${ano}`;
}

function dataCurta(iso: string) {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

function porcento(valor: number | null) {
  return valor === null ? "—" : `${Math.round(valor)}%`;
}

function trimestreDe(mes: string) {
  const [ano, numero] = mes.split("-").map(Number);
  return `${ano}-T${Math.floor((numero - 1) / 3) + 1}`;
}

type Visao = "coorte" | "mes" | "comissao";

const ABAS: { id: Visao; rotulo: string; data: string }[] = [
  { id: "coorte", rotulo: "Coorte do voucher", data: "início do voucher" },
  { id: "mes", rotulo: "Mês corrente", data: "a vigência inteira" },
  { id: "comissao", rotulo: "Comissão", data: "data da venda" },
];

export default function Visoes({ vouchers, hoje }: { vouchers: Voucher[]; hoje: string }) {
  const [visao, setVisao] = useState<Visao>("coorte");
  const [soExperiencia, setSoExperiencia] = useState(true);

  const base = useMemo(
    () => prepararVisoes(vouchers, { hoje, tipos: soExperiencia ? TIPOS_EXPERIENCIA : null }),
    [vouchers, hoje, soExperiencia]
  );

  const porMes = useMemo(() => coortePorMes(base), [base]);
  const movimento = useMemo(() => movimentoMensal(base), [base]);
  const totalDaBase = useMemo(() => totalCoorte(base, base.meses), [base]);

  // Os trimestres saem dos meses com coorte e dos meses com contrato: um contrato de
  // venda nova pode cair num mês em que nenhum voucher começou.
  const trimestres = useMemo(
    () =>
      trimestresDisponiveis(
        Array.from(new Set(base.meses.concat(base.comissao.map((l) => l.mes)))).sort()
      ),
    [base]
  );

  // O trimestre que abre é o do mês anterior ao corrente: o último com os três meses já
  // vividos. É a leitura que o Fernando conferiu à mão (julho a setembro).
  const trimestrePadrao = useMemo(() => {
    const anterior = new Date(Date.parse(`${hoje}T00:00:00Z`));
    anterior.setUTCDate(1);
    anterior.setUTCMonth(anterior.getUTCMonth() - 1);
    return trimestreDe(anterior.toISOString().slice(0, 7));
  }, [hoje]);

  const [trimestreEscolhido, setTrimestreEscolhido] = useState<string | null>(null);
  const trimestre =
    trimestres.find((t) => t.id === (trimestreEscolhido || trimestrePadrao)) ||
    trimestres[trimestres.length - 1];

  const linhasDoTrimestre = base.comissao.filter((l) => trimestre?.meses.includes(l.mes));

  const abaAtual = ABAS.find((a) => a.id === visao) || ABAS[0];
  const maiorCoorte = Math.max(...porMes.map((l) => l.pessoas), 1);

  if (!base.oportunidades.length) return null;

  return (
    <section className="visoes" aria-label="Três leituras do voucher">
      <div className="visoes-topo">
        <div>
          <h2>Três leituras do mesmo dado</h2>
          <p className="sub">
            A mesma base lida por três datas diferentes. A coorte mede a experiência, o mês
            corrente mede a operação e a comissão fecha o pagamento. Confundir uma com a outra
            foi o que fez a lista do comercial não bater com a do relatório — por isso cada
            visão diz aqui qual data está usando.
          </p>
        </div>
        <div className="escopo" role="group" aria-label="Tipos de voucher na conta">
          <button
            className="chip"
            aria-pressed={soExperiencia}
            onClick={() => setSoExperiencia(true)}
          >
            7 e 15 dias
          </button>
          <button
            className="chip"
            aria-pressed={!soExperiencia}
            onClick={() => setSoExperiencia(false)}
          >
            Todos os tipos
          </button>
          <span className="escopo-nota">
            {base.oportunidades.length} oportunidades
            {base.foraDoTipo
              ? ` · ${base.foraDoTipo} lançamento${base.foraDoTipo > 1 ? "s" : ""} de outro tipo fora`
              : ""}
          </span>
        </div>
      </div>

      <nav className="abas" role="tablist" aria-label="Leitura">
        {ABAS.map((aba) => (
          <button
            key={aba.id}
            className="aba"
            role="tab"
            aria-selected={visao === aba.id}
            onClick={() => setVisao(aba.id)}
          >
            {aba.rotulo}
          </button>
        ))}
      </nav>

      <p className="regua">
        <b>A data que manda nesta visão: {abaAtual.data}.</b>{" "}
        {visao === "coorte"
          ? "O fechamento credita o mês em que a experiência começou, por mais tempo que leve: voucher em janeiro e contrato em julho é venda de janeiro, uma venda tardia. Não há prazo aqui, então mês nenhum fecha de vez — a coorte só troca de dono quando a pessoa faz uma experiência nova."
          : visao === "mes"
          ? "Quem tinha voucher em pé em algum dia do mês, mais os contratos assinados no mês. Serve para medir volume e carga da equipe, não para comparar meses: um mês herda voucher do anterior."
          : `O dia em que a venda foi lançada e paga, que não é o dia em que o acesso do plano começa. Fecha o mês e congela — nunca é recalculada. Aqui sim vale a janela: venda até ${JANELA_CREDITO_DIAS} dias depois do fim da vigência é comissão de voucher, e o crédito vai para o treinador web do voucher mais recente antes dela. Passou disso é venda nova — continua na lista, porque alguém vendeu, mas não é comissionada como voucher.`}
      </p>

      {visao === "coorte" ? (
        <>
          <div className="metricas">
            <div>
              <span className="n">{totalDaBase.pessoas}</span>
              <span className="rot">
                pessoas de {rotuloDoMes(base.meses[0])} a {rotuloDoMes(base.meses[base.meses.length - 1])}
              </span>
            </div>
            <div className="conv">
              <span className="n">{porcento(totalDaBase.conversao)}</span>
              <span className="rot">
                de conversão — {totalDaBase.fecharam} fecharam plano
              </span>
            </div>
            <div>
              <span className="n">{totalDaBase.treinosMedia?.toFixed(1) ?? "—"}</span>
              <span className="rot">dias de treino por pessoa, somando a vigência</span>
            </div>
            <div className={totalDaBase.tardias ? "alerta" : ""}>
              <span className="n">{totalDaBase.tardias}</span>
              <span className="rot">
                {totalDaBase.tardias
                  ? `vendas tardias — fecharam mais de ${JANELA_CREDITO_DIAS} dias depois da vigência`
                  : "nenhuma venda tardia até agora"}
              </span>
            </div>
          </div>

          <div className="rolagem">
            <table>
              <thead>
                <tr>
                  <th>Coorte</th>
                  <th>Pessoas</th>
                  <th>Fecharam</th>
                  <th>Conversão</th>
                  <th>Vendas tardias</th>
                  <th>Treinos (média)</th>
                </tr>
              </thead>
              <tbody>
                {porMes.map((linha, indice) => {
                  // Subtotal fecha o trimestre assim que o último mês dele passa: é por
                  // onde se confere o relatório contra o que já foi apurado à mão.
                  const proximo = porMes[indice + 1];
                  const fechaTrimestre =
                    !proximo || trimestreDe(proximo.mes) !== trimestreDe(linha.mes);
                  const doTrimestre = trimestres.find((t) => t.id === trimestreDe(linha.mes));
                  const mesesDoTrimestre =
                    doTrimestre?.meses.filter((m) => base.meses.includes(m)) || [];
                  // Trimestre com um mês só repetiria a linha de cima; não vale a tinta.
                  const subtotal =
                    fechaTrimestre && mesesDoTrimestre.length > 1
                      ? totalCoorte(base, mesesDoTrimestre)
                      : null;

                  return (
                    <Fragment key={linha.mes}>
                      <tr>
                        <td className="mat">{rotuloDoMes(linha.mes)}</td>
                        <td>
                          <span className="freq">
                            <span className="num">{linha.pessoas}</span>
                            <span className="mini">
                              <i style={{ width: `${(linha.pessoas / maiorCoorte) * 100}%` }} />
                            </span>
                          </span>
                        </td>
                        <td>{linha.fecharam}</td>
                        <td className="conversao">{porcento(linha.conversao)}</td>
                        <td className={linha.tardias ? "aberta" : ""}>
                          {linha.tardias ? `${linha.tardias} de ${linha.fecharam}` : "—"}
                        </td>
                        <td>{linha.treinosMedia?.toFixed(1) ?? "—"}</td>
                      </tr>
                      {subtotal ? (
                        <tr className="subtotal">
                          <td className="mat">{doTrimestre?.rotulo}</td>
                          <td>
                            <span className="freq">
                              <span className="num">{subtotal.pessoas}</span>
                            </span>
                          </td>
                          <td>{subtotal.fecharam}</td>
                          <td className="conversao">{porcento(subtotal.conversao)}</td>
                          <td className={subtotal.tardias ? "aberta" : ""}>
                            {subtotal.tardias ? `${subtotal.tardias} de ${subtotal.fecharam}` : "—"}
                          </td>
                          <td>{subtotal.treinosMedia?.toFixed(1) ?? "—"}</td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {visao === "mes" ? (
        <div className="rolagem">
          <table>
            <thead>
              <tr>
                <th>Mês</th>
                <th>Vouchers em pé</th>
                <th>Iniciados no mês</th>
                <th>Contratos assinados</th>
                <th>Treinos da coorte</th>
              </tr>
            </thead>
            <tbody>
              {movimento
                .slice()
                .reverse()
                .map((linha) => (
                  <tr key={linha.mes}>
                    <td className="mat">
                      {rotuloDoMes(linha.mes)}
                      {linha.emCurso ? <span className="detalhe-cel">em curso</span> : null}
                    </td>
                    <td>{linha.emPe}</td>
                    <td>{linha.iniciados}</td>
                    <td className="conversao">{linha.contratos}</td>
                    <td>{linha.treinos}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {visao === "comissao" && trimestre ? (
        <>
          <div className="controles">
            <div className="grupo" role="group" aria-label="Trimestre do contrato">
              {trimestres.map((t) => (
                <button
                  key={t.id}
                  className="chip"
                  aria-pressed={trimestre.id === t.id}
                  onClick={() => setTrimestreEscolhido(t.id)}
                >
                  {t.rotulo}
                </button>
              ))}
            </div>
          </div>

          <div className="metricas">
            <div>
              <span className="n">{linhasDoTrimestre.length}</span>
              <span className="rot">
                contratos no trimestre — somados só para conferência; o que se paga é o mês
              </span>
            </div>
            <div className="conv">
              <span className="n">{linhasDoTrimestre.filter((l) => l.dentroDaJanela).length}</span>
              <span className="rot">
                comissão de voucher — assinados em até {JANELA_CREDITO_DIAS} dias do fim da
                vigência
              </span>
            </div>
            <div className={linhasDoTrimestre.some((l) => !l.dentroDaJanela) ? "alerta" : ""}>
              <span className="n">{linhasDoTrimestre.filter((l) => !l.dentroDaJanela).length}</span>
              <span className="rot">
                venda nova — passou dos {JANELA_CREDITO_DIAS} dias, não é comissionada como
                voucher
              </span>
            </div>
            <div>
              <span className="n">{comissaoPorTreinador(linhasDoTrimestre).length}</span>
              <span className="rot">treinadores com comissão de voucher no trimestre</span>
            </div>
          </div>

          {trimestre.meses.map((mes) => (
            <MesDeComissao
              key={mes}
              mes={mes}
              linhas={base.comissao.filter((l) => l.mes === mes)}
              foraDoRecorte={
                base.contratosForaDoRecorte.filter((c) => c.data.slice(0, 7) === mes).length
              }
            />
          ))}
        </>
      ) : null}

      <div className="metodo">
        <p>
          <b>A coorte não tem prazo; a comissão tem.</b> Toda venda é creditada à coorte do
          voucher mais recente que a pessoa começou antes do contrato, por mais tempo que leve —
          se passou dos {JANELA_CREDITO_DIAS} dias da vigência, é uma venda tardia, e é por isso
          que um mês antigo pode subir. Para a comissão, só é voucher o contrato assinado até{" "}
          {JANELA_CREDITO_DIAS} dias depois do fim da vigência; passou disso é venda nova, que
          continua na lista do mês mas não é comissionada como voucher.
        </p>
        <p>
          <b>A comissão usa a data da venda, não a do acesso.</b> A venda é lançada e paga num
          dia e o acesso ao plano pode começar semanas depois — quem vendeu em setembro recebe
          em setembro, mesmo que o aluno só entre em outubro. Enquanto o sync não trouxer o
          pagamento de uma venda, ela fica posicionada pelo início do acesso e a lista do mês
          avisa quantas estão assim.
        </p>
        <p>
          <b>Relançamento reinicia a coorte.</b> Quando a pessoa não consegue vir e a consultora
          lança de novo, vale o início do voucher mais recente. Lançamentos encadeados até{" "}
          {JANELA_CREDITO_DIAS} dias um do outro são a mesma oportunidade; com intervalo maior,
          a pessoa volta a contar como oportunidade nova.
        </p>
        <p>
          <b>Vigência de um dia não é voucher.</b> É o passe que a recepção lança para a pessoa
          passar na catraca no dia em que assina o contrato. São{" "}
          {base.passesDeAssinatura.length} lançamento
          {base.passesDeAssinatura.length === 1 ? "" : "s"} assim, fora das três contas — o
          contrato deles continua valendo, porque é dado da pessoa, não do lançamento.
        </p>
        <p>
          Lançamento excluído com justificativa fica fora das três visões. Treinos é a soma dos
          dias de catraca de todos os lançamentos da oportunidade, o mesmo critério da tabela
          cliente a cliente.
        </p>
      </div>
    </section>
  );
}

/** Um mês da comissão: a unidade que fecha e congela, por isso cada um tem o seu bloco. */
function MesDeComissao({
  mes,
  linhas,
  foraDoRecorte,
}: {
  mes: string;
  linhas: LinhaComissao[];
  foraDoRecorte: number;
}) {
  const porTreinador = comissaoPorTreinador(linhas);
  const semVenda = linhas.filter((l) => l.semDataDeVenda).length;

  return (
    <div className="mes-comissao">
      <h3>
        {nomeDoMes(mes)}
        <span className="cont">
          {linhas.filter((l) => l.dentroDaJanela).length} de voucher
          {linhas.some((l) => !l.dentroDaJanela)
            ? ` · ${linhas.filter((l) => !l.dentroDaJanela).length} venda nova`
            : ""}
        </span>
      </h3>

      {linhas.length === 0 ? (
        <p className="nota-fora">Nenhum contrato assinado neste mês.</p>
      ) : (
        <>
          <div className="rolagem">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Treinador creditado</th>
                  <th>Venda</th>
                  <th>Voucher de origem</th>
                  <th>Treinos na vigência</th>
                  <th>Plano</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha) => (
                  <tr key={linha.matricula} className={linha.dentroDaJanela ? "" : "venda-nova"}>
                    <td>
                      <span className="cliente-nome">{linha.nome}</span>
                      <span className="detalhe-cel">mat. {linha.matricula}</span>
                    </td>
                    <td className={linha.treinadorCreditado ? "treinador" : "sem"}>
                      {linha.treinadorCreditado || "sem vínculo"}
                      {linha.dentroDaJanela ? null : (
                        <span className="detalhe-cel">não comissionado como voucher</span>
                      )}
                      {linha.professorNoVoucher ? (
                        <span className="detalhe-cel">professor: {linha.professorNoVoucher}</span>
                      ) : null}
                    </td>
                    <td className="vig">
                      {dataCurta(linha.dataContrato)}
                      {linha.semDataDeVenda ? (
                        <span className="detalhe-cel">início do acesso</span>
                      ) : null}
                    </td>
                    <td className="vig">
                      {rotuloPlano(linha.origem.tipo)}
                      <span className="detalhe-cel">
                        {dataCurta(linha.origem.inicioPrimeiro)} – {dataCurta(linha.origem.fim)}
                      </span>
                      {linha.dentroDaJanela ? null : (
                        <span className="detalhe-cel aberta">
                          venda nova · {Math.round(linha.diasDepoisDaVigencia)} dias depois
                        </span>
                      )}
                    </td>
                    <td>{linha.treinos}</td>
                    <td className="vig">{linha.planoFechado || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="eyebrow">
            {porTreinador.map((t) => `${t.treinador} ${t.contratos}`).join(" · ")}
          </p>
        </>
      )}

      {semVenda ? (
        <p className="nota-fora">
          {semVenda === linhas.length ? "Todas as" : `${semVenda} das`} linhas deste mês ainda
          estão posicionadas pelo início do acesso ao plano, não pela data da venda: o sync
          ainda não trouxe o pagamento delas. Enquanto isso, o mês mistura as duas datas e
          algumas vendas podem estar no mês errado.
        </p>
      ) : null}

      {foraDoRecorte ? (
        <p className="nota-fora">
          Mais {foraDoRecorte} contrato{foraDoRecorte > 1 ? "s" : ""} no mês de quem não teve
          voucher neste recorte de tipo — não há voucher a creditar, então ficam fora da lista.
        </p>
      ) : null}
    </div>
  );
}
