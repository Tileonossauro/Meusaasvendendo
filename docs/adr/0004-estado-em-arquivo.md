---
adr: "0004"
status: aceito
date: 2026-09-10
decides:
  - data.persistence-chosen
---

# ADR 0004 — Estado em arquivo antes de banco de dados

**Status:** aceito · 2026-09-10

## Contexto

O primeiro loop precisa apenas representar o estado de um projeto e mostra-lo.
Um banco traria autenticacao, migrations, ambiente e custo antes de existir valor.

## Decisao

O estado de cada projeto vive em `data/projects/<projectId>/state.json`,
validado por schema. Supabase/Postgres entra quando houver mais de um usuario ou
escrita concorrente.

## Alternativas consideradas

- **Supabase desde o inicio** — resolveria o futuro, atrasaria o primeiro loop e
  adicionaria superficie de seguranca sem usuario.
- **SQLite local** — intermediario, mas ainda sem ganho no slice 1.

## Consequencias

- O caminho `data/projects/<projectId>/` ja e a chave de particionamento que vira
  `project_id` no banco: a migracao nao exige remodelar o dominio.
- Sem escrita concorrente segura por enquanto — aceitavel para um usuario.
