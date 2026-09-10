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

**Status:** ✅ **PAGA** em 2026-09-10 (Marco 4) · substituida pelo modelo de
suficiencia em `src/scoring/sufficiency.ts`.

**O problema era:** `measuredCoverage` era uma contagem simples. 60% de
requisitos triviais fariam um Production Score parecer medido enquanto os
requisitos criticos seguiam sem evidencia.

**Deixou de ser teorico** quando o Marco 3 levou a cobertura a 65% — acima do
limiar — com tres criticos ainda cegos.

**Como foi paga.** `measured` deixou de depender de contagem e passou a depender
de **suficiencia por dimensao**, com tres portas obrigatorias:

1. cobertura **ponderada pelo peso** ≥ 70%;
2. nenhum critico **daquela dimensao** com forca de observacao < 0,60;
3. nenhum requisito de peso ≥ 7 com forca zero.

A forca de observacao combina os quatro fatores que faltavam: **proveniencia**,
**tipo do requisito**, **confianca** e **peso**. Criticidade passou a ser
relativa a dimensao. Nao existe porta global: cada dimensao prova a propria
suficiencia.

**O que ficou em aberto para calibracao** (nao e divida, e hipotese declarada):
as tabelas `PROVENANCE_STRENGTH` e `KIND_FIT` e os quatro limiares sao
julgamento de engenharia, versionados com `SUFFICIENCY_CALIBRATED = false`.
Ver `docs/CALIBRATION.md`.

### DT-002 — Sandbox obrigatoria antes do scanner de repositorio externo

**Status:** aberta · registrada em 2026-09-10 · **bloqueia** o scanner externo

O scanner atual executa `npm run ...` do projeto analisado **no host**. Isso e
seguro hoje porque o unico projeto analisado e o proprio Readiness OS.

Um `package.json` de terceiro pode declarar qualquer comando. Executa-lo no host
daria a um repositorio desconhecido execucao arbitraria de codigo, com as nossas
variaveis de ambiente e a nossa rede. E o caminho de ataque mais obvio contra
este produto.

**Regra arquitetural ja em vigor (ADR 0007):** repositorio de terceiro NUNCA tem
comando executado no host. `scanRepository()` lanca `UntrustedExecutionError` se
alguem pedir `runCommands` com `trust: "external"`, com guarda dupla e teste de
regressao.

**O que a sandbox precisa ter antes do scanner externo existir:**

- container ou microVM descartavel, destruida ao fim da analise;
- nenhum segredo interno visivel no ambiente;
- limite de CPU, memoria e disco;
- timeout obrigatorio por comando;
- rede desligada por padrao, excecoes justificadas e registradas;
- sistema de arquivos somente leitura fora do diretorio da analise.

**Enquanto nao existir:** scanner externo roda apenas leitura estatica. Requisito
que so poderia ser provado executando fica `uncertain` — nunca `completed` por
inferencia.
