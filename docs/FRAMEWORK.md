# FRAMEWORK.md — framework v0.1.0

Gerado a partir de `src/framework/framework.v0.json`. Ao adicionar ou remover
requisito, atualize este resumo (ver AGENTS.md).

**Total: 44 requisitos em 12 categorias.**

Pesos marcados como NAO calibrados (`weightsAreCalibrated: false`). Ver `docs/CALIBRATION.md`.

## Requisitos por categoria

| Categoria | Requisitos | Bloqueiam lancamento |
| --- | --- | --- |
| Produto e escopo | 4 | 0 |
| Fundacao do projeto | 4 | 0 |
| Dados | 3 | 1 |
| Identidade e acesso | 4 | 3 |
| Nucleo funcional | 3 | 1 |
| Monetizacao | 6 | 2 |
| Seguranca | 5 | 5 |
| Confiabilidade e observabilidade | 2 | 1 |
| Deploy e entrega | 4 | 2 |
| Juridico e privacidade | 2 | 1 |
| Lancamento | 2 | 0 |
| Prontidao para desenvolvimento com IA | 5 | 0 |

## Lista completa

### Produto e escopo

_Voce sabe o que esta construindo e para quem._

| id | requisito | responsavel | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- |
| `product.promise-defined` | Promessa principal definida | founder | high | 8/3/5 |
| `product.target-user-defined` | Publico-alvo definido | founder | medium | 5/2/3 |
| `product.core-flow-defined` | Fluxo principal descrito ponta a ponta | founder_and_ai | high | 8/3/5 |
| `product.constitution` | Project Constitution existe | founder_and_ai | high | 4/3/9 |

### Fundacao do projeto

_O projeto tem base tecnica organizada para crescer._

| id | requisito | responsavel | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- |
| `foundation.repo-structure` | Estrutura de repositorio legivel | ai | medium | 2/3/8 |
| `foundation.typecheck-gate` | Verificacao de tipos automatizada | ai | high | 2/5/9 |
| `foundation.test-gate` | Testes automatizados executaveis | ai | high | 2/7/9 |
| `foundation.env-example` | Variaveis de ambiente documentadas | ai | medium | 1/5/6 |

### Dados

_As informacoes do seu produto sao guardadas de forma confiavel._

| id | requisito | responsavel | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- |
| `data.persistence-chosen` | Forma de guardar dados decidida | founder_and_ai | high | 5/5/4 |
| `data.schema-defined` | Formato dos dados definido | ai | high | 6/6/5 |
| `data.migrations` | Mudancas de banco versionadas | ai | high | 1/7/5 |

### Identidade e acesso

_As pessoas conseguem entrar e so veem o que e delas._

| id | requisito | responsavel | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- |
| `auth.method-decided` | Metodo de login decidido | founder | blocker | 6/4/3 |
| `auth.login-works` | Cadastro e login funcionam de verdade | ai | blocker | 8/7/2 |
| `auth.session-protection` | Sessao protegida | ai | blocker | 1/8/2 |
| `auth.authorization-checks` | Cada um so ve o que e seu | ai | blocker | 3/10/2 |

### Nucleo funcional

_A promessa principal do produto realmente funciona._

| id | requisito | responsavel | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- |
| `core.primary-flow-implemented` | Fluxo principal implementado | ai | blocker | 10/6/2 |
| `core.primary-flow-tested` | Fluxo principal coberto por teste | ai | high | 4/8/8 |
| `core.error-and-empty-states` | O produto se comporta quando algo da errado | ai | medium | 4/6/1 |

### Monetizacao

_Voce consegue cobrar de verdade e entregar o que foi pago._

| id | requisito | responsavel | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- |
| `billing.pricing-decided` | Preco e planos decididos | founder | blocker | 0/4/2 |
| `billing.gateway-configured` | Meio de pagamento configurado | integration | blocker | 0/5/1 |
| `billing.checkout-implemented` | Tela de pagamento funciona | ai | blocker | 0/6/1 |
| `billing.webhook-idempotency` | Confirmacao de pagamento processada uma unica vez | ai | blocker | 0/9/1 |
| `billing.entitlements` | Quem pagou recebe o que pagou | ai | blocker | 0/9/1 |
| `billing.cancellation-flow` | Cancelamento e reembolso tratados | ai | high | 0/7/1 |

### Seguranca

_Seu produto nao esta aberto para quem nao deveria entrar._

| id | requisito | responsavel | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- |
| `security.no-secrets-in-repo` | Nenhuma senha ou chave dentro do codigo | ai | blocker | 2/10/4 |
| `security.input-validation` | Entradas do usuario validadas no servidor | ai | high | 2/8/3 |
| `security.rate-limiting` | Limite de tentativas em rotas sensiveis | ai | high | 0/8/2 |
| `security.untrusted-content-boundary` | Conteudo analisado tratado como nao confiavel | ai | blocker | 3/10/4 |
| `security.least-privilege-access` | Acesso minimo a sistemas de terceiros | founder_and_ai | high | 1/8/2 |

### Confiabilidade e observabilidade

_Voce fica sabendo quando algo quebra._

| id | requisito | responsavel | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- |
| `reliability.error-tracking` | Voce fica sabendo quando quebra | integration | high | 0/7/2 |
| `reliability.health-check` | Verificacao de saude do sistema | ai | medium | 0/5/1 |

### Deploy e entrega

_O produto esta no ar e voce consegue publicar mudancas._

| id | requisito | responsavel | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- |
| `deploy.hosting-decided` | Onde o produto vai rodar esta decidido | founder_and_ai | medium | 3/4/3 |
| `deploy.ci-pipeline` | Verificacao automatica a cada mudanca | ai | high | 1/6/10 |
| `deploy.production-deploy-works` | O produto esta realmente no ar | founder_and_ai | blocker | 5/8/2 |
| `deploy.env-secrets-management` | Segredos guardados no lugar certo | founder_and_ai | high | 1/7/3 |

### Juridico e privacidade

_Voce tem o minimo legal para receber usuarios e dinheiro._

| id | requisito | responsavel | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- |
| `legal.terms-and-privacy` | Termos de uso e politica de privacidade | founder_and_ai | high | 0/6/1 |
| `legal.data-retention-policy` | Politica de retencao de dados | founder | medium | 0/5/1 |

### Lancamento

_Existe uma porta de entrada e alguem ja usou de verdade._

| id | requisito | responsavel | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- |
| `launch.landing-page` | Porta de entrada publica | founder_and_ai | medium | 3/3/1 |
| `launch.first-real-user-test` | Alguem de fora usou de verdade | founder | high | 6/5/1 |

### Prontidao para desenvolvimento com IA

_Um agente de IA consegue continuar este projeto sem quebrar tudo._

| id | requisito | responsavel | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- |
| `ai.claude-md` | Manual do projeto para agentes | ai | high | 1/2/10 |
| `ai.agents-md` | Regras de trabalho para agentes | ai | high | 1/2/9 |
| `ai.quality-gates-runnable` | Verificacoes rodam com um comando | ai | high | 1/4/10 |
| `ai.decision-log` | Historico de decisoes | ai | medium | 1/2/8 |
| `ai.framework-validation` | Framework validado automaticamente | ai | high | 2/3/9 |

## Sinais de projeto usados pela aplicabilidade

- `analyzes_external_content`
- `charges_money`
- `connects_external_accounts`
- `has_backend`
- `has_real_users`
- `has_user_accounts`
- `is_deployed`
- `owns_a_framework`
- `stores_user_data`
- `uses_database`

Requisito sem sinal exigido (`always: true`) vale para todo projeto.
