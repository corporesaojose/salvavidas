"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DadosGestao, Voucher } from "@/lib/gestao/dados";
import { PENDENCIAS, TOTAL_PENDENCIAS } from "@/lib/gestao/pendencias";

const MESES: Record<string, string> = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
};

const TIPOS = [
  { plano: "Experiencia 7 dias", rotulo: "Experiência 7 dias", curto: "7 dias" },
  { plano: "Voucher 15 dias", rotulo: "Voucher 15 dias", curto: "15 dias" },
  { plano: "Voucher 30 dias", rotulo: "Voucher 30 dias", curto: "30 dias" },
];

function dataBr(iso: string | null) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

function mesDe(iso: string) {
  return iso.slice(0, 7);
}

function rotuloMes(chave: string) {
  const [ano, mes] = chave.split("-");
  return `${MESES[mes] || mes}${ano !== String(new Date().getFullYear()) ? "/" + ano.slice(2) : ""}`;
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] || "") + (partes[partes.length - 1]?.[0] || "")).toUpperCase();
}

/**
 * Uma linha do relatório. Quando a mesma pessoa recebeu o voucher mais de uma vez,
 * `lancamentos` guarda todos e os campos de exibição vêm do mais recente.
 */
type Linha = Voucher & { chaves: string[]; lancamentos: Voucher[] };

function comoLinha(v: Voucher): Linha {
  return { ...v, chaves: [v.chave], lancamentos: [v] };
}

/** Entre dois lançamentos da mesma pessoa, o contrato que vale é o mais recente fechado. */
function contratoQueVale(a: Voucher, b: Voucher): Voucher | null {
  if (a.fechou && b.fechou) return (b.dataContrato || "") >= (a.dataContrato || "") ? b : a;
  if (a.fechou) return a;
  if (b.fechou) return b;
  return null;
}

/**
 * Quem teve mais de um período lançado vira uma linha só: exibe o último lançamento,
 * soma os acessos de todos e conta uma única conversão.
 */
function consolidarPorPessoa(lista: Voucher[]): Linha[] {
  const mapa = new Map<string, Linha>();

  lista.forEach((v) => {
    const atual = mapa.get(v.matricula);
    if (!atual) {
      mapa.set(v.matricula, comoLinha(v));
      return;
    }
    const ultimo = v.inicioVigencia >= atual.inicioVigencia ? v : atual;
    const contrato = contratoQueVale(atual, v);
    mapa.set(v.matricula, {
      ...ultimo,
      frequencia: atual.frequencia + v.frequencia,
      fechou: Boolean(contrato),
      planoFechado: contrato ? contrato.planoFechado : null,
      dataContrato: contrato ? contrato.dataContrato : null,
      chaves: [...atual.chaves, v.chave],
      lancamentos: [...atual.lancamentos, v].sort((x, y) =>
        x.inicioVigencia.localeCompare(y.inicioVigencia)
      ),
    });
  });

  return Array.from(mapa.values()).sort(
    (a, b) => a.inicioVigencia.localeCompare(b.inicioVigencia) || a.nome.localeCompare(b.nome)
  );
}

function Avatar({ voucher, tamanho }: { voucher: Voucher; tamanho?: "grande" }) {
  const classe = `avatar${tamanho === "grande" ? " avatar-grande" : ""}`;
  if (voucher.fotoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={classe} src={voucher.fotoUrl} alt="" loading="lazy" />;
  }
  return (
    <span className={`iniciais${tamanho === "grande" ? " avatar-grande" : ""}`} aria-hidden="true">
      {iniciais(voucher.nome)}
    </span>
  );
}

function Barras({ grupos }: { grupos: { rot: string; total: number; fechou: number }[] }) {
  const escala = Math.max(...grupos.map((g) => g.total), 1);
  return (
    <div className="barras">
      {grupos.map((g) => (
        <div className="barra" key={g.rot}>
          <span className="lab">{g.rot}</span>
          <span className="trilho">
            <i className="total" style={{ width: `${(g.total / escala) * 100}%` }} />
            <i className="conv" style={{ width: `${(g.fechou / escala) * 100}%` }} />
          </span>
          <span className="val">
            <b>{Math.round((g.fechou / g.total) * 100)}%</b> · {g.fechou}/{g.total}
          </span>
        </div>
      ))}
    </div>
  );
}

type Dialogo =
  | { tipo: "excluir"; chave: string }
  | { tipo: "restaurar"; chave: string }
  | { tipo: "resolver"; id: string }
  | null;

export default function Relatorio({ dados, usuario }: { dados: DadosGestao; usuario: string }) {
  const router = useRouter();
  const [salvando, iniciarSalvamento] = useTransition();
  const [erroApi, setErroApi] = useState("");

  const [tipo, setTipo] = useState(TIPOS[1].plano);
  const [mes, setMes] = useState("todos");
  const [filtro, setFiltro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [ficha, setFicha] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  const anotacoesPorChave = useMemo(() => {
    const mapa: Record<string, DadosGestao["anotacoes"]> = {};
    dados.anotacoes.forEach((a) => {
      (mapa[a.chave] = mapa[a.chave] || []).push(a);
    });
    return mapa;
  }, [dados.anotacoes]);

  const exclusaoPorChave = useMemo(() => {
    const mapa: Record<string, DadosGestao["exclusoes"][number]> = {};
    dados.exclusoes.forEach((e) => { mapa[e.chave] = e; });
    return mapa;
  }, [dados.exclusoes]);

  const pendenciaPorId = useMemo(() => {
    const mapa: Record<string, DadosGestao["pendencias"][number]> = {};
    dados.pendencias.forEach((p) => { mapa[p.id] = p; });
    return mapa;
  }, [dados.pendencias]);

  const validos = useMemo(
    () => dados.vouchers.filter((v) => !exclusaoPorChave[v.chave]),
    [dados.vouchers, exclusaoPorChave]
  );

  const meses = useMemo(() => {
    const set = new Set(validos.map((v) => mesDe(v.inicioVigencia)));
    return Array.from(set).sort();
  }, [validos]);

  async function registrar(corpo: Record<string, unknown>) {
    setErroApi("");
    try {
      const resposta = await fetch("/api/gestao/registros/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const json = await resposta.json();
      if (!resposta.ok) {
        setErroApi(json.erro || "Não consegui salvar.");
        return false;
      }
      iniciarSalvamento(() => router.refresh());
      return true;
    } catch {
      setErroApi("Falha de conexão — o registro não foi salvo.");
      return false;
    }
  }

  /* ---------- números ---------- */

  const pessoas = new Set(validos.map((v) => v.matricula)).size;
  const pessoasFecharam = new Set(validos.filter((v) => v.fechou).map((v) => v.matricula)).size;
  const somaFreq = validos.reduce((s, v) => s + v.frequencia, 0);
  const semEntrada = validos.filter((v) => v.frequencia === 0).length;

  const doTipo = validos.filter((v) => v.plano === tipo);
  const porPessoa = consolidarPorPessoa(doTipo);

  const fecharamTipo = porPessoa.filter((p) => p.fechou).length;
  const mediaDias = porPessoa.length
    ? porPessoa.reduce((s, p) => s + p.frequencia, 0) / porPessoa.length
    : 0;
  const zerosTipo = porPessoa.filter((p) => p.frequencia === 0).length;
  const relancamentos = porPessoa.filter((p) => p.lancamentos.length > 1).length;

  const faixas = [
    { rot: "nenhum dia", ok: (f: number) => f === 0 },
    { rot: "1 a 2 dias", ok: (f: number) => f >= 1 && f <= 2 },
    { rot: "3 a 5 dias", ok: (f: number) => f >= 3 && f <= 5 },
    { rot: "6 ou mais", ok: (f: number) => f >= 6 },
  ];

  /* ---------- tabela ---------- */

  const mostrandoExcluidos = filtro === "excluidos";
  // Excluídos aparecem lançamento a lançamento — a exclusão é por lançamento, não por pessoa.
  const baseTabela = mostrandoExcluidos
    ? dados.vouchers.filter((v) => v.plano === tipo && exclusaoPorChave[v.chave]).map(comoLinha)
    : porPessoa;

  const termo = busca.toLowerCase();
  const visiveis = baseTabela.filter((v) => {
    if (mes !== "todos" && mesDe(v.inicioVigencia) !== mes) return false;
    if (filtro === "fechou" && !v.fechou) return false;
    if (filtro === "zero" && v.frequencia !== 0) return false;
    if (filtro === "anotado" && !v.chaves.some((c) => (anotacoesPorChave[c] || []).length))
      return false;
    if (termo && !`${v.nome} ${v.matricula} ${v.treinadorWeb || ""}`.toLowerCase().includes(termo))
      return false;
    return true;
  });

  const maxFreq = Math.max(...baseTabela.map((v) => v.frequencia), 1);
  const excluidosNoTipo = dados.vouchers.filter(
    (v) => v.plano === tipo && exclusaoPorChave[v.chave]
  ).length;

  const voucherDaFicha = ficha
    ? baseTabela.find((v) => v.chave === ficha) ||
      dados.vouchers.filter((v) => v.chave === ficha).map(comoLinha)[0] ||
      null
    : null;

  /* ---------- checklist ---------- */

  const resolvidas = Object.keys(pendenciaPorId).length;
  const pctResolvido = Math.round((resolvidas / TOTAL_PENDENCIAS) * 100);

  const tipoAtual = TIPOS.find((t) => t.plano === tipo) || TIPOS[1];

  return (
    <main className="gestao">
      <div className="page">
        <header>
          <div className="topo-linha">
            <span className="eyebrow">Corpore Training Gym · Free pass</span>
            <span className="sessao">
              {usuario}
              <button
                className="sair"
                onClick={async () => {
                  await fetch("/api/gestao/login/", { method: "DELETE" });
                  router.refresh();
                }}
              >
                sair
              </button>
            </span>
          </div>
          <h1>
            {pessoas} pessoas ganharam acesso.
            <br />
            <span className="amarelo">{pessoasFecharam} fecharam plano.</span>
          </h1>
          <p>
            Cada linha é um cliente com voucher lançado na Pacto, com a frequência real registrada
            na catraca durante a vigência e o contrato fechado depois dele. Quem recebeu o passe
            mais de uma vez aparece uma vez só — com a vigência do último lançamento e a soma dos
            acessos de todos —, e conta como uma conversão só.
          </p>
          <p className="fonte">
            Fonte: API Pacto (período de acesso, catraca, contratos e vínculos)
            {dados.atualizadoEm ? ` · dados atualizados em ${dados.atualizadoEm}` : ""}
          </p>
        </header>

        {dados.vouchers.length === 0 ? (
          <section className="vazio-total">
            <h2>Nenhum voucher carregado ainda</h2>
            <p>
              O relatório enche quando a rotina do n8n rodar a varredura da Pacto e enviar os dados
              para <code>/api/gestao/sync</code>.
            </p>
          </section>
        ) : null}

        <section className="placar" aria-label="Leitura rápida">
          <div>
            <span className="n">{pessoas}</span>
            <span className="rot">
              pessoas receberam voucher — {validos.length} vouchers lançados
            </span>
          </div>
          <div className="destaque">
            <span className="n">
              {pessoasFecharam}
              <small> de {pessoas}</small>
            </span>
            <span className="rot">
              fecharam plano — {pessoas ? Math.round((pessoasFecharam / pessoas) * 100) : 0}% de
              conversão
            </span>
          </div>
          <div>
            <span className="n">{validos.length ? (somaFreq / validos.length).toFixed(1) : "0"}</span>
            <span className="rot">dias de treino em média por voucher</span>
          </div>
          <div>
            <span className="n">{semEntrada}</span>
            <span className="rot">vouchers sem nenhuma entrada na catraca</span>
          </div>
        </section>

        {/* ---------- checklist ---------- */}
        <section className="tarefas">
          <div className="tarefas-topo">
            <div>
              <h2>Pendências da conferência</h2>
              <p className="sub">
                Nomes da lista do comercial que não têm voucher lançado no período. Cada um foi
                checado na Pacto — cadastro, treino montado, período de acesso e catraca. Marque
                conforme for resolvendo; fica salvo para toda a equipe.
              </p>
            </div>
            <div className={`medidor${resolvidas === TOTAL_PENDENCIAS ? " completo" : ""}`}>
              <div className="linha">
                <span className="n">{resolvidas}</span>
                <span className="de">de {TOTAL_PENDENCIAS} resolvidas</span>
              </div>
              <div className="trilho">
                <i style={{ width: `${pctResolvido}%` }} />
              </div>
              <span className="estado">
                {resolvidas === 0
                  ? "Nada resolvido ainda"
                  : resolvidas === TOTAL_PENDENCIAS
                  ? "Conferência fechada — tudo resolvido"
                  : `${pctResolvido}% da conferência resolvida`}
              </span>
            </div>
          </div>

          <div className="grupos">
            {PENDENCIAS.map((g) => {
              const feitas = g.itens.filter((i) => pendenciaPorId[i.id]).length;
              return (
                <div className={`grupo-tarefa${g.alta ? " alta" : ""}`} key={g.grupo}>
                  <h3>
                    {g.grupo} <span className="cont">{feitas}/{g.itens.length}</span>
                  </h3>
                  <p className="oque">{g.oque}</p>
                  {g.itens.map((item) => {
                    const feito = pendenciaPorId[item.id];
                    return (
                      <div className={`tarefa${feito ? " feita" : ""}`} key={item.id}>
                        <button
                          className="tick"
                          aria-pressed={Boolean(feito)}
                          aria-label={`${feito ? "Reabrir" : "Marcar como resolvido"}: ${item.quem}`}
                          onClick={() =>
                            feito
                              ? registrar({ acao: "reabrir", id: item.id })
                              : setDialogo({ tipo: "resolver", id: item.id })
                          }
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </button>
                        <div>
                          <span className="quem">{item.quem}</span>
                          <span className="detalhe">{item.detalhe}</span>
                          {feito ? (
                            <span className="assinatura">
                              resolvido por {feito.autor} em {feito.em}
                              {feito.nota ? ` — ${feito.nota}` : ""}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------- abas ---------- */}
        <nav className="abas" role="tablist" aria-label="Tipo de voucher">
          {TIPOS.map((t) => (
            <button
              key={t.plano}
              className="aba"
              role="tab"
              aria-selected={tipo === t.plano}
              onClick={() => setTipo(t.plano)}
            >
              {t.rotulo}
              <span className="qtd">
                {new Set(validos.filter((v) => v.plano === t.plano).map((v) => v.matricula)).size}
              </span>
            </button>
          ))}
        </nav>

        <section className="painel">
          <div className="metricas">
            <div>
              <span className="n">{porPessoa.length}</span>
              <span className="rot">
                pessoas — {doTipo.length} vouchers lançados
                {relancamentos ? `, ${relancamentos} com relançamento` : ""}
              </span>
            </div>
            <div className="conv">
              <span className="n">
                {porPessoa.length ? Math.round((fecharamTipo / porPessoa.length) * 100) : 0}%
              </span>
              <span className="rot">
                de conversão — {fecharamTipo} das {porPessoa.length} fecharam plano
              </span>
            </div>
            <div>
              <span className="n">{mediaDias.toFixed(1)}</span>
              <span className="rot">dias de treino por pessoa, em média</span>
            </div>
            <div className={zerosTipo ? "alerta" : ""}>
              <span className="n">{zerosTipo}</span>
              <span className="rot">
                {zerosTipo === 0 ? "ninguém deixou de vir" : "nunca passaram na catraca"}
              </span>
            </div>
          </div>

          <div className="painel-grid">
            <div className="bloco">
              <h2>Mês a mês</h2>
              <Barras
                grupos={meses
                  .map((m) => {
                    const doMes = porPessoa.filter((v) => mesDe(v.inicioVigencia) === m);
                    return {
                      rot: rotuloMes(m),
                      total: doMes.length,
                      fechou: doMes.filter((v) => v.fechou).length,
                    };
                  })
                  .filter((g) => g.total > 0)}
              />
              <div className="legenda">
                <span><i style={{ background: "var(--accent-wash)" }} /> clientes</span>
                <span><i style={{ background: "var(--won)" }} /> fecharam plano</span>
              </div>
            </div>

            <div className="bloco">
              <h2>Conversão por dias treinados</h2>
              <Barras
                grupos={faixas
                  .map((f) => {
                    const naFaixa = porPessoa.filter((v) => f.ok(v.frequencia));
                    return {
                      rot: f.rot,
                      total: naFaixa.length,
                      fechou: naFaixa.filter((v) => v.fechou).length,
                    };
                  })
                  .filter((g) => g.total > 0)}
              />
              <div className="legenda">
                <span><i style={{ background: "var(--accent-wash)" }} /> clientes na faixa</span>
                <span><i style={{ background: "var(--won)" }} /> fecharam plano</span>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- tabela ---------- */}
        <section className="tabela-bloco">
          <h2>
            {tipoAtual.rotulo} — {mostrandoExcluidos ? "lançamentos excluídos" : "cliente a cliente"}
          </h2>

          <div className="controles">
            <div className="grupo" role="group" aria-label="Filtrar por mês">
              <button
                className="chip"
                aria-pressed={mes === "todos"}
                onClick={() => setMes("todos")}
              >
                Todos
              </button>
              {meses.map((m) => (
                <button
                  key={m}
                  className="chip"
                  aria-pressed={mes === m}
                  onClick={() => setMes(m)}
                >
                  {rotuloMes(m)}
                </button>
              ))}
            </div>
            <div className="grupo" role="group" aria-label="Filtrar por resultado">
              {[
                { id: "fechou", rot: "Fechou plano" },
                { id: "zero", rot: "Nunca veio" },
                { id: "anotado", rot: "Com anotação" },
                { id: "excluidos", rot: "Excluídos" },
              ].map((f) => (
                <button
                  key={f.id}
                  className="chip"
                  aria-pressed={filtro === f.id}
                  onClick={() => setFiltro(filtro === f.id ? null : f.id)}
                >
                  {f.rot}
                </button>
              ))}
            </div>
            <input
              type="search"
              placeholder="Buscar cliente, matrícula ou treinador"
              aria-label="Buscar"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="rolagem">
            <table>
              <thead>
                <tr>
                  <th>Matrícula</th>
                  <th>Cliente</th>
                  <th>Treinador web</th>
                  <th>Vigência</th>
                  <th>Frequência</th>
                  <th>Fechou plano</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visiveis.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="vazio">Nenhum cliente com esses filtros.</td>
                  </tr>
                ) : (
                  visiveis.map((v) => {
                    const notas = v.chaves.flatMap((c) => anotacoesPorChave[c] || []);
                    const fora = Boolean(exclusaoPorChave[v.chave]);
                    return (
                      <tr key={v.chave} className={`${v.fechou ? "fechou " : ""}${fora ? "excluida" : ""}`}>
                        <td className="mat">{v.matricula}</td>
                        <td>
                          <span className="cliente">
                            <Avatar voucher={v} />
                            <span>
                              <span className="cliente-nome">{v.nome}</span>
                              {fora ? <span className="anotado">excluída da conta</span> : null}
                            </span>
                          </span>
                        </td>
                        <td className={v.treinadorWeb ? "treinador" : "sem"}>
                          {v.treinadorWeb || "sem vínculo"}
                        </td>
                        <td className="vig">
                          {dataBr(v.inicioVigencia)} – {dataBr(v.fimVigencia)}
                          {v.lancamentos.length > 1 ? (
                            <span className="detalhe-cel">
                              último de {v.lancamentos.length} períodos
                            </span>
                          ) : null}
                        </td>
                        <td>
                          <span
                            className={v.frequencia === 0 ? "freq zero" : "freq"}
                            title={
                              v.lancamentos.length > 1
                                ? v.lancamentos
                                    .map(
                                      (l) =>
                                        `${dataBr(l.inicioVigencia)}–${dataBr(l.fimVigencia)}: ${l.frequencia}`
                                    )
                                    .join(" · ")
                                : undefined
                            }
                          >
                            <span className="num">{v.frequencia}</span>
                            <span className="mini">
                              <i style={{ width: `${(v.frequencia / maxFreq) * 100}%` }} />
                            </span>
                          </span>
                        </td>
                        <td>
                          {v.fechou ? (
                            <>
                              <span className="pill sim">Fechou</span>
                              <span className="detalhe-cel">
                                {v.planoFechado} · {dataBr(v.dataContrato)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="pill nao">Não</span>
                              <span className="detalhe-cel">{v.situacaoAtual}</span>
                            </>
                          )}
                        </td>
                        <td>
                          <span className="acoes">
                            <button
                              className={`icone${notas.length ? " tem-nota" : ""}`}
                              title="Ficha e anotações"
                              aria-label={`Abrir ficha de ${v.nome}`}
                              onClick={() => setFicha(v.chave)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.8L3 21l1.9-5a8.4 8.4 0 0 1-.8-3.6 8.4 8.4 0 0 1 8.4-8.4h.5a8.4 8.4 0 0 1 8 8Z" />
                              </svg>
                              {notas.length ? <span className="badge">{notas.length}</span> : null}
                            </button>
                            <button
                              className="icone"
                              title={fora ? "Restaurar lançamento" : "Excluir com justificativa"}
                              aria-label={`${fora ? "Restaurar" : "Excluir"} lançamento de ${v.nome}`}
                              onClick={() =>
                                setDialogo({ tipo: fora ? "restaurar" : "excluir", chave: v.chave })
                              }
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" />
                              </svg>
                            </button>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <p className="eyebrow">
            {visiveis.length} de {baseTabela.length}{" "}
            {mostrandoExcluidos ? "lançamentos" : "clientes"} de {tipoAtual.curto} ·{" "}
            {visiveis.filter((v) => v.fechou).length} fecharam plano
            {excluidosNoTipo && !mostrandoExcluidos
              ? ` · ${excluidosNoTipo} excluído${excluidosNoTipo > 1 ? "s" : ""} fora da conta`
              : ""}
          </p>
          {erroApi ? <p className="erro-form">{erroApi}</p> : null}
          {salvando ? <p className="estado-db">salvando…</p> : null}
        </section>
      </div>

      {/* ---------- ficha lateral ---------- */}
      {voucherDaFicha ? (
        <Ficha
          voucher={voucherDaFicha}
          anotacoes={voucherDaFicha.chaves
            .flatMap((c) => anotacoesPorChave[c] || [])
            .sort((a, b) => a.id - b.id)}
          exclusao={exclusaoPorChave[voucherDaFicha.chave]}
          onFechar={() => setFicha(null)}
          onAnotar={(texto) => registrar({ acao: "anotar", chave: voucherDaFicha.chave, texto })}
        />
      ) : null}

      {/* ---------- diálogos ---------- */}
      {dialogo ? (
        <DialogoAcao
          dialogo={dialogo}
          vouchers={dados.vouchers}
          onFechar={() => setDialogo(null)}
          onConfirmar={async (extra) => {
            const ok = await registrar(
              dialogo.tipo === "excluir"
                ? { acao: "excluir", chave: dialogo.chave, justificativa: extra }
                : dialogo.tipo === "restaurar"
                ? { acao: "restaurar", chave: dialogo.chave }
                : { acao: "resolver", id: dialogo.id, nota: extra }
            );
            if (ok) setDialogo(null);
          }}
        />
      ) : null}
    </main>
  );
}

/* ---------- ficha lateral ---------- */

function Ficha({
  voucher,
  anotacoes,
  exclusao,
  onFechar,
  onAnotar,
}: {
  voucher: Linha;
  anotacoes: DadosGestao["anotacoes"];
  exclusao?: DadosGestao["exclusoes"][number];
  onFechar: () => void;
  onAnotar: (texto: string) => Promise<boolean>;
}) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");

  function campo(rotulo: string, valor: string | null) {
    return (
      <>
        <dt>{rotulo}</dt>
        {valor ? <dd>{valor}</dd> : <dd className="vazio-campo">sem vínculo</dd>}
      </>
    );
  }

  return (
    <>
      <div className="sombra-fundo" onClick={onFechar} />
      <aside className="gaveta" role="dialog" aria-label={`Ficha de ${voucher.nome}`}>
        <div className="gaveta-topo">
          <Avatar voucher={voucher} tamanho="grande" />
          <div>
            <h2>{voucher.nome}</h2>
            <span className="mat">
              mat. {voucher.matricula} · {voucher.situacaoAtual}
            </span>
          </div>
          <button className="fechar" aria-label="Fechar" onClick={onFechar}>×</button>
        </div>

        <div className="gaveta-corpo">
          {exclusao ? (
            <div className="aviso-excluida">
              <strong>Excluída da conta</strong>
              {exclusao.justificativa}
              <span className="detalhe"> — {exclusao.autor}, {exclusao.em}</span>
            </div>
          ) : null}

          <div className="secao-gaveta">
            <h3>Equipe vinculada</h3>
            <dl className="ficha">
              {campo("Treinador web", voucher.treinadorWeb)}
              {campo("Coordenador", voucher.coordenador)}
              {campo("Consultora", voucher.consultora)}
            </dl>
          </div>

          <div className="secao-gaveta">
            <h3>{voucher.lancamentos.length > 1 ? "Vouchers deste cliente" : "Este voucher"}</h3>
            <dl className="ficha">
              {campo("Voucher", voucher.plano)}
              {campo(
                voucher.lancamentos.length > 1 ? "Último período" : "Vigência",
                `${dataBr(voucher.inicioVigencia)} a ${dataBr(voucher.fimVigencia)}`
              )}
              {campo(
                "Frequência",
                `${voucher.frequencia} ${voucher.frequencia === 1 ? "dia" : "dias"} de treino${
                  voucher.lancamentos.length > 1
                    ? ` — soma de ${voucher.lancamentos.length} períodos`
                    : ""
                }`
              )}
              {campo(
                "Fechou plano",
                voucher.fechou
                  ? `Sim — ${voucher.planoFechado} em ${dataBr(voucher.dataContrato)}`
                  : "Não"
              )}
              {campo("Lançado por", voucher.lancadoPor)}
            </dl>
            {voucher.lancamentos.length > 1 ? (
              <ul className="periodos">
                {voucher.lancamentos.map((l) => (
                  <li key={l.chave}>
                    <span>
                      {dataBr(l.inicioVigencia)} a {dataBr(l.fimVigencia)}
                    </span>
                    <b>
                      {l.frequencia} {l.frequencia === 1 ? "dia" : "dias"}
                    </b>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="secao-gaveta">
            <h3>Anotações</h3>
            <div className="notas">
              {anotacoes.length ? (
                anotacoes.map((n) => (
                  <div className="nota" key={n.id}>
                    <p>{n.texto}</p>
                    <span className="assina">{n.autor} · {n.em}</span>
                  </div>
                ))
              ) : (
                <p className="sem-nota">Nenhuma anotação ainda.</p>
              )}
            </div>

            <form
              className="registro"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!texto.trim()) {
                  setErro("Escreva a anotação antes de registrar.");
                  return;
                }
                setErro("");
                const ok = await onAnotar(texto.trim());
                if (ok) setTexto("");
              }}
            >
              <textarea
                placeholder="O que aconteceu com este cliente?"
                aria-label="Anotação"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
              {erro ? <p className="erro-form">{erro}</p> : null}
              <button className="acao" type="submit">Registrar</button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ---------- diálogos ---------- */

function DialogoAcao({
  dialogo,
  vouchers,
  onFechar,
  onConfirmar,
}: {
  dialogo: NonNullable<Dialogo>;
  vouchers: Voucher[];
  onFechar: () => void;
  onConfirmar: (extra: string) => void;
}) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");

  const voucher =
    dialogo.tipo === "resolver" ? null : vouchers.find((v) => v.chave === dialogo.chave);
  const item =
    dialogo.tipo === "resolver"
      ? PENDENCIAS.flatMap((g) => g.itens).find((i) => i.id === dialogo.id)
      : null;

  return (
    <>
      <div className="sombra-fundo" onClick={onFechar} />
      <div className="dialogo" role="dialog">
        {dialogo.tipo === "excluir" ? (
          <>
            <h2>Excluir do relatório</h2>
            <p>
              O lançamento de <b>{voucher?.nome}</b> ({dataBr(voucher?.inicioVigencia || null)}) sai
              das contas e da tabela. Nada é apagado na Pacto, e dá para restaurar depois.
            </p>
            <textarea
              placeholder="Justificativa — por que este lançamento não deve contar"
              aria-label="Justificativa"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </>
        ) : dialogo.tipo === "restaurar" ? (
          <>
            <h2>Restaurar lançamento</h2>
            <p>
              O voucher de <b>{voucher?.nome}</b> volta para as contas do relatório.
            </p>
          </>
        ) : (
          <>
            <h2>Resolver pendência</h2>
            <p>
              <b>{item?.quem}</b> — {item?.detalhe}
            </p>
            <textarea
              placeholder="O que foi feito? (opcional)"
              aria-label="O que foi feito"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </>
        )}

        {erro ? <p className="erro-form">{erro}</p> : null}

        <div className="botoes">
          <button className="acao secundaria" onClick={onFechar}>Cancelar</button>
          <button
            className="acao"
            onClick={() => {
              if (dialogo.tipo === "excluir" && texto.trim().length < 5) {
                setErro("A justificativa é obrigatória — ela fica registrada com a exclusão.");
                return;
              }
              onConfirmar(texto.trim());
            }}
          >
            {dialogo.tipo === "excluir" ? "Excluir" : dialogo.tipo === "restaurar" ? "Restaurar" : "Marcar resolvido"}
          </button>
        </div>
      </div>
    </>
  );
}
