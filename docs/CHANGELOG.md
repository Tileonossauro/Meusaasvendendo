# CHANGELOG

Mudancas relevantes de produto, framework e scoring.

## [0.6.0] — 2026-09-10 — Integridade do historico, ausencia conclusiva e 1o ciclo

### Corrigido (P0) — timestamps

Doze eventos tinham hora escrita a mao; onze estavam no futuro. Agora todo
evento nasce em `createHistoryEvent()` com relogio injetavel; o tipo do draft
nao expoe `at`. Os invalidos foram recuperados da data do commit que os
introduziu e marcados `atSource: "commit_reconstructed"`. Auditoria de
integridade entrou nos quality gates. Ver ADR 0008.

### Corrigido (P1) — ausencia conclusiva

`detectionOutcome` distingue `confirmed_absent` (o coletor conhece todo o espaco
relevante, declarado em `observationScope`) de `not_detected`. So a primeira
ganha forca de observacao elevada; `missing` apoiado em `not_detected` e recusado
pelo scanner. `security.untrusted-content-boundary` deixou de ser `missing` e
virou `uncertain`.

### Ciclo 0001 do Navigator

NBA recomendava "Variaveis de ambiente documentadas". Antes de criar o arquivo,
verificamos: o projeto **nao le nenhuma variavel de ambiente**. Criar seria
encenacao.

- `detectSignals()` no scanner: sinais do projeto passam a ser DETECTADOS, nao
  mantidos a mao (mesmo problema que motivou o reconciliador de ADRs).
- `foundation.env-example` passou a depender do sinal `uses_environment_config`.
  Framework 0.2.0 -> 0.3.0.
- **Nenhum numero subiu.** Production caiu de 41% para 40%. O ciclo evitou
  trabalho inutil e deixou o framework correto para qualquer projeto futuro.
- NBA passou para "Segredos guardados no lugar certo".

### Adicionado — registro de ciclos

`src/history/cycle.ts` e `data/projects/<id>/cycles.json`: NBA antes, acao,
evidencia, requisitos alterados, `unlocksNow`, `downstreamImpact`, NBA depois e
suficiencia antes/depois. Base da funcionalidade "por que meu projeto avancou?",
ja visivel no dashboard.

## [0.5.0] — 2026-09-10 — Marco 4: suficiencia de medicao (DT-001 paga)

### Seguranca (P0 arquitetural)

- **ADR 0007** — repositorio de terceiro NUNCA tem comandos executados no host.
  `scanRepository()` recebe `trust: "self" | "external"` e lanca
  `UntrustedExecutionError` se pedirem execucao para repositorio externo, com
  guarda dupla (entrada e no ponto exato da execucao) e teste de regressao.
  Leitura estatica de repositorio externo continua permitida.
- **DT-002** registrada: sandbox descartavel e pre-requisito do scanner externo.
- Comentario de fronteira no topo do scanner e regra 15 no `CLAUDE.md`.

### DT-001 PAGA

`measured` deixou de depender de contagem de requisitos e passou a depender de
**suficiencia por dimensao** (`src/scoring/sufficiency.ts`):

- **Forca da observacao** por requisito = proveniencia × adequacao ao `kind` ×
  confianca. Diz o quanto SABEMOS, nao se esta pronto.
- **Excecao deliberada:** status `missing` observado vale adequacao 1 — provar
  ausencia nao exige executar nada.
- **Tres portas por dimensao:** cobertura ponderada ≥ 70%; nenhum critico
  daquela dimensao com forca < 0,60; nenhum requisito de peso ≥ 7 com forca 0.
- **Criticidade relativa a dimensao:** alto risco E peso ≥ 5 naquela dimensao.
- **Sem porta global:** cada dimensao prova a propria suficiencia.

### Resultado honesto

Nenhuma dimensao passou. Cobertura ponderada: MVP 41%, Production 46%,
AI Build 64% (limiar 70%). AI Build e a mais proxima e nao tem critico em falta —
so um ponto cego de peso alto. Os limiares **nao** foram ajustados.

## [0.4.0] — 2026-09-10 — Marco 3: scanner deterministico local

### Adicionado

- **`src/collectors/repo-scanner.ts`** — o Readiness OS passa a analisar o
  proprio repositorio e produzir evidencia INDEPENDENTE. Sem LLM: apenas leitura
  de arquivos e execucao de comandos.
- **`npm run scan`** (e `-- --apply`) — mostra e aplica o que o scanner provou.
- **`src/collectors/types.ts`** — contrato comum dos coletores, com ordem de
  autoridade entre proveniencias: fonte mais fraca nunca sobrescreve a mais forte.

### Resultado

17 requisitos saíram do estado declarado a mao: 12 `completed`, 4 `partial`,
1 `missing` com ausencia confirmada. Cobertura por scanner independente:
**0% -> 65%**.

**Os tres Readiness Scores continuam "ainda nao medido"** — 3 requisitos
criticos (fluxo principal, deploy de producao, segredos de producao) seguem sem
evidencia independente, e a segunda porta do `measured` os exige. Cobertura alta
nao libera o score sozinha.

### Falsos positivos deliberadamente evitados

- `.env` ignorado pelo git **nao** completa `foundation.env-example`: sem
  `.env.example` fica `partial`.
- Schemas existirem **nao** prova que cobrem o fluxo principal: `partial`.
- Varredura de segredos **nao** cobre o historico do git: `partial`, nunca
  `completed`.
- Workflow de CI existir **nao** prova que a falha bloqueia o merge: `partial`.
- Script declarado no `package.json` **nao** conta como aprovado: sem executar,
  vira `uncertain` com confianca 0,5 (abaixo da porta de confianca).
- Requisito `kind: "operational"` nunca vira `completed` por leitura estatica.
- Requisito `kind: "implementation"` so vira `completed` com
  `provenance: "command_execution"` — coberto por teste.

### Corrigido durante o desenvolvimento

A deteccao da fronteira de confianca procurava a palavra "injection" dentro dos
testes e encontrava o proprio arquivo de teste do scanner. Passou a olhar o NOME
do arquivo. Falso positivo por auto-referencia, achado pelo dogfooding.

## [0.2.0] — 2026-09-10 — Proveniencia da evidencia (framework v0.2.0)

### Corrigido (P0 arquitetural)

Coleta deterministica estava sendo confundida com verificacao independente.
Estado vindo de ADR recebia `verifiedBy: "deterministic"` e contava como
"cobertura verificada automaticamente" — mesma moeda de um scanner detectando
codigo real.

- **Dois eixos independentes** no lugar de `verifiedBy`:
  `provenance` (de onde vem a verdade: `human_declared`, `decision_record`,
  `static_analysis`, `command_execution`, `specialized_tool`, `llm_inference`,
  `runtime_probe`) e `collectionMethod` (`manual`, `deterministic`, `llm`).
- **`kind` no requisito** (`decision` / `artifact` / `implementation` /
  `operational`) descrevendo o que a Definition of Done realmente exige.
- **Guarda estrutural:** o reconciliador RECUSA um ADR que declare decidir
  requisito que nao seja `kind: "decision"`. Um ADR afirmando que
  `security.rate-limiting` esta pronto derruba os quality gates.
- **Duas coberturas:** `evidenceCoverage` (inclui ADR) e `independentCoverage`
  (so scanner). **Somente a independente libera o score**, e ela segue em 0%.
- **Segunda porta para `measured`:** nenhum requisito critico pode estar sem
  verificacao independente. Mitigacao parcial da DT-001, que continua **aberta**.
- Historico deixou de dizer "verificado automaticamente sem intervencao manual"
  e passou a dizer "decisao reconciliada automaticamente a partir de um ADR
  aceito", explicitando que a ligacao foi declarada por uma pessoa.
- Mapa das areas ganhou o selo `decisão registrada`, distinto de
  `verificado por scanner`.

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
