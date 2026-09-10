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


## Build Progress NAO e Readiness

Sao quatro numeros distintos, e a interface e obrigada a mostra-los separados:

| Numero | O que mede | Tem porcentagem? |
| --- | --- | --- |
| **Build Progress** | Quanto do nosso PLANO DE CONSTRUCAO ja foi construido | Sempre |
| **MVP Readiness** | O produto cumpre a promessa principal? | So quando medido |
| **Production Readiness** | E seguro colocar usuarios e dinheiro aqui? | So quando medido |
| **AI Build Readiness** | Agentes de IA conseguem continuar este projeto? | So quando medido |

Build Progress vem de `src/progress/build-progress.ts`, calculado sobre os marcos
declarados em `data/projects/<projectId>/build-plan.json` (concluido = 1,
em andamento = 0,5, planejado = 0, ponderado por marco). Ele pode ter
porcentagem justamente porque **nao afirma nada sobre o produto** — afirma
apenas quanto do nosso proprio plano executamos.

Os tres Readiness Scores so exibem numero quando `measured` for verdadeiro.
Enquanto nao for, a interface mostra **"Bootstrap / ainda nao medido"**. Essa
regra vive no modelo de dados (`ReadinessCard.percent` vem `null`), nao na tela:
assim a interface nao tem como esquecer de aplica-la, e existe teste garantindo.

## Versao do framework em toda analise

Todo resultado carrega o `frameworkVersion` que o produziu — em `ScoreReport`,
no estado do projeto e em cada evento do historico. Sem isso nao da para comparar
resultados entre versoes do framework, nem explicar por que um score mudou apos
uma mudanca de regra.

## Limite conhecido de `measuredCoverage`

A cobertura hoje e uma **contagem** de requisitos verificados, sem considerar
peso, criticidade, metodo de verificacao ou confianca. Isso significa que 60% de
requisitos triviais poderiam fazer uma dimensao parecer medida enquanto os
requisitos criticos seguem sem evidencia.

E divida tecnica **deliberada e registrada** (DT-001 em `docs/BACKLOG.md`), a ser
paga antes de qualquer dimensao cruzar o limiar pela primeira vez. Hoje a
cobertura real e de 8% — muito abaixo do limiar —, entao a divida ainda nao
produz dano.

## Barras de categoria nao sao readiness

O mapa do projeto mostra uma barra por area. Ela e calculada sobre o **estado
declarado** dos requisitos, que hoje vem majoritariamente de `manual_bootstrap`.

Cada cartao carrega um rotulo dizendo de onde veio o preenchimento
(`estado declarado`, `parte verificada`, `verificado`), e o mapa inteiro tem um
aviso enquanto houver estado declarado. Readiness verificado por evidencia
aparece **somente** nos tres Readiness Scores.

## Calibracao

Os pesos e limiares desta versao sao **hipoteses**, nao verdade cientifica.
Ver `docs/CALIBRATION.md`.
