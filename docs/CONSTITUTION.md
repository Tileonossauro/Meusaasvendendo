# Project Constitution — Readiness OS

Este documento e o contrato do projeto. Qualquer mudanca — humana ou de IA — e
comparada contra ele. Alterar a Constitution exige aprovacao explicita do fundador.

## Produto

Readiness OS: um GPS de conclusao para projetos SaaS.

## Publico

Pessoas construindo SaaS com agentes de IA, com ou sem formacao tecnica.
Inclui quem mantem varios projetos simultaneos.

## Problema

Quem constroi com IA nao consegue julgar se o produto esta pronto, seguro ou
cobravel — e nao sabe qual deve ser a proxima acao.

## Promessa

Dizer onde o SaaS esta, o que falta, o que bloqueia, de quem depende e o que
fazer agora — ate "ready to charge".

## Core job

"Qual e a unica coisa que devo fazer agora para avancar mais?"

## Escopo atual (v0)

- Framework de requisitos versionado como dado estruturado.
- Grafo de dependencias entre requisitos.
- Scoring deterministico de tres dimensoes.
- Algoritmo de Next Best Action deterministico.
- Estado por projeto em arquivo (`data/projects/<projectId>/state.json`).
- Self-Build Dashboard consumindo esses dados (Slice 1).
- Dogfooding: o Readiness OS como primeiro projeto analisado.

## Fora de escopo agora

Registrados em `docs/BACKLOG.md`. Resumo: cobranca do proprio Readiness OS,
planos, marketplace, times e organizacoes, app mobile, auditor de prompts,
multiplos provedores git, reanalise automatica por commit, notificacoes,
analytics avancado, banco de dados.

## Stack

Next.js + TypeScript + Tailwind na interface; core em TypeScript puro;
Vercel como alvo de deploy; GitHub como primeira integracao; Supabase/Postgres
apenas quando o banco se tornar realmente necessario.
Sem infraestrutura antecipada.

## Decisoes ja tomadas

Ver `docs/adr/`. As estruturais: scoring deterministico fora do LLM (ADR 0002),
framework como dado versionado (ADR 0003), estado em arquivo antes de banco
(ADR 0004), arquitetura multi-projeto desde o inicio (ADR 0005).

## Requisitos criticos do proprio produto

- Determinismo de score (mesmo estado ⇒ mesmo numero).
- Evidencia com origem e confianca em todo achado relevante.
- Fronteira de confianca contra conteudo de repositorio analisado.
- Transparencia: score nao medido e exibido como nao medido.
- Linguagem de leigo por padrao.

## Definition of Done do projeto

Ver `AGENTS.md`. Resumo: gates passando, teste do novo comportamento,
documentacao atualizada, estado com evidencia real, relatorio ao fundador.

## Restricoes

- Nao inventar numeros.
- Nao tratar dependencia instalada como funcionalidade pronta.
- Nao adicionar dependencia sem beneficio claro e licenca verificada.
- Nao executar acao destrutiva, cara ou em producao sem aprovacao do fundador.
- Preferir falso negativo a falso positivo.
