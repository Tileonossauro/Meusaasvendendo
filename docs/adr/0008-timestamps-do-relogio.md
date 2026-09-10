---
adr: "0008"
status: aceito
date: 2026-09-10
---

# ADR 0008 — Timestamps de historico vem do relogio, nunca da mao

**Status:** aceito · 2026-09-10

## Contexto

Doze eventos do historico foram registrados com horarios escritos a mao por um
agente. Onze deles estavam **no futuro** no momento em que foram gravados: o
agente digitou `13:00`, `13:05`, `13:10` enquanto o relogio marcava `11:02`.

Isso corrompe a integridade do historico de tres formas:

1. um evento aparece como tendo acontecido antes de existir;
2. a ordem cronologica deixa de refletir a ordem real dos fatos;
3. qualquer analise futura de "quanto tempo levou entre X e Y" fica errada.

Num produto que promete responder "por que meu projeto avancou", o historico e
dado primario. Timestamp inventado e o mesmo problema que score inventado.

## Decisao

**Agentes nao escrevem timestamps.** Todo evento nasce em
`createHistoryEvent()` (`src/history/create-event.ts`), que carimba
`clock.now()` no momento da execucao. O tipo `HistoryEventDraft` **nao expoe**
os campos `id`, `at` e `atSource` — nao ha como preenche-los por engano.

O relogio e injetavel (`src/history/clock.ts`): `systemClock` em producao,
`fixedClock` nos testes, para preservar determinismo.

Guardas obrigatorias, em `auditHistoryIntegrity()`:

- evento com timestamp acima de `agora + 60s` e recusado;
- ids unicos, derivados do MAIOR id existente (nunca do tamanho da lista);
- ordem cronologica nao decrescente.

## Correcao dos eventos ja gravados

Fonte legitima de recuperacao: **a data do commit que introduziu cada evento**.
Um evento nao pode ter acontecido depois do commit que o contem.

`scripts/fix-history-timestamps.ts` percorre o historico do git, descobre em que
commit cada id apareceu pela primeira vez e, onde o timestamp gravado e
posterior a esse commit, substitui pela data do commit.

**Nao inventamos precisao.** A data do commit e uma aproximacao legitima, e os
eventos corrigidos carregam `atSource: "commit_reconstructed"` para que a
diferenca fique auditavel para sempre. Eventos gravados pelo relogio seguem como
`runtime_clock`.

Doze eventos foram corrigidos. A auditoria do historico passou a rodar nos
quality gates.

## Alternativas consideradas

- **Apagar os eventos invalidos** — perderia informacao real (os fatos
  aconteceram) para corrigir um detalhe.
- **Deixar como estava** — o erro e pequeno hoje e envenena qualquer analise
  temporal futura.
- **Reconstruir por heuristica de conteudo** — inventaria precisao que nao temos.

## Consequencias

- O historico volta a ser dado confiavel para a funcionalidade futura
  "por que meu projeto avancou".
- Um agente que tente escrever timestamp encontra o compilador no caminho.
- O campo `atSource` fica no schema permanentemente: e a memoria honesta de que
  parte do historico antigo e reconstruida, nao observada.
