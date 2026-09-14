# Premiação da equipe por voucher

Duas trilhas independentes, com bolsos separados: uma premia **quem traz** a pessoa
(indicação, por link próprio) e outra premia **quem faz a pessoa ficar** (o treinador
que fez a ATM). A mesma pessoa indicada pode pagar as duas.

## O princípio: indicação dá volume, o sexto treino muda o jogo

As duas trilhas não pesam igual, e isso é de propósito.

- **Indicação gera volume.** Sem gente entrando não há o que converter, então a trilha
  paga cedo e raso: o ponto aparece no placar logo, e qualquer pessoa da equipe consegue
  pontuar.
- **O que muda o desfecho é o treinador da ATM levar a pessoa a 6 treinos.** A régua da
  casa (`03-referencias.md`) é inequívoca: quem termina o voucher com 1–2 treinos fecha
  18,5%; com 6 ou mais, 52,3%. Chegar a 6 quase triplica a chance de fechar — nenhuma
  outra ação da jornada move tanto.

Por isso o **sexto acesso na trilha do treinador é o maior degrau de todo o sistema**, e
nenhum degrau da indicação vale mais do que ele.

## Como a escada funciona

A pontuação é **cumulativa**: cada degrau vencido é ponto no bolso e não se perde se a
pessoa parar ali.

E é **por pessoa, nunca por lançamento**. Relançar o voucher de quem teve imprevisto faz
parte do processo (`02-regras-dos-vouchers.md`), e cada degrau paga uma única vez por
pessoa — a segunda janela não repontua a primeira.

## Trilha 1 — Treinador da ATM (o que muda o jogo)

O dono da trilha é **o treinador que fez a ATM**, gravado no momento da ATM. Se o vínculo
TW mudar depois, os pontos continuam com quem fez a ATM — é dele a responsabilidade de
fazer a pessoa voltar, mesmo quando outro treinador da sala a recebe no dia.

| # | Degrau | Pontos | Acumulado |
|---|---|---|---|
| 1 | ATM realizada | 10 | 10 |
| 2 | Voltou pelo menos uma vez depois da ATM | 15 | 25 |
| 3 | Chegou a 3 acessos | 20 | 45 |
| 4 | **Chegou a 6 acessos** | **150** | **195** |
| 5 | Fechou plano **tendo passado dos 6 acessos** | 50 | 245 |
| — | Bônus de resgate | 50 | — |

O degrau 5 só paga fechamento que veio pela frequência. Fechamento com 1 ou 2 treinos
é mérito do comercial, não do treinador — pagar o treinador ali premiaria a venda, e o
que se quer dele é a presença.

## Trilha 2 — Indicação (o que dá volume)

Cada pessoa da equipe tem um link próprio do Missão Salva-Vidas. É o link que diz de
quem veio a indicação.

| # | Degrau | Pontos | Acumulado |
|---|---|---|---|
| 1 | Indicação válida (lead pelo link) | 10 | 10 |
| 2 | A pessoa agendou a ATM | 15 | 25 |
| 3 | A pessoa fez a ATM | 20 | 45 |
| 4 | Chegou a 6 acessos | 50 | 95 |
| 5 | Fechou plano | 100 | 195 |
| — | Bônus de resgate | 50 | — |

O fechamento da indicação caiu de 150 para 100 para respeitar o princípio: nenhum degrau
da indicação vale mais que o sexto treino do treinador. O degrau de 6 acessos continua
aqui porque amarra quem indica ao que importa — indicar gente que de fato vem.

## Resgate — o degrau que não é automático

Resgate é trazer de volta quem já estava perdido: agendou a ATM e não veio, ou começou a
treinar e sumiu. Vale 50 pontos nas duas trilhas.

1. O voucher entrou em estado de alerta (linha em `freepass_alertas` — "travou" ou
   "regrediu", ver `alertas.ts`).
2. Alguém registrou uma anotação de resgate no `/gestao` — a anotação já grava o autor.
3. A pessoa **voltou de verdade**: houve acesso na catraca depois da anotação.

Sem o passo 3 não há ponto. O ponto vai para o autor da anotação, que é quem agiu.

## Cada degrau tem um dono

| Passagem | De quem é o degrau |
|---|---|
| Lead → agendou a ATM | Comercial |
| Agendou → veio | Comercial (fazer vir) |
| ATM → primeiro treino | Treinador da ATM |
| Primeiro treino → sexto treino | **Treinador da ATM** (os da sala recebem, ele engaja) |
| Sexto treino → fechamento | Comercial, com a frequência já garantida |

## O que invalida um ponto

- **Voucher excluído do relatório** (`freepass_exclusoes`) não pontua em nenhuma trilha.
- **Indicação não conta** quando o telefone já é de aluno ativo, quando o mesmo telefone
  já foi indicado nos últimos 90 dias por qualquer pessoa, quando o lead vem sem telefone
  válido, ou quando é o telefone da própria pessoa da equipe.
- **Primeiro link vence**, com janela de 90 dias entre o clique e o formulário.
- **Janela de atribuição de 90 dias** para o fechamento contar na indicação.
- **Correção manual** só pela coordenação e com justificativa registrada.

## De onde sai cada ponto

| Degrau | Fonte do dado | Estado |
|---|---|---|
| Fez a ATM e quem fez | webhook `POST /webhook/atm-concluida` (traz matrícula e treinador) | pronto |
| 1, 3 e 6 acessos | `freepass_vouchers.frequencia`, do sync diário da catraca | pronto |
| Fechou plano | `freepass_vouchers.fechou_plano` | pronto |
| Resgate | `freepass_alertas` + `freepass_anotacoes` + `ultimo_acesso` posterior | pronto, combinando |
| Agendou ATM | planilha de agendamento (a Etapa 5 do n8n já lê a linha nova) | falta só publicar o evento |
| Indicação válida | link `?e=<slug>` no formulário → coluna nova em `leads` | a construir |
| **Lead → matrícula** | **não existe hoje** | **o gargalo da trilha de indicação** |

A trilha do treinador **não depende do gargalo**: ATM, frequência e fechamento já estão
todos ligados pela matrícula. Ela pode entrar no ar antes da trilha de indicação.

## Decisões ainda em aberto

1. **Janela para os 6 acessos.** Contar dentro da vigência distorce entre os tipos: o
   voucher de 30 dias já termina, em média, com 6,0 treinos; a experiência de 7 dias, com
   2,1. Do jeito que está, o treinador de voucher de 30 dias ganha os 150 quase de graça
   e o de experiência praticamente nunca. Sugestão: **6 acessos em até 21 dias contados
   da ATM**, igual para todo tipo — o que exige a data de cada acesso, não só o total que
   o sync grava hoje.
2. **"Mais de 3 acessos" é 3 ou 4?** Aqui está 3 e 6, alinhado com as faixas que o
   relatório já usa (1–2, 3–5, 6+).
3. **A ATM conta como acesso?** Sim, a pessoa passa na catraca. Por isso "voltou depois
   da ATM" é frequência ≥ 2.
4. **O que o ponto compra**, e quanto vale em dinheiro.
5. **Estorno por cancelamento** do contrato dentro de 30 dias.
6. **Consultora pontua na trilha de indicação?** O lead do tráfego pago não é indicação
   dela; o link já separa, mas vale estar escrito.
