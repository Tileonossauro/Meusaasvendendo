# BACKLOG.md — o que NAO sera feito agora

Registrado para nao ser esquecido e para nao ser construido por engano.
Um agente que encontrar um item desta lista deve **parar e registrar**, nao implementar.

## Nao construir no primeiro loop

| Item | Por que nao agora | Quando reconsiderar |
| --- | --- | --- |
| Cobranca do proprio Readiness OS | Nao ha usuario pagante; adiciona superficie de risco | Depois de validado com projetos reais |
| Planos e limites por plano | Depende de precificacao ainda nao decidida | Junto com a cobranca |
| Marketplace | Fora do core job | Sem data |
| Times e organizacoes | Complexidade de permissao sem demanda | Quando houver mais de um usuario por conta |
| App mobile | O trabalho acontece no desktop | Sem data |
| Auditor avancado de prompts | Depende do loop basico funcionando | Fase Prompt/AI Dev Lab |
| Modulo financeiro | Fora do escopo | Sem data |
| Suporte a varios provedores git | GitHub cobre o publico inicial | Apos tracao |
| Dezenas de integracoes | Cada uma e superficie de seguranca | Sob demanda real |
| Reanalise automatica a cada commit | Custo e complexidade antes do valor provado | Apos o scanner deterministico |
| Sistema completo de notificacoes | Sem usuario para notificar | Apos multi-projeto real |
| Analytics sofisticado | Nao muda nenhuma decisao hoje | Apos primeiros usuarios |
| Banco de dados | Arquivo JSON resolve o slice 1 (ADR 0004) | Quando houver mais de um usuario ou escrita concorrente |
| Autenticacao do Readiness OS | Nao ha area logada ainda | Junto com multi-usuario |
| GitHub App | Exige revisao de seguranca dedicada | Antes de analisar repositorio de terceiro |

## Preservado conceitualmente para depois (Prompt / AI Dev Lab)

O loop futuro, ja considerado na arquitetura mas **nao implementado**:

```
PLAN → PREPARE TASK → EXECUTE → VERIFY → UPDATE GRAPH → UPDATE SCORE → NEXT ACTION
```

Inclui: gerar tarefa para o Claude Code, auditar o prompt antes da execucao,
verificar o resultado depois, comparar a alteracao contra a Project Constitution
e detectar scope creep.

## Dashboard de portfolio (multi-projeto)

Arquitetura ja preparada (todo estado pertence a um `projectId`), interface **nao**
construida. Quando chegar a hora: total de projetos, prontos para lancamento,
em desenvolvimento, bloqueados, medias dos tres scores, decisoes pendentes do
fundador, tarefas disponiveis para IA, bloqueadores criticos, projeto mais proximo
de ficar pronto, projeto que mais precisa de atencao e atividade recente.

Marco de validacao: o fundador adicionar um **segundo** projeto real.

## Divida tecnica deliberada — resolver antes de liberar scores para clientes

### DT-001 — `measuredCoverage` conta requisitos, nao relevancia

**Status:** aceita conscientemente · registrada em 2026-09-10 · dona: revisao do Marco do scanner

**O problema.** Hoje `measuredCoverage` (em `src/scoring/score.ts`) e uma contagem
simples: requisitos verificados automaticamente dividido por requisitos aplicaveis.
Quando passa de 60%, a dimensao e considerada MEDIDA e passa a exibir porcentagem.

**Por que isso e perigoso.** 60% de requisitos triviais verificados fariam um
Production Score parecer medido enquanto os requisitos criticos — os que de fato
decidem se e seguro receber usuarios e dinheiro — seguem com pouca ou nenhuma
evidencia. O numero ficaria tecnicamente correto e praticamente mentiroso.
E exatamente o tipo de falso positivo que este produto existe para evitar.

**O que precisa ser revisado antes de liberar scores para clientes:**

- **Peso dos requisitos cobertos** — cobertura deveria ser ponderada pelo peso na
  dimensao, nao pela contagem.
- **Criticidade** — requisito `launchBlocking` ou `blocker` sem evidencia deveria
  impedir a dimensao de ser considerada medida, independentemente do percentual.
- **Metodo de verificacao** — `deterministic` e `tool` merecem mais peso de
  cobertura que `llm`.
- **Confianca/evidencia** — requisito verificado com confianca baixa nao deveria
  contar como cobertura cheia.

**Mitigacao parcial ja aplicada (2026-09-10).** Uma segunda porta foi adicionada
ao `measured`: nenhuma dimensao e considerada medida enquanto existir requisito
critico (bloqueia lancamento ou severidade `blocker`) sem verificacao
independente. Isso ja provou seu valor: apos o Marco 3 a cobertura chegou a 65%,
acima do limiar, e os scores corretamente **nao** foram liberados, porque 3
requisitos criticos seguem sem evidencia. **A DT-001 continua aberta** — falta a
ponderacao por peso, metodo de verificacao e confianca.

**Enquanto nao for resolvida.** O limiar de 60% segue valendo, e as tres dimensoes
seguem em "Bootstrap / ainda nao medido". A cobertura independente ja e de 65% —
acima do limiar —, entao a partir de agora e apenas a porta dos criticos que
sustenta a honestidade do numero. Pagar a divida virou prioridade real.

**Nao resolver junto com o scanner sem revisar.** O scanner vai elevar a cobertura
rapidamente; se o criterio nao for revisado antes, o primeiro score "medido" pode
ser justamente o menos confiavel.
