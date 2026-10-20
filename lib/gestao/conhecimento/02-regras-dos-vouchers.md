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
| **Coorte** | início do voucher | mede a qualidade da experiência; o fechamento volta e credita o mês em que ela começou, então mês recente ainda sobe |
| **Mês corrente** | a vigência inteira | operação: quem esteve em pé no mês e quantos contratos saíram; não serve para comparar meses |
| **Comissão** | data do contrato | fecha o mês e **congela** — nunca recalcula, senão se pagaria duas vezes |

Os três desempates:

- **Janela de crédito de 45 dias.** Contrato assinado até 45 dias depois do fim da
  vigência é conversão daquele voucher; depois disso é venda nova e aparece só na
  comissão. Caso de referência: Eliza Castro, voucher em julho e contrato em 02/10.
- **A comissão vai para o treinador web do voucher mais recente antes do contrato** —
  quem estava com a pessoa na hora da decisão. Professor (PR) é acompanhamento, não
  crédito.
- **Relançamento reinicia a coorte.** Vale o início do voucher mais recente, e
  lançamentos encadeados até 45 dias um do outro são a mesma oportunidade; intervalo
  maior é oportunidade nova (Lucimara Fernandes tem uma em maio e outra em julho, e o
  contrato de 09/08 pertence só à de julho, embora a coluna `data_contrato` esteja
  gravada nas três linhas dela).

Duas coisas que a leitura precisa saber: a régua conferida à mão no 3º trimestre é só
sobre **7 e 15 dias** (87 pessoas, 31 fechamentos, 36%); e **vigência de um dia só não é
voucher** — é o passe de catraca do dia da assinatura, fica fora das contas.

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
