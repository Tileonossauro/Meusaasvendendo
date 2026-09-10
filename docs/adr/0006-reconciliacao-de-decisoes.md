---
adr: "0006"
status: aceito
date: 2026-09-10
---

# ADR 0006 — Reconciliacao entre documentacao e estado

**Status:** aceito · 2026-09-10

## Contexto

O dogfooding encontrou uma inconsistencia real: o Navigator recomendava ao
fundador **tomar uma decisao que ele ja tinha tomado**. O requisito
`data.persistence-chosen` estava `missing`, enquanto o ADR 0004 ja registrava
formalmente a decisao de persistencia.

A causa nao foi um erro num requisito especifico. Foi uma lacuna estrutural:

1. O estado de cada requisito foi escrito a mao no bootstrap, a partir de uma
   lista fixa.
2. Nada relia a documentacao depois disso.
3. `verifiedBy: "manual_bootstrap"` significa exatamente "ninguem verificou" —
   e nada reverificava.

Ou seja: qualquer decisao registrada apos o bootstrap ficava invisivel para o
estado. Corrigir o requisito na mao resolveria o sintoma e deixaria a causa.

## Decisao

Criar o **reconciliador de decisoes** (`src/collectors/adr-reconciler.ts`),
o primeiro coletor deterministico do projeto.

Cada ADR passa a carregar front-matter legivel por maquina declarando quais
requisitos ele decide:

```
---
adr: "0004"
status: aceito
decides:
  - data.persistence-chosen
---
```

Duas ligacoes possiveis:

- `decides` — o ADR satisfaz a Definition of Done do requisito por completo
  (status `completed`, confianca 0,9);
- `decidesPartially` — o ADR decide parte dela (status `partial`, confianca 0,7),
  com o que falta anotado no campo `note`.

O reconciliador le esses arquivos e produz **propostas** de estado com evidencia
`arquivo:linha`. Ele nunca escreve: quem aplica e `npm run reconcile -- --apply`,
que tambem registra os eventos no historico.

Somente ADRs com status aceito contam. ADR que declara decidir um requisito
inexistente derruba os quality gates.

## Alternativas consideradas

- **Corrigir o estado do requisito na mao** — resolveria este caso e deixaria o
  proximo acontecer em silencio. Foi explicitamente rejeitado.
- **Deduzir a ligacao com LLM lendo os ADRs** — nao deterministico, e violaria a
  ordem de deteccao do projeto quando existe alternativa deterministica.
- **Guardar a ligacao no framework** — inverteria a dependencia: o framework e
  generico e nao deve conhecer os ADRs de um projeto especifico.

## Consequencias

- Decisao registrada e decisao refletida no estado. Um teste de guarda impede
  que um requisito com ADR aceito volte a aparecer como pendente.
- E o primeiro estado do projeto com `verifiedBy: "deterministic"`: sai do
  bootstrap manual e entra em verificacao automatica de verdade.
- O mecanismo generaliza: ao ser criado, encontrou sozinho um **segundo**
  requisito desatualizado (`deploy.hosting-decided`), que ninguem tinha notado.
- E o molde dos proximos coletores. O scanner de codigo seguira o mesmo contrato:
  ler fonte de verdade, propor estado com evidencia, nunca escrever direto.

## Limite conhecido

Um ADR prova que a decisao foi **tomada e registrada**, nao que foi
**implementada**. Por isso a confianca e 0,9 e nao 1,0, e por isso requisitos de
implementacao continuam dependendo do scanner.
