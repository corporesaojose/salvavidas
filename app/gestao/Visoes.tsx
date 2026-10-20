"use client";

import { useMemo, useState } from "react";
import type { Voucher } from "@/lib/gestao/dados";
import { rotuloPlano } from "@/lib/gestao/planos";
import {
  JANELA_CREDITO_DIAS,
  TIPOS_EXPERIENCIA,
  coortePorMes,
  comissaoPorTreinador,
  mesesComContrato,
  movimentoMensal,
  prepararVisoes,
  totalCoorte,
  trimestresDisponiveis,
} from "@/lib/gestao/visoes";

/**
 * As três leituras de voucher na tela. Toda a regra está em lib/gestao/visoes.ts: aqui
 * não se decide nada, só se mostra — e cada visão declara, na própria interface, qual
 * data está usando, porque foi a confusão entre elas que gerou o problema.
 */

const MESES_CURTOS: Record<string, string> = {
  "01": "jan", "02": "fev", "03": "mar", "04": "abr", "05": "mai", "06": "jun",
  "07": "jul", "08": "ago", "09": "set", "10": "out", "11": "nov", "12": "dez",
};

function rotuloDoMes(mes: string) {
  const [ano, numero] = mes.split("-");
  return `${MESES_CURTOS[numero] || numero}/${ano.slice(2)}`;
}

function dataCurta(iso: string) {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

function porcento(valor: number | null) {
  return valor === null ? "—" : `${Math.round(valor)}%`;
}

type Visao = "coorte" | "mes" | "comissao";

const ABAS: { id: Visao; rotulo: string; data: string }[] = [
  { id: "coorte", rotulo: "Coorte do voucher", data: "início do voucher" },
  { id: "mes", rotulo: "Mês corrente", data: "a vigência inteira" },
  { id: "comissao", rotulo: "Comissão", data: "data do contrato" },
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
  const trimestres = useMemo(() => trimestresDisponiveis(base.meses), [base.meses]);
  const mesesDeContrato = useMemo(() => mesesComContrato(base.comissao), [base.comissao]);

  // O trimestre que abre é o do mês anterior ao corrente: o último com os três meses
  // já vividos. É a leitura que o Fernando pediu (jul a set, conferido à mão).
  const trimestrePadrao = useMemo(() => {
    const anterior = new Date(Date.parse(`${hoje}T00:00:00Z`));
    anterior.setUTCDate(1);
    anterior.setUTCMonth(anterior.getUTCMonth() - 1);
    const mes = anterior.toISOString().slice(0, 7);
    const achado = trimestres.find((t) => t.meses.includes(mes));
    return (achado || trimestres[trimestres.length - 1])?.id || "";
  }, [hoje, trimestres]);

  const [trimestreEscolhido, setTrimestreEscolhido] = useState<string | null>(null);
  const trimestre =
    trimestres.find((t) => t.id === (trimestreEscolhido || trimestrePadrao)) ||
    trimestres[trimestres.length - 1];
  const totalDoTrimestre = useMemo(
    () => (trimestre ? totalCoorte(base, trimestre.meses) : null),
    [base, trimestre]
  );

  const [mesEscolhido, setMesEscolhido] = useState<string | null>(null);
  const mesDaComissao = mesEscolhido || mesesDeContrato[0] || "";
  const linhasDoMes = base.comissao.filter((l) => l.mes === mesDaComissao);
  const foraDoRecorteNoMes = base.contratosForaDoRecorte.filter(
    (c) => c.data.slice(0, 7) === mesDaComissao
  );

  const abaAtual = ABAS.find((a) => a.id === visao) || ABAS[0];

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
          ? `O fechamento credita o mês em que a experiência começou, mesmo que o contrato venha depois — então mês recente ainda sobe. Relançamento reinicia a coorte, e o contrato precisa sair em até ${JANELA_CREDITO_DIAS} dias do fim da vigência.`
          : visao === "mes"
          ? "Quem tinha voucher em pé em algum dia do mês, mais os contratos assinados no mês. Serve para medir volume e carga da equipe, não para comparar meses: um mês herda voucher do anterior."
          : "Fecha o mês e congela — nunca é recalculada, não importa quando o voucher começou. O crédito vai para o treinador web do voucher mais recente da pessoa antes da assinatura."}
      </p>

      {visao === "coorte" && totalDoTrimestre ? (
        <>
          <div className="controles">
            <div className="grupo" role="group" aria-label="Trimestre">
              {trimestres.map((t) => (
                <button
                  key={t.id}
                  className="chip"
                  aria-pressed={trimestre?.id === t.id}
                  onClick={() => setTrimestreEscolhido(t.id)}
                >
                  {t.rotulo}
                </button>
              ))}
            </div>
          </div>

          <div className="metricas">
            <div>
              <span className="n">{totalDoTrimestre.pessoas}</span>
              <span className="rot">
                pessoas na coorte — {totalDoTrimestre.lancamentos} lançamentos
              </span>
            </div>
            <div className="conv">
              <span className="n">{porcento(totalDoTrimestre.conversao)}</span>
              <span className="rot">
                de conversão — {totalDoTrimestre.fecharam} fecharam plano
              </span>
            </div>
            <div>
              <span className="n">{totalDoTrimestre.treinosMedia?.toFixed(1) ?? "—"}</span>
              <span className="rot">dias de treino por pessoa, somando a vigência</span>
            </div>
            <div className={totalDoTrimestre.naJanela ? "alerta" : ""}>
              <span className="n">{totalDoTrimestre.naJanela}</span>
              <span className="rot">
                {totalDoTrimestre.naJanela
                  ? `ainda dentro dos ${JANELA_CREDITO_DIAS} dias — este número pode subir`
                  : `nenhuma na janela: o período está fechado`}
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
                  <th>Ainda na janela</th>
                  <th>Treinos (média)</th>
                </tr>
              </thead>
              <tbody>
                {porMes.map((linha) => {
                  const maior = Math.max(...porMes.map((l) => l.pessoas), 1);
                  return (
                    <tr
                      key={linha.mes}
                      className={trimestre?.meses.includes(linha.mes) ? "no-periodo" : ""}
                    >
                      <td className="mat">{rotuloDoMes(linha.mes)}</td>
                      <td>
                        <span className="freq">
                          <span className="num">{linha.pessoas}</span>
                          <span className="mini">
                            <i style={{ width: `${(linha.pessoas / maior) * 100}%` }} />
                          </span>
                        </span>
                      </td>
                      <td>{linha.fecharam}</td>
                      <td className="conversao">{porcento(linha.conversao)}</td>
                      <td className={linha.naJanela ? "aberta" : ""}>
                        {linha.naJanela ? `${linha.naJanela} podem fechar` : "fechada"}
                      </td>
                      <td>{linha.treinosMedia?.toFixed(1) ?? "—"}</td>
                    </tr>
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

      {visao === "comissao" ? (
        <>
          <div className="controles">
            <div className="grupo" role="group" aria-label="Mês do contrato">
              {mesesDeContrato.map((mes) => (
                <button
                  key={mes}
                  className="chip"
                  aria-pressed={mesDaComissao === mes}
                  onClick={() => setMesEscolhido(mes)}
                >
                  {rotuloDoMes(mes)}
                </button>
              ))}
            </div>
          </div>

          <div className="metricas">
            <div>
              <span className="n">{linhasDoMes.length}</span>
              <span className="rot">contratos assinados em {rotuloDoMes(mesDaComissao)}</span>
            </div>
            <div className="conv">
              <span className="n">{linhasDoMes.filter((l) => l.dentroDaJanela).length}</span>
              <span className="rot">
                conversão de voucher — dentro dos {JANELA_CREDITO_DIAS} dias
              </span>
            </div>
            <div>
              <span className="n">{linhasDoMes.filter((l) => !l.dentroDaJanela).length}</span>
              <span className="rot">
                venda nova — voucher antigo, fora da janela, mas o contrato é deste mês
              </span>
            </div>
            <div>
              <span className="n">{comissaoPorTreinador(linhasDoMes).length}</span>
              <span className="rot">treinadores com contrato no mês</span>
            </div>
          </div>

          <div className="rolagem">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Treinador creditado</th>
                  <th>Contrato</th>
                  <th>Voucher de origem</th>
                  <th>Treinos na vigência</th>
                  <th>Plano</th>
                </tr>
              </thead>
              <tbody>
                {linhasDoMes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="vazio">
                      Nenhum contrato assinado neste mês.
                    </td>
                  </tr>
                ) : (
                  linhasDoMes.map((linha) => (
                    <tr key={linha.matricula}>
                      <td>
                        <span className="cliente-nome">{linha.nome}</span>
                        <span className="detalhe-cel">mat. {linha.matricula}</span>
                      </td>
                      <td className={linha.treinadorCreditado ? "treinador" : "sem"}>
                        {linha.treinadorCreditado || "sem vínculo"}
                        {linha.professorNoVoucher ? (
                          <span className="detalhe-cel">
                            professor: {linha.professorNoVoucher}
                          </span>
                        ) : null}
                      </td>
                      <td className="vig">{dataCurta(linha.dataContrato)}</td>
                      <td className="vig">
                        {rotuloPlano(linha.origem.tipo)}
                        <span className="detalhe-cel">
                          {dataCurta(linha.origem.inicioPrimeiro)} – {dataCurta(linha.origem.fim)}
                          {linha.dentroDaJanela ? "" : " · venda nova"}
                        </span>
                      </td>
                      <td>{linha.treinos}</td>
                      <td className="vig">{linha.planoFechado || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {linhasDoMes.length ? (
            <p className="eyebrow">
              {comissaoPorTreinador(linhasDoMes)
                .map((t) => `${t.treinador} ${t.contratos}`)
                .join(" · ")}
            </p>
          ) : null}

          {foraDoRecorteNoMes.length ? (
            <p className="nota-fora">
              Mais {foraDoRecorteNoMes.length} contrato
              {foraDoRecorteNoMes.length > 1 ? "s" : ""} no mês de quem não teve voucher neste
              recorte de tipo — não há voucher a creditar, então ficam fora da lista.
            </p>
          ) : null}
        </>
      ) : null}

      <div className="metodo">
        <p>
          <b>Janela de crédito: {JANELA_CREDITO_DIAS} dias.</b> Um contrato só conta como
          conversão do voucher se for assinado até {JANELA_CREDITO_DIAS} dias depois do fim da
          vigência. Passou disso é venda nova e aparece só na comissão.
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
