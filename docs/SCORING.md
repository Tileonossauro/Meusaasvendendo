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

### 7. Medido ou nao medido — cobertura NAO e suficiencia

Sao duas perguntas diferentes, que antes eram respondidas pelo mesmo numero:

| Pergunta | Nome | Responde |
| --- | --- | --- |
| Quanto conseguimos observar? | **cobertura** | tamanho da superficie vista |
| Observamos o bastante para publicar? | **suficiencia** | se o numero pode sair |

Contar requisitos respondia mal as duas — era a DT-001. Quem libera o score
agora e a **suficiencia**, calculada em `src/scoring/sufficiency.ts`.

#### Em linguagem de fundador

Antes de mostrar uma nota, o sistema se pergunta tres coisas:

1. **"Olhei a maior parte do que importa nesta pergunta?"**
   Nao e "olhei muitos itens" — e "olhei os itens que pesam". Precisa de 70%.
2. **"Os itens decisivos desta pergunta estao bem olhados?"**
   Se algo que decide seguranca ou lancamento so tem evidencia fraca, o numero
   nao sai.
3. **"Existe algo importante sobre o qual eu nao sei absolutamente nada?"**
   Um unico ponto cego de peso alto ja impede a publicacao.

Se qualquer resposta for "nao", aparece **"Bootstrap / ainda nao medido"** —
com o motivo escrito na tela.

**Cada uma das tres perguntas do produto e avaliada separadamente.** E esperado
e desejavel que "os agentes conseguem continuar este projeto?" seja publicavel
antes de "e seguro colocar dinheiro aqui?".

#### Formula tecnica

**Forca da observacao** de um requisito (0 a 1) — o quanto SABEMOS sobre ele,
nao se ele esta pronto:

```
forca = forca_da_proveniencia × adequacao_ao_tipo × confianca
```

`forca_da_proveniencia`:

| Proveniencia | Valor |
| --- | --- |
| `human_declared` | 0 |
| `decision_record` | 0,5 |
| `llm_inference` | 0,6 |
| `static_analysis` | 0,8 |
| `specialized_tool` | 0,9 |
| `command_execution` | 1 |
| `runtime_probe` | 1 |

`adequacao_ao_tipo` (`KIND_FIT`) cruza a proveniencia com o `kind` do requisito.
Ler um arquivo prova que um documento existe; nao prova que um codigo funciona.
Um ADR vale 1 para `decision` e **0** para `implementation`.

**Excecao deliberada:** quando o status observado e `missing`, a adequacao vale 1.
Provar que algo NAO existe nao exige executar nada — e uma observacao forte.

**Por dimensao**, com as tres portas:

```
cobertura_ponderada = Σ(peso × forca) / Σ(peso)          → precisa ≥ 0,70

criticos_da_dimensao = requisitos com (launchBlocking OU severidade blocker)
                       E peso ≥ 5 NESTA dimensao          → todos com forca ≥ 0,60

pontos_cegos = requisitos com peso ≥ 7 e forca = 0        → precisa ser vazio

suficiente = as tres portas abertas
```

Criticidade e **relativa a dimensao**: `core.primary-flow-implemented` pesa 10
no MVP (critico) e 2 no AI Build (nao critico). Um requisito nao trava uma
dimensao em que ele quase nao pesa.

#### Limiares sao hipoteses

`SUFFICIENCY_MODEL_VERSION = "1.0.0"`, `SUFFICIENCY_CALIBRATED = false`.
Versionados, testados e calibraveis. Ver `docs/CALIBRATION.md`.

#### As coberturas continuam existindo

`evidenceCoverage` e `independentCoverage` seguem no relatorio como medida de
superficie observada, uteis para acompanhar progresso. **Elas nao liberam mais
o score** — quem faz isso e a suficiencia.

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
