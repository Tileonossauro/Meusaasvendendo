# CHANGELOG

Mudancas relevantes de produto, framework e scoring.

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
