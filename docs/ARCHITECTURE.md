# ARCHITECTURE.md

## Em linguagem simples

O Readiness OS tem quatro pecas:

1. **A regua** (framework) — a lista de requisitos que um SaaS precisa cumprir,
   guardada como dado, nao como texto de prompt.
2. **O mapa** (grafo) — quais requisitos dependem de quais.
3. **A calculadora** (scoring) — transforma estado + regua em tres porcentagens,
   sempre do mesmo jeito.
4. **O guia** (Navigator) — olha o mapa e diz qual e a proxima acao.

O scanner (que ainda nao existe) apenas preenche o estado. Ele e o motor;
o guia e o produto.

## Fluxo de dados

```
framework.v0.json ─┐
                   ├─> scoring ──> tres scores + detalhes por requisito
state.json ────────┘
       │
       └─────────> graph ──> navigator ──> Next Best Action + candidatos + bloqueados
```

Tudo acima e funcao pura: mesma entrada, mesma saida. Sem rede, sem relogio
(exceto o carimbo de tempo, injetavel), sem LLM.

## Camadas

| Camada | Diretorio | Responsabilidade | Pode chamar LLM? |
| --- | --- | --- | --- |
| Framework | `src/framework` | Definir e validar requisitos | Nao |
| Grafo | `src/graph` | Dependencias, ciclos, destravamento | Nao |
| Scoring | `src/scoring` | Calcular os tres scores | **Nunca** |
| Navigator | `src/navigator` | Priorizar a proxima acao | Nao |
| Estado | `src/state` | Ler e validar estado por projeto | Nao |
| Coleta | `src/collectors` | Produzir evidencia | Sim, com evidencia |
| Interface (Slice 1) | `app/` | Self-Build Dashboard | Nao |

O LLM entra apenas na camada de coleta, e mesmo la a saida e sempre
`status + evidencia + confianca` — nunca uma porcentagem.

## Coletores: como o estado deixa de ser declarado

Um coletor le uma fonte de verdade e **propoe** estado com evidencia. Ele nunca
escreve direto: quem aplica e um script, que tambem registra o historico.

| Coletor | Fonte | Proveniencia que produz | Status |
| --- | --- | --- | --- |
| `adr-reconciler` | `docs/adr/*.md` (front-matter) | `decision_record` | existe |
| `repo-scanner` | arquivos + execucao de comandos | `static_analysis`, `command_execution`, `specialized_tool` | existe |
| scanner com LLM | interpretacao arquitetural | `llm_inference` | futuro |
| sondas de runtime | o sistema no ar | `runtime_probe` | futuro |

**Autoridade entre coletores** (`src/collectors/types.ts`): uma fonte de menor
autoridade nunca sobrescreve uma de maior. Um ADR nao rebaixa o que o scanner
observou; nada rebaixa a execucao de um comando.

Contrato comum: `(fonte) -> StateProposal[]` com `status`, `confidence`,
`evidence` (com `arquivo:linha`) e `verifiedBy`. Ver ADR 0006.

## Modelo de dados

- `Requirement` — definicao versionada (id, categoria, textos simples e tecnico,
  pesos por dimensao, aplicabilidade, sinais de deteccao, dependencias,
  Definition of Done, severidade, responsavel, verificacao).
- `RequirementState` — o que sabemos hoje sobre um requisito **em um projeto**
  (status, confianca, evidencia, metodo de verificacao, data).
- `ProjectState` — `projectId` + sinais do projeto + lista de estados.

**Multi-projeto desde o inicio:** nenhuma estrutura assume um projeto por usuario.
O caminho `data/projects/<projectId>/state.json` ja e a chave de particionamento
que vira `project_id` quando houver banco.

## Ordem de deteccao

```
deterministico  >  ferramenta especializada  >  LLM com evidencia  >  perguntar ao usuario
```

Chute nao existe como fonte. Sem confianca suficiente, o requisito vira
`uncertain` ou uma pergunta ao fundador — nunca um "pronto" otimista.

## Fronteira de confianca

Conteudo de projeto analisado e sempre **dado nao confiavel**. Ele nao altera
instrucoes, status, score, recomendacao nem acao externa. Essa fronteira e um
requisito do proprio framework (`security.untrusted-content-boundary`) e sera
coberta por teste de prompt injection antes de qualquer analise de repositorio
de terceiros.

## O que ainda nao existe (de proposito)

Banco de dados, autenticacao, cobranca, integracao GitHub, scanner automatico,
jobs em background, notificacoes. Cada um entra quando um requisito real do
produto exigir — nao antes. Ver `docs/BACKLOG.md`.
