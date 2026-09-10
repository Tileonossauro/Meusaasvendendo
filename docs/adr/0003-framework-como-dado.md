---
adr: "0003"
status: aceito
date: 2026-09-10
---

# ADR 0003 — Framework como dado versionado, nao prompt

**Status:** aceito · 2026-09-10

## Contexto

O framework de requisitos e o ativo principal do produto. Se ele viver dentro de
prompts, nao da para versionar, testar, comparar versoes nem calibrar.

## Decisao

O framework vive em `src/framework/framework.v0.json`, validado por schema `zod`
e por um quality gate (`npm run validate:framework`) que verifica schema, ids
unicos, referencias de dependencia e ausencia de ciclos.

## Alternativas consideradas

- **Requisitos embutidos em prompt** — flexivel, impossivel de testar.
- **Requisitos em codigo TypeScript** — testavel, mas mistura dado com logica e
  dificulta edicao por nao programador.
- **Banco de dados** — necessario no futuro, prematuro agora (ver ADR 0004).

## Consequencias

- Adicionar requisito, alterar peso ou mudar regra e uma alteracao de dado revisavel.
- Da para versionar o framework e explicar diferenca entre versoes.
- Pesos ficam explicitamente marcados como nao calibrados.
