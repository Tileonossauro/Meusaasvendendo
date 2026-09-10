# NEXT_BEST_ACTION.md — como escolhemos o proximo passo

Implementacao: `src/navigator/next-best-action.ts`. Testes: `tests/navigator.test.ts`.

## O que estamos respondendo

Nao "o que esta faltando" (isso e checklist), mas:

**"Qual acao disponivel neste momento destrava mais progresso relevante?"**

## Quem entra no ranking

Um requisito e candidato quando:

1. e aplicavel ao projeto (sinais satisfeitos);
2. esta em aberto (`missing`, `partial`, `uncertain` ou `blocked`);
3. **todas** as suas dependencias estao concluidas ou nao sao aplicaveis.

Requisito com dependencia em aberto vai para a lista `blocked`, com o motivo
explicito ("esperando por X") — nunca e recomendado.

## A formula

```
prioridade =  pontos_de_severidade                        (severidade)
            + 30    se o proprio requisito bloqueia lancamento
            + 6     × requisitos destravados AGORA         (quantidade imediata)
            + 0,5   × peso somado dos destravados agora    (relevancia imediata)
            + 2     × requisitos de impacto futuro         (quantidade futura)
            + 0,2   × peso somado do impacto futuro        (relevancia futura)
            + 8     × bloqueadores de lancamento na cadeia
            + 4     × tarefas de IA destravadas agora
            + 1,5   × peso somado do proprio requisito     (peso do requisito)
            + 15    se exige acao do fundador E move algo  (responsavel)
```

Pontos de severidade: `blocker` 40, `high` 25, `medium` 12, `low` 5.

Peso somado = `weights.mvp + weights.production + weights.aiBuild`.

### Os seis fatores exigidos, e onde cada um entra

| Fator | Onde entra na formula |
| --- | --- |
| Severidade | `pontos_de_severidade` |
| Bloqueio de lancamento | `+30` proprio, `+8` por bloqueador na cadeia |
| Peso do requisito | `1,5 × peso somado do proprio` |
| Quantidade de destravados | `6 ×` imediatos, `2 ×` futuros |
| **Relevancia** dos destravados | `0,5 ×` peso imediato, `0,2 ×` peso futuro |
| Responsavel | `+15` quando `userActionRequired` e move algo |
| Estado das dependencias | **filtro de elegibilidade**, antes da pontuacao |

Quantidade e relevancia sao fatores separados de proposito: destravar dois
requisitos criticos deve valer mais que destravar cinco triviais.

## Destrava AGORA vs impacto futuro

Num grafo `A -> B -> C -> D`, concluir **A** torna **B** executavel
imediatamente. **C** e **D** continuam bloqueados: A apenas **abre caminho**
para eles.

Chamar os quatro de "destravados" seria mentira para o fundador. Por isso o
resultado separa dois conceitos:

| Campo | Significado | Como aparece na interface |
| --- | --- | --- |
| `unlocksNow` | Ficam **executaveis imediatamente** ao concluir esta acao | "Destrava 2 agora" |
| `downstreamImpact` | Descendentes que esta acao ajuda a liberar **depois** | "abre caminho para outros 6" |

**Regra exata de `unlocksNow`:** dependente **direto**, em aberto, aplicavel, e
cujas **outras** dependencias ja estao satisfeitas. Se o dependente ainda espera
outra coisa, ele nao e destravado agora — vai para o impacto futuro.

`downstreamImpact` e toda a descendencia transitiva em aberto, menos os
imediatos. Os dois conjuntos nunca se sobrepoem, e ha teste garantindo isso.

**O grafo transitivo continua no ranking**, porque impacto de longo prazo
importa de verdade — mas com peso menor que o destravamento imediato
(`perDownstream` < `perUnlockedNow`, `downstreamWeight` < `unlocksNowWeight`,
tambem cobertos por teste). O que muda e a **linguagem**: o numero que o fundador
le como promessa e o imediato; o futuro aparece como caminho aberto, nao como
entrega.

Empate e desfeito pelo `id`, em ordem alfabetica: mesmo estado ⇒ mesma
recomendacao, sempre.

## Por que estes fatores

- **Bloqueio de lancamento** — enquanto existir, o produto nao pode receber
  usuario real; nada e mais urgente.
- **Severidade** — o custo de errar aqui.
- **Destravamento transitivo** — usa o grafo inteiro, nao so os filhos diretos.
  E o que diferencia o Navigator de uma lista ordenada por gravidade.
- **Tarefas de IA destravadas** — uma decisao sua que libera sete tarefas para a
  IA vale mais do que uma tarefa isolada.
- **Gargalo do fundador** — decisao que depende de voce nao pode ser delegada e
  costuma travar tudo abaixo; por isso ganha bonus explicito.
- **Estado das dependencias** — nao entra como pontuacao, e sim como porta: um
  requisito com dependencia em aberto nunca e recomendado, por maior que fosse
  sua pontuacao. Recomendar algo que nao pode comecar seria pior que nao recomendar.

## Saida

- `nextBestAction`: a recomendacao, com explicacao em linguagem simples, quem e o
  responsavel, quantos requisitos destrava e a decomposicao da pontuacao.
- `candidates`: ranking completo. Alimenta "Depende de voce" e "IA pode fazer".
- `blocked`: o que espera dependencia, e por qual.

O campo `breakdown` existe para auditoria: sempre da para explicar por que a
recomendacao e essa, e nao outra.

## Limites conhecidos desta versao

- Nao considera esforco/tempo estimado (nao temos esse dado com confianca).
- Nao considera preferencia declarada do fundador.
- Os pesos sao hipoteses; ver `docs/CALIBRATION.md`.
