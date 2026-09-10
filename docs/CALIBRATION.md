# CALIBRATION.md — os pesos sao hipoteses

## Declaracao explicita

Os pesos, limiares e pontuacoes da versao 0.1.0 do framework **nao sao verdade
cientifica**. Sao palpites informados, escritos para serem substituidos.

Por isso `framework.v0.json` carrega `"weightsAreCalibrated": false`, e um teste
garante que esse campo continue falso ate existir calibracao real.

## O que precisa ser calibrado

| Parametro | Valor atual | Onde vive |
| --- | --- | --- |
| Pesos por requisito e dimensao | 0 a 10, atribuidos a mao | `framework.v0.json` |
| Porta de confianca | 0,7 | `src/scoring/score.ts` |
| Limiar de "medido" (obsoleto) | 0,6 | `src/scoring/score.ts` |
| Cobertura ponderada para suficiencia | 0,70 | `src/scoring/sufficiency.ts` |
| Forca minima num critico da dimensao | 0,60 | `src/scoring/sufficiency.ts` |
| Peso a partir do qual um critico conta | 5 | `src/scoring/sufficiency.ts` |
| Peso a partir do qual cegueira bloqueia | 7 | `src/scoring/sufficiency.ts` |
| Forca por proveniencia | ver `PROVENANCE_STRENGTH` | `src/scoring/sufficiency.ts` |
| Adequacao proveniencia x tipo | ver `KIND_FIT` | `src/scoring/sufficiency.ts` |
| Teto por bloqueio de lancamento | 49 | `src/scoring/score.ts` |
| Pontos de severidade | 40 / 25 / 12 / 5 | `src/navigator/next-best-action.ts` |
| Pesos do Next Best Action | ver `NBA_WEIGHTS` | `src/navigator/next-best-action.ts` |

## Como calibrar (quando houver projetos reais)

1. Rodar o framework contra um conjunto de projetos reais de estagios diferentes.
2. Coletar julgamento humano independente sobre cada projeto.
3. Medir: **falso positivo** (dissemos pronto, nao estava), **falso negativo**
   (dissemos faltando, estava pronto), **concordancia humana**, **aplicabilidade**
   (quantos requisitos foram corretamente considerados nao aplicaveis) e
   **estabilidade do score** entre execucoes.
4. Ajustar pesos e limiares; registrar cada ajuste com o motivo.
5. Incrementar `frameworkVersion` e registrar em `docs/CHANGELOG.md`.

Prioridade de erro: **reduzir falso positivo primeiro.** Dizer "esta pronto" para
algo que nao esta destroi a confianca no produto; dizer "ainda falta verificar"
apenas custa uma checagem.

## O modelo de suficiencia tambem e hipotese

`SUFFICIENCY_MODEL_VERSION = "1.0.0"` com `SUFFICIENCY_CALIBRATED = false`.

As tabelas `PROVENANCE_STRENGTH` e `KIND_FIT` sao julgamento de engenharia
escrito para ser substituido por medicao. O que precisa ser testado:

- executar um comando realmente observa mais que ler o codigo? Quanto mais?
- 0,70 de cobertura ponderada e conservador ou frouxo demais na pratica?
- a excecao do `missing` (ausencia vale adequacao 1) produz falso negativo?
- o piso de peso 5 para criticidade por dimensao esta no lugar certo?

## Historico de calibracao

Nenhuma calibracao realizada ate agora. O modelo de suficiencia nasceu em
2026-09-10 junto com o pagamento da DT-001.
