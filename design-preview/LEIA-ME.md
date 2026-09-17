# Protótipo de design — Dashboard de Vouchers

Esta pasta é um retrato estático da página `/gestao` do Missão Salva-Vidas, para
trabalhar o layout sem precisar de banco de dados, senha ou servidor.

## Como abrir

Dê dois cliques em **`index.html`**. Abre no navegador e pronto — não precisa instalar
nem rodar nada.

## O que editar

**Só um arquivo importa: [`../app/gestao/gestao.css`](../app/gestao/gestao.css).**

Ele não é uma cópia: é o arquivo real que está no ar em produção. O `index.html` aponta
direto para ele. Ou seja: você edita, salva, aperta F5 no navegador e vê o resultado —
e o que você editou já está pronto para subir, sem ninguém precisar transcrever nada.

É CSS puro, com nomes de classe em português (`.ficha`, `.barra`, `.chip`, `.placar`).
Não tem Tailwind, não tem pré-processador.

As cores, tamanhos e espaçamentos estão como variáveis no `:root`, no topo do arquivo —
mexer lá muda a página inteira de uma vez.

## O que NÃO editar

- **`base.css`** — é gerado automaticamente (Tailwind + estilos globais do site).
  Qualquer mudança aqui é perdida na próxima geração.
- **`index.html`** — é gerado automaticamente a partir da página real. Se você mudar a
  estrutura aqui, ela não volta para o projeto.

Se o layout precisar de mudança de **estrutura** (mover blocos, tirar/adicionar
elementos, não só estilizar), isso mora em
[`../app/gestao/Relatorio.tsx`](../app/gestao/Relatorio.tsx) — vale combinar antes,
porque lá tem lógica junto do visual.

## Sobre os dados

Todos os nomes, matrículas e números desta página são **fictícios**. A estrutura e a
quantidade de informação são fiéis à página real, mas nenhum cliente de verdade aparece
aqui.

## O que não funciona no protótipo

É HTML estático: os botões, abas, filtros e a busca **não respondem ao clique**. Eles
aparecem no estado inicial. Para ver como fica um estado diferente (uma aba selecionada,
uma gaveta aberta), dá para forçar pelo CSS ou pedir uma nova geração do protótipo
naquele estado.
