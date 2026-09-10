# CHANGELOG

Mudancas relevantes de produto, framework e scoring.

## [0.2.0] — 2026-09-10 — Marco 1: Self-Build Dashboard

### Adicionado

- **Rota `/build`** — Self-Build Dashboard em Next.js 15 + Tailwind, com HERO,
  Build Progress, os tres Readiness Scores, Next Best Action, Agora,
  Depende de voce, A IA pode fazer, Bloqueadores, Mapa do projeto (12 areas) e
  Recentemente concluido. Detalhe tecnico sempre atras de progressive disclosure.
- **Build Progress** (`src/progress/`) — progresso do PLANO DE CONSTRUCAO,
  separado dos Readiness Scores e rotulado como tal na interface.
- **Historico de progresso** (`src/history/`) — seis tipos de evento, cada um
  carregando o `frameworkVersion` que o produziu.
- **View model do dashboard** (`src/dashboard/`) — a regra "sem medicao, sem
  percentual" vive no dado (`percent: null`), nao na tela.

### Alterado

- **Campos do requisito renomeados** para o contrato estruturado:
  `simple` → `simpleExplanation`, `technical` → `technicalExplanation`,
  `why` → `whyItMatters`, `impact` → `impactSummary`,
  `aiExecutable` → `aiCanHandle`, mais o novo `userActionRequired`
  (validado contra `owner`, para os dois nunca divergirem).
- **Next Best Action** passou a considerar a **relevancia** dos requisitos
  destravados (peso somado), nao apenas a quantidade, alem de bonus por
  bloqueador de lancamento destravado.
- Todo texto voltado ao fundador foi revisado e acentuado corretamente.

### Verificado

41 testes passando, incluindo a garantia de que nenhum Readiness Score aparece
como medido enquanto `measured` for falso, e de que o historico nao pode
registrar um Build Progress diferente do calculado.

## [0.1.0] — 2026-09-10 — Bootstrap

### Adicionado

- Framework v0.1.0: 44 requisitos em 12 categorias, como dado versionado e validado.
- Grafo de dependencias com deteccao de ciclos e referencias orfas.
- Scoring deterministico de tres dimensoes (MVP, Production, AI Build), com porta
  de confianca, teto por bloqueio de lancamento e marcacao de "nao medido".
- Next Best Action deterministico com decomposicao auditavel da pontuacao.
- Estado por projeto em arquivo, ja particionado por `projectId`.
- Quality gates: `npm run gates` (typecheck + validacao do framework + testes) e CI.
- Documentacao: PRODUCT, CONSTITUTION, ARCHITECTURE, SCORING, NEXT_BEST_ACTION,
  FRAMEWORK, RESEARCH, BACKLOG, CALIBRATION, VERTICAL_SLICE, 5 ADRs.
- CLAUDE.md e AGENTS.md.

### Nao incluido de proposito

Interface, scanner automatico, banco, autenticacao, cobranca, integracao GitHub.
Ver `docs/BACKLOG.md`.
