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
| Limiar de "medido" | 0,6 | `src/scoring/score.ts` |
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

## Historico de calibracao

Nenhuma calibracao realizada ate agora.
