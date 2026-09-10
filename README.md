# Readiness OS

**Conecte seu projeto SaaS e descubra quanto falta para termina-lo, o que falta,
o que esta bloqueando o lancamento, quem precisa agir e qual deve ser o proximo passo.**

Um GPS de conclusao para quem constroi SaaS com agentes de IA.
O scanner e o motor; o **Navigator** e o produto.

> Uma auditoria diz "voce tem 31 problemas".
> O Readiness OS diz "faca ESTA coisa agora, porque ela destrava outras sete".

## Estado atual

**Marco 1 entregue.** O motor existe, e testado, e o Self-Build Dashboard esta
no ar em `/build`. O primeiro projeto analisado pelo Readiness OS e o proprio
Readiness OS.

```bash
npm install
npm run dev      # abre a interface — o dashboard fica em /build
npm run gates    # typecheck + validacao do framework + testes
npm run report   # estado atual do proprio projeto, no terminal
```

## Os quatro numeros (que nao se misturam)

| Numero | O que mede | Tem porcentagem? |
| --- | --- | --- |
| **Build Progress** | Quanto do plano de construcao ja foi construido | Sempre |
| **MVP Readiness** | O produto cumpre a promessa principal? | So quando medido |
| **Production Readiness** | E seguro colocar usuarios e dinheiro aqui? | So quando medido |
| **AI Build Readiness** | Agentes de IA conseguem continuar este projeto? | So quando medido |

Os tres Readiness Scores sao independentes: a diferenca entre eles carrega informacao.

Enquanto a verificacao automatica nao cobrir o suficiente, os scores aparecem como
**"Bootstrap / ainda nao medido"**. Transparencia vale mais que dashboard bonita.

## Documentacao

| Arquivo | Conteudo |
| --- | --- |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Promessa, publico, core flow |
| [docs/CONSTITUTION.md](docs/CONSTITUTION.md) | Escopo, fora de escopo, restricoes |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Como as pecas se encaixam |
| [docs/FRAMEWORK.md](docs/FRAMEWORK.md) | Os 44 requisitos |
| [docs/SCORING.md](docs/SCORING.md) | Como o numero e calculado |
| [docs/NEXT_BEST_ACTION.md](docs/NEXT_BEST_ACTION.md) | Como escolhemos o proximo passo |
| [docs/RESEARCH.md](docs/RESEARCH.md) | Estudo e licencas dos projetos de referencia |
| [docs/BACKLOG.md](docs/BACKLOG.md) | O que NAO sera feito agora |
| [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) | Contexto e regras para agentes |
