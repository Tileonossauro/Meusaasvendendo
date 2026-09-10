---
adr: "0005"
status: aceito
date: 2026-09-10
---

# ADR 0005 — Arquitetura multi-projeto desde o inicio

**Status:** aceito · 2026-09-10

## Contexto

O publico-alvo frequentemente mantem varios SaaS simultaneos. Retroencaixar
multi-projeto depois exige remodelar dominio, dados e navegacao.

## Decisao

Toda entidade que represente analise, estado, score, grafo, decisao ou historico
pertence explicitamente a um `projectId`. Nenhuma funcao do core assume projeto
unico. A navegacao caminha para: Dashboard Geral → Projeto → Dashboard do Projeto
→ Requisitos / Navigator / Historico.

O Slice 1 exibe **um** projeto (o proprio Readiness OS), mas sobre estruturas
que ja aceitam varios.

## Alternativas consideradas

- **Projeto unico agora, generalizar depois** — mais rapido no curto prazo,
  caro e arriscado depois.

## Consequencias

- Quantidade de projetos podera ser dimensao de plano e cobranca no futuro,
  sem reescrever o core. Precos nunca sao codificados no core.
- O dashboard de portfolio fica no backlog, nao na arquitetura.
