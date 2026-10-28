# Regras dos vouchers

## Os tipos

| Tipo | Duração | Quando é oferecido |
|---|---|---|
| **Experiência 7 dias** | 7 dias corridos | Depois do CRM, para quem tem perfil mas não se sentiu seguro em fechar |
| **Voucher 15 dias** | 15 dias | Padrão de campanha e do Missão Salva-Vidas; é 60% de tudo que se concede |
| **Voucher 30 dias** | 30 dias | Ações específicas (a de maio, do Dia das Mães, foi assim) |
| **Voucher 3 meses** | 90 dias | Raríssimo, caso a caso |

## Relançamento faz parte do processo

Quando a pessoa não consegue vir por imprevisto, a consultora **lança o voucher de novo**
para que ela viva a experiência. Isso é intencional e não deve ser tratado como erro nem
como duplicidade.

Consequência para qualquer número: **conversão se conta por pessoa, nunca por
lançamento**. Uma pessoa com três janelas e um contrato é uma conversão, não três.

## As três leituras, e qual data manda em cada uma

Decidido com o Fernando em 20/10/2026, depois de a lista de fechamentos do comercial não
bater com a do relatório — a diferença era só de régua. A regra que organiza tudo:
**toda métrica declara qual data está usando**. Estão no `/gestao`, na seção "Três
leituras do mesmo dado", e implementadas em `lib/gestao/visoes.ts`.

| Leitura | Data que manda | Para que serve |
|---|---|---|
| **Coorte** | início do voucher, **sem prazo** | mede a qualidade da experiência; o fechamento volta e credita o mês em que ela começou, por mais tempo que leve — então mês nenhum fecha de vez |
| **Mês corrente** | a vigência inteira | operação: quem esteve em pé no mês e quantos contratos saíram; não serve para comparar meses |
| **Comissão** | data da **venda** | fecha o mês e **congela** — nunca recalcula, senão se pagaria duas vezes |

Os três desempates:

- **Os 45 dias são da comissão, não da coorte** (corrigido pelo Fernando em 21/10/2026,
  depois de uma primeira versão que aplicava a janela nas duas). Na **coorte não existe
  prazo**: toda venda credita o mês do voucher mais recente que a pessoa iniciou antes do
  contrato, quanto tempo for — voucher em janeiro, experiência feita, volta em julho e
  fecha, é venda de janeiro, uma **venda tardia**. Na **comissão**, contrato até 45 dias
  depois do fim da vigência é comissão de voucher; passou disso é **venda nova**, que
  continua na lista do mês mas não é comissionada como voucher, nem para o treinador nem
  para o comercial. Caso de referência: Eliza Castro, voucher até 30/07 e contrato em
  02/10, 64 dias depois — conversão da coorte de julho, venda nova na comissão de outubro.
- **A comissão paga pela data da venda, não pela do acesso** (definido pelo Fernando em
  21/10/2026: "o mais correto seria pegar a data de pagamento"). A venda é lançada e paga
  num dia — a casa cobra no ato — e o acesso ao plano pode começar semanas depois (Leila
  Candelária Osman: venda 16/09, acesso 02/10). Quem vendeu em setembro recebe em
  setembro. A data sai do `dataLancamento` do contrato na Pacto
  (`GET /adm-core-ms/contratos/{codigo}`, que o sync já busca) e mora na coluna
  `data_venda`; a antiga `data_contrato` continua guardando o início do acesso, que ainda
  serve para saber quando o aluno entra de fato.
- **A comissão vai para o treinador web do voucher mais recente antes da venda** —
  quem estava com a pessoa na hora da decisão. Professor (PR) é acompanhamento, não
  crédito.
- **Relançamento reinicia a coorte.** Vale o início do voucher mais recente, e
  lançamentos encadeados até 45 dias um do outro são a mesma oportunidade; intervalo
  maior é oportunidade nova (Lucimara Fernandes tem uma em maio e outra em julho, e o
  contrato de 09/08 pertence só à de julho, embora a coluna `data_contrato` esteja
  gravada nas três linhas dela).

Duas coisas que a leitura precisa saber: a régua conferida à mão no 3º trimestre é só
sobre **7 e 15 dias** (87 pessoas, 32 vendas, 37%, uma delas tardia); e **vigência de um
dia só não é voucher** — é o passe de catraca do dia da assinatura, fica fora das contas.

## O que a duração real quer dizer

A duração vale pelo período de acesso na Pacto, não pelo que está escrito no nome do
cadastro. Os dois divergem com frequência: há cadastro escrito "voucher 15 dias" com 7
ou com 30 dias liberados. Sempre que houver divergência, a régua é o período de acesso —
e a divergência em si é um problema de cadastro a ser corrigido.

## Falhas conhecidas de processo

- **Voucher prometido e não lançado** — cadastro com "voucher" no nome, treino montado,
  e nenhum período PL na Pacto. A pessoa treina, some do relatório e ninguém cobra o
  follow-up. Aconteceu com Andréa Morikawa, Rosana Fonseca, Simone Camillo e Miguel
  Cassio Castro entre julho e agosto de 2026.
- **Voucher sem ninguém acompanhando** — sem TW *nem PR* no cadastro, ninguém é dono da
  experiência daquela pessoa. Em maio-agosto de 2026 eram 25 dos 133 vouchers de 15 dias.
  Atenção ao ler isso: a Pacto tem dois vínculos de acompanhamento técnico, TW
  (treinador web) e PR (professor, que às vezes é a fisioterapeuta). Quem tem só PR
  **está acompanhado** e não é um voucher órfão — até outubro de 2026 o sync só lia TW
  e essas pessoas apareciam na lista por engano, mandando a recepção atrás de um vínculo
  que já existia (caso Camile Oliveira, com PR da Victoria Schirmer).
- **Cadastro duplicado** — a mesma pessoa em dois cadastros, o voucher indo para um e o
  acompanhamento para outro (caso Isabella Craveiri / Craveiro).
- **Cadastro só com primeiro nome** — impossível conferir depois; três cadastros
  "Janaina" no período.

## Custo de um voucher

O custo direto é **dia de academia liberado**: 7, 15 ou 30 dias por pessoa. O custo
indireto é o tempo da equipe — CRM, ATM, montagem de treino e follow-up. Um voucher que
nunca teve entrada na catraca gastou o tempo do CRM e da montagem sem gerar experiência
nenhuma: é o pior resultado possível, pior do que não ter concedido.

## Alertas do dia para o treinador e a consultora (lib/gestao/alertas.ts)

O n8n (`Gestao Vouchers — Alerta diario (DM)`) chama `/api/gestao/alertas` todo dia às 9h. Cada aviso
sai uma vez por voucher, tipo e destinatário (tabela `freepass_alertas`), e só enquanto o voucher corre.

| Tipo | Quando | Quem recebe |
|---|---|---|
| `sem_atm` | 2º dia de vigência sem ATM com dia combinado (todo voucher passa pela ATM) | só o canal #falhas-do-sistema |
| `combinado_longe` | o dia combinado na ATM fica mais de 3 dias depois do início da vigência (ou depois do fim do voucher); sai assim que aparece, até o dia combinado | só a consultora, para tentar antecipar |
| `faltou_1` | 1 dia depois do dia combinado na ATM, sem acesso desde esse dia | treinador |
| `faltou_3` | 3 dias depois, ainda sem acesso | treinador |
| `faltou_5` | 5 dias depois, ainda sem acesso | treinador e consultora |
| `metade` | voucher de 15 e de 30 dias: metade da vigência, para quem veio (no dia combinado ou depois) | treinador; também a consultora se faltou no combinado e voltou depois |
| `status_7` | experiência de 7 dias: 7º dia, para quem veio | treinador |
| `metade` | experiência de 7 dias: metade, só para quem faltou no combinado e voltou depois | treinador e consultora |

O dia combinado vem do app da ATM (`POST /api/atm-sessoes/proximo-treino/`, etapa "Próximo treino"),
com a variável `ATM_INGEST_SECRET` (mesmo valor do app da ATM). Sem ela, nenhum aviso do dia combinado sai. Só vale o combinado que cai dentro da vigência
(o combinado depois do fim do voucher gera só o `combinado_longe`, não o `sem_atm`). "Veio" = último acesso no dia
combinado ou depois: o sync guarda só o último acesso, não o histórico dia a dia.
Regras decididas pelo Fernando em 27/10/2026. No mesmo dia saíram os avisos `travou` (metade com 0 ou 1 treino)
e `regrediu` (3+ treinos e 4 dias sem vir): o status da metade cobre esse momento.
