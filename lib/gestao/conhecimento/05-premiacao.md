# Premiação da equipe por voucher

Duas trilhas independentes, com bolsos separados: uma premia **quem traz** a pessoa
(indicação, por link próprio) e outra premia **quem cuida** dela dentro da sala
(treinador vinculado). A mesma pessoa indicada pode pagar as duas — são esforços
diferentes, de gente diferente, em momentos diferentes da jornada.

A régua de todo o desenho é a mesma do resto do relatório: **o que converte é mudar de
faixa de frequência** (ver `03-referencias.md` — 1-2 treinos fecha 18,5%; 6+ fecha
52,3%). Por isso o ponto está grudado em acesso na catraca, não em esforço declarado.

## Como a escada funciona

A pontuação é **cumulativa**: cada degrau vencido é ponto no bolso e não se perde se a
pessoa parar ali. Quem chega ao fim somou o caminho todo.

E é **por pessoa, nunca por lançamento**. Relançar o voucher de quem teve imprevisto faz
parte do processo (`02-regras-dos-vouchers.md`), e cada degrau paga uma única vez por
pessoa indicada — a segunda janela não repontua a primeira.

## Trilha 1 — Indicação (qualquer pessoa da equipe)

Cada pessoa da equipe tem um link próprio do Missão Salva-Vidas. É o link que diz de
quem veio a indicação.

| # | Degrau | Pontos | Acumulado |
|---|---|---|---|
| 1 | Indicação válida (lead pelo link) | 10 | 10 |
| 2 | A pessoa agendou a ATM | 15 | 25 |
| 3 | A pessoa fez a ATM | 20 | 45 |
| 4 | Chegou a 6 acessos na catraca | 50 | 95 |
| 5 | Fechou plano | 150 | 245 |
| — | Bônus de resgate | 50 | — |

## Trilha 2 — Treinador (o TW vinculado ao voucher)

| # | Degrau | Pontos | Acumulado |
|---|---|---|---|
| 1 | ATM realizada | 10 | 10 |
| 2 | Voltou pelo menos uma vez depois da ATM | 15 | 25 |
| 3 | Chegou a 3 acessos | 20 | 45 |
| 4 | Chegou a 6 acessos | 30 | 75 |
| — | Bônus de resgate | 50 | — |

## Resgate — o degrau que não é automático

Resgate é trazer de volta quem já estava perdido: agendou a ATM e não veio, ou começou a
treinar e sumiu. Vale 50 pontos nas duas trilhas, e é o único degrau que depende de
alguém agir e registrar.

O sistema já sabe quem está perdido: são exatamente os casos que viram alerta
(`alertas.ts` — "travou" e "regrediu"). O resgate se conta assim:

1. O voucher entrou em estado de alerta (linha em `freepass_alertas`).
2. Alguém registrou uma anotação de resgate no `/gestao` — a anotação já grava o autor.
3. A pessoa **voltou de verdade**: houve acesso na catraca depois da anotação.

Sem o passo 3 não há ponto. Isso é proposital: o ponto paga o resultado, não a intenção
registrada. E como a anotação tem autor, o ponto vai para quem agiu — não para quem
por acaso indicou ou está vinculado.

## Cada degrau tem um dono

O desenho dos pontos segue a cadeia de responsabilidade real da casa:

| Passagem | De quem é o degrau |
|---|---|
| Lead → agendou a ATM | Comercial |
| Agendou → veio | Comercial (fazer vir) |
| ATM → primeiro treino | Treinador que fez a ATM |
| Primeiro treino → próximo | Treinadores da sala |
| 6 acessos → fechamento | Comercial, com o treinador segurando a frequência |

## O que invalida um ponto

- **Voucher excluído do relatório** (`freepass_exclusoes`) não pontua em nenhuma trilha.
- **Indicação não conta** quando o telefone já é de aluno ativo, quando o mesmo telefone
  já foi indicado nos últimos 90 dias por qualquer pessoa, quando o lead vem sem telefone
  válido, ou quando é o telefone da própria pessoa da equipe.
- **Primeiro link vence.** Se a pessoa chega por dois links, o crédito é do primeiro, com
  janela de 90 dias entre o clique e o formulário.
- **Janela de atribuição de 90 dias.** Fechamento que acontece mais de 90 dias depois do
  lead não paga o degrau 5 — senão o placar de um mês nunca fecha.
- **Correção manual** só pela coordenação e com justificativa registrada, do mesmo jeito
  que as exclusões do relatório.

## De onde sai cada ponto

| Degrau | Fonte do dado | Estado |
|---|---|---|
| Indicação válida | link `?e=<slug>` no formulário → coluna nova em `leads` | a construir |
| Agendou ATM | planilha de agendamento (a Etapa 5 do n8n já lê a linha nova) | falta só publicar o evento |
| Fez a ATM | webhook `POST /webhook/atm-concluida` (traz matrícula e treinador) | pronto |
| 1, 3 e 6 acessos | `freepass_vouchers.frequencia`, do sync diário da catraca | pronto |
| Fechou plano | `freepass_vouchers.fechou_plano` | pronto |
| Treinador dono | `freepass_vouchers.treinador_web` (TW) e o campo `treinador` da ATM | pronto |
| Resgate | `freepass_alertas` + `freepass_anotacoes` + `ultimo_acesso` posterior | pronto, combinando |
| **Lead → matrícula** | **não existe hoje** | **o gargalo** |

O elo lead → matrícula é o que trava a trilha de indicação inteira: sem ele o sistema
sabe que a Maria veio pelo link da Beatriz, mas não sabe que a Maria é a matrícula 17169
que treinou seis vezes e fechou. Os workflows do n8n já fazem esse casamento (a Etapa 3
busca o cliente na Pacto, a Etapa 6 casa por matrícula ou por tokens do nome) — falta
gravar o resultado de volta na linha do lead. Com `codigo_pessoa` agora presente em
`freepass_vouchers`, é ele que fecha o elo, não o nome.

## Decisões ainda em aberto

1. **Fechamento na trilha do treinador.** Hoje ela termina em 6 acessos e não paga nada
   quando o plano fecha, embora seja o treinador quem mais move a chance de fechar.
   Sugestão: 100 pontos.
2. **"Mais de 3 acessos" é 3 ou 4?** Aqui está escrito 3 e 6, para alinhar com as faixas
   que a casa já usa em todo o relatório (1-2, 3-5, 6+).
3. **A ATM conta como acesso?** Sim, a pessoa passa na catraca. Por isso "voltou depois
   da ATM" é frequência ≥ 2.
4. **O que o ponto compra**, e quanto vale em dinheiro. É a decisão financeira central:
   ver a simulação de custo antes de anunciar.
5. **Estorno por cancelamento** do contrato dentro de 30 dias. Sem isso, "fechar" vira
   meta perversa.
6. **Consultora pontua na trilha de indicação?** O lead que ela recebe do tráfego pago
   não é indicação dela; o link resolve, mas vale escrever a regra.
