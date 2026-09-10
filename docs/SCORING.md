# SCORING.md — como o numero e calculado

Implementacao: `src/scoring/score.ts`. Testes: `tests/scoring.test.ts`.

## Regra absoluta

**O LLM nao decide a porcentagem final.** Ele pode encontrar evidencia,
interpretar codigo, classificar status e declarar incerteza. O numero sai de
codigo deterministico. Mesmo estado ⇒ mesmo score.

## Entradas

- O framework (requisitos, pesos por dimensao, aplicabilidade).
- O estado do projeto (status, confianca e metodo de verificacao por requisito).
- Os sinais do projeto (ex.: `charges_money`, `has_user_accounts`).

## Passo a passo

### 1. Aplicabilidade

Um requisito entra no calculo quando `applicability.always` for verdadeiro, ou
quando o projeto tem **todos** os sinais exigidos. Requisito nao aplicavel sai do
numerador e do denominador — nao penaliza nem premia.

### 2. Peso por dimensao

Cada requisito tem tres pesos (0 a 10): `mvp`, `production`, `aiBuild`.
Peso 0 significa "nao participa desta dimensao". As dimensoes sao calculadas
separadamente e **nunca somadas entre si**.

### 3. Credito por status

| Status | Credito |
| --- | --- |
| `completed` | 1,0 |
| `partial` | 0,5 |
| `missing` | 0 |
| `blocked` | 0 |
| `uncertain` | 0 |
| `not_applicable` | fora do calculo |

Requisito sem estado registrado conta como **ausente**, nunca como pronto.

### 4. Porta de confianca

Confianca abaixo de **0,7** (`CONFIDENCE_THRESHOLD`) rebaixa o credito para no
maximo 0,5, mesmo com status `completed`. Preferimos falso negativo a falso
positivo: um "pronto" mal evidenciado vale o mesmo que "parcial".

### 5. Media ponderada

```
score_bruto = round( 100 * Σ(peso × credito) / Σ(peso) )
```

### 6. Teto por bloqueio de lancamento

Requisitos marcados `launchBlocking` impedem o produto de receber usuarios reais.
Se algum estiver em aberto, o **Production Score** e limitado a **49**
(`LAUNCH_BLOCKED_CAP`), e o relatorio informa quais bloqueadores causaram o teto.

O teto vale **apenas para Production**. O MVP Score mede se o produto cumpre a
promessa, nao se e seguro — misturar os dois destruiria a informacao contida na
diferenca entre eles.

### 7. Medido ou nao medido

`measuredCoverage` = fracao dos requisitos aplicaveis cuja verificacao foi
automatica (`deterministic`, `tool` ou `llm`). Estado declarado manualmente
(`manual_bootstrap`) e resposta do fundador (`ask_user`) **nao contam como medicao**.

Abaixo de **0,6** (`MEASURED_COVERAGE_THRESHOLD`) a dimensao volta com
`measured: false`, e a interface e obrigada a exibir
**"Bootstrap / ainda nao medido"** em vez de tratar o numero como prontidao real.

Transparencia vale mais que dashboard bonita.

## Saida

Por dimensao: `score`, `rawScore`, `cappedByLaunchBlockers`, `measured`,
`measuredCoverage`, `applicableCount`, `totalWeight`, `openLaunchBlockers` e o
detalhamento por requisito (peso, status, confianca, credito aplicado e se houve
rebaixamento por confianca). Isso permite responder **por que** um score mudou.

## Calibracao

Os pesos e limiares desta versao sao **hipoteses**, nao verdade cientifica.
Ver `docs/CALIBRATION.md`.
