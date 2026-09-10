---
adr: "0002"
status: aceito
date: 2026-09-10
---

# ADR 0002 — Scoring deterministico fora do LLM

**Status:** aceito · 2026-09-10

## Contexto

Ferramentas semelhantes (ex.: vibe-ready-cli) pedem a nota diretamente ao modelo.
Isso torna o resultado nao reproduzivel: o mesmo repositorio pode oscilar entre
execucoes, e nao ha como explicar por que um score mudou.

## Decisao

O LLM nunca produz a porcentagem. Ele pode encontrar evidencia, interpretar
codigo, classificar status e declarar confianca. O score final e calculado por
codigo deterministico em `src/scoring/score.ts`, a partir de requisitos, pesos,
status, confianca e aplicabilidade.

## Alternativas consideradas

- **LLM atribui nota por categoria** — mais rapido de construir, instavel e
  impossivel de auditar.
- **Modelo hibrido com nota do LLM ponderada por regras** — herda a instabilidade
  sem eliminar a ambiguidade.

## Consequencias

- Mesmo estado ⇒ mesmo score, sempre; testado.
- Da para responder "por que meu score mudou" apontando o requisito.
- Exige que a camada de coleta produza status e evidencia estruturados,
  o que e mais trabalhoso do que pedir uma nota.
