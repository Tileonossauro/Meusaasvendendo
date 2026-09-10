# CHANGELOG

Mudancas relevantes de produto, framework e scoring.

## [0.3.0] — 2026-09-10 — Marco 2: o loop fechou com evidencia real

### Corrigido (P0 — inconsistencia encontrada pelo dogfooding)

- O Navigator pedia ao fundador uma **decisao que ele ja tinha tomado**:
  `data.persistence-chosen` estava `missing` enquanto o ADR 0004 ja a registrava.
- Causa-raiz: o estado foi escrito a mao no bootstrap e **nada relia a
  documentacao**. Nao era erro de um requisito — era lacuna estrutural.
- Correcao estrutural: **reconciliador de decisoes** (`src/collectors/`),
  primeiro coletor deterministico do projeto. ADRs passam a declarar em
  front-matter quais requisitos decidem; o coletor produz propostas de estado com
  evidencia `arquivo:linha`. Ver ADR 0006.
- Ao ser criado, o mecanismo encontrou sozinho um **segundo** requisito
  desatualizado: `deploy.hosting-decided` (decidido em parte pelo ADR 0001).
- Teste de guarda impede que requisito com ADR aceito volte a aparecer como
  pendente, e que o Navigator recomende decisao ja tomada.

### Alterado (P1)

- **`unlocksNow` vs `downstreamImpact`.** O Navigator separa o que fica
  executavel IMEDIATAMENTE do que apenas tem caminho aberto para o futuro. Num
  grafo A->B->C->D, concluir A destrava B agora; C e D sao impacto futuro.
  O grafo transitivo continua no ranking, com peso menor que o imediato.
  A interface diz "Destrava 2 agora · abre caminho para outros 6".
- **Mapa das areas rotulado.** Cada categoria declara a origem do preenchimento
  (`estado declarado` / `parte verificada` / `verificado`), com aviso no topo do
  mapa enquanto houver estado declarado. Barra de categoria nao e auditoria.

### Registrado (P2)

- **DT-001** em `docs/BACKLOG.md`: `measuredCoverage` conta requisitos, nao
  relevancia. Precisa considerar peso, criticidade, metodo de verificacao e
  confianca antes de qualquer dimensao cruzar o limiar de 60%.

### Estado apos o Marco 2

Build Progress 50% -> 70%. Cobertura verificada 0% -> 8%: os tres Readiness
Scores seguem, corretamente, em "Bootstrap / ainda nao medido".
61 testes passando.

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
