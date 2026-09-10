---
adr: "0007"
status: aceito
date: 2026-09-10
---

# ADR 0007 — Execucao de comandos so em repositorio confiavel

**Status:** aceito · 2026-09-10
**Tipo:** nota de arquitetura de seguranca

## Contexto

O scanner deterministico (Marco 3) executa comandos do projeto analisado
(`npm run typecheck`, `npm run test`, `npm run gates`) para provar que os gates
de qualidade realmente passam. Executar e a unica forma de distinguir
"script declarado" de "script que funciona" — sem isso o scanner cairia no
falso positivo que ele existe para evitar.

Hoje isso e seguro por um motivo unico e temporario: **o unico repositorio
analisado e o proprio Readiness OS.** E codigo nosso, revisado, confiavel.

Isso deixa de ser verdade no momento em que analisarmos o repositorio de outra
pessoa. Um `package.json` de terceiro pode declarar qualquer coisa em qualquer
script. Executar isso no nosso host daria a um repositorio desconhecido
**execucao arbitraria de codigo** na nossa maquina, com as nossas variaveis de
ambiente, as nossas credenciais e a nossa rede. Seria a falha mais grave
possivel num produto cuja promessa e justamente avaliar seguranca.

Nao e um risco hipotetico: e o caminho de ataque mais obvio contra este produto.

## Decisao

**Repositorio de terceiro NUNCA tem seus comandos executados no host do
Readiness OS.**

Antes de existir scanner de repositorio externo, a execucao de comandos precisa
acontecer em ambiente isolado, com **todas** as seguintes propriedades:

1. **Isolado e descartavel** — container ou microVM criada para a analise e
   destruida ao final; nada persiste entre analises.
2. **Sem segredos internos** — nenhuma variavel de ambiente, token, chave ou
   credencial do Readiness OS visivel no ambiente de execucao.
3. **Limite de recursos** — CPU, memoria e disco limitados, para que uma
   analise nao derrube a plataforma.
4. **Timeout obrigatorio** — todo comando tem prazo maximo; estourou, morre.
5. **Politica de rede explicita** — sem rede por padrao; qualquer excecao
   precisa ser justificada e registrada.
6. **Sistema de arquivos somente leitura** fora do diretorio da analise.

Enquanto a sandbox nao existir, o scanner externo roda **apenas leitura
estatica**, sem execucao de comando. Um requisito que so poderia ser provado
executando fica `uncertain` — nunca `completed` por inferencia.

## Guarda estrutural implementada agora

`scanRepository()` recebe `trust: "self" | "external"` (padrao `self`), e
**lanca `UntrustedExecutionError`** se alguem pedir `runCommands` com
`trust: "external"`. Ha uma segunda guarda dentro do proprio executor, para que
nenhum caminho futuro contorne a checagem.

Um teste de regressao cobre os dois pontos. A sandbox **nao** foi construida
agora — o objetivo desta ADR e impedir que o executor atual seja reaproveitado
para repositorios externos por engano.

## Alternativas consideradas

- **Nao executar nada, nunca** — elimina o risco e reintroduz o falso positivo
  de "script declarado = script funcionando". Perderiamos a evidencia mais forte
  que temos (`command_execution`).
- **Lista de comandos permitidos** — parece seguro e nao e: o conteudo do script
  e definido pelo repositorio analisado, nao pelo nome. `npm run test` pode
  executar qualquer coisa.
- **Executar com usuario sem privilegio no mesmo host** — mitiga, nao resolve:
  a rede e as variaveis de ambiente do processo continuam alcancaveis.

## Consequencias

- O scanner atual continua util e rapido para o dogfooding, sem mudanca.
- O trabalho de sandbox fica explicitamente registrado como pre-requisito do
  scanner externo (`docs/BACKLOG.md`, DT-002), nao como detalhe de implementacao
  a ser lembrado depois.
- Um agente futuro que tente reusar o executor para repositorio de terceiro
  encontra o erro na primeira execucao, nao em producao.
