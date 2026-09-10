# FRAMEWORK.md — framework v0.1.0

Gerado a partir de `src/framework/framework.v0.json`. Ao adicionar ou remover
requisito, atualize este resumo (ver AGENTS.md).

**Total: 44 requisitos em 12 categorias.**

Pesos marcados como NAO calibrados (`weightsAreCalibrated: false`). Ver `docs/CALIBRATION.md`.

## Campos de cada requisito

A linguagem de leigo e ESCRITA A MAO e versionada junto do requisito. Nunca
dependemos de uma chamada de IA para traduzir o requisito em tempo de exibicao.

| Campo | Para que serve |
| --- | --- |
| `simpleExplanation` | O que aparece por padrao na interface, em linguagem de leigo |
| `technicalExplanation` | So atras de "ver detalhes tecnicos" |
| `whyItMatters` | Por que este requisito importa |
| `impactSummary` | O que acontece se ficar em aberto |
| `userActionRequired` | O fundador precisa agir? (validado contra `owner`) |
| `aiCanHandle` | A IA consegue executar sozinha? |

## Requisitos por categoria

| Categoria | Requisitos | Bloqueiam lancamento |
| --- | --- | --- |
| Produto e escopo | 4 | 0 |
| Fundação do projeto | 4 | 0 |
| Dados | 3 | 1 |
| Identidade e acesso | 4 | 3 |
| Nucleo funcional | 3 | 1 |
| Monetização | 6 | 2 |
| Segurança | 5 | 5 |
| Confiabilidade e observabilidade | 2 | 1 |
| Deploy e entrega | 4 | 2 |
| Jurídico e privacidade | 2 | 1 |
| Lançamento | 2 | 0 |
| Prontidão para desenvolvimento com IA | 5 | 0 |

## Lista completa

### Produto e escopo

_Você sabe o que está construindo e para quem._

| id | requisito | responsavel | acao do fundador? | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- | --- |
| `product.promise-defined` | Promessa principal definida | founder | sim | high | 8/3/5 |
| `product.target-user-defined` | Público-alvo definido | founder | sim | medium | 5/2/3 |
| `product.core-flow-defined` | Fluxo principal descrito ponta a ponta | founder_and_ai | sim | high | 8/3/5 |
| `product.constitution` | Project Constitution existe | founder_and_ai | sim | high | 4/3/9 |

### Fundação do projeto

_O projeto tem base técnica organizada para crescer._

| id | requisito | responsavel | acao do fundador? | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- | --- |
| `foundation.repo-structure` | Estrutura de repositório legível | ai | nao | medium | 2/3/8 |
| `foundation.typecheck-gate` | Verificação de tipos automatizada | ai | nao | high | 2/5/9 |
| `foundation.test-gate` | Testes automatizados executáveis | ai | nao | high | 2/7/9 |
| `foundation.env-example` | Variáveis de ambiente documentadas | ai | nao | medium | 1/5/6 |

### Dados

_As informações do seu produto são guardadas de forma confiável._

| id | requisito | responsavel | acao do fundador? | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- | --- |
| `data.persistence-chosen` | Forma de guardar dados decidida | founder_and_ai | sim | high | 5/5/4 |
| `data.schema-defined` | Formato dos dados definido | ai | nao | high | 6/6/5 |
| `data.migrations` | Mudanças de banco versionadas | ai | nao | high | 1/7/5 |

### Identidade e acesso

_As pessoas conseguem entrar e só veem o que e delas._

| id | requisito | responsavel | acao do fundador? | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- | --- |
| `auth.method-decided` | Método de login decidido | founder | sim | blocker | 6/4/3 |
| `auth.login-works` | Cadastro e login funcionam de verdade | ai | nao | blocker | 8/7/2 |
| `auth.session-protection` | Sessão protegida | ai | nao | blocker | 1/8/2 |
| `auth.authorization-checks` | Cada um só vê o que é seu | ai | nao | blocker | 3/10/2 |

### Nucleo funcional

_A promessa principal do produto realmente funciona._

| id | requisito | responsavel | acao do fundador? | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- | --- |
| `core.primary-flow-implemented` | Fluxo principal implementado | ai | nao | blocker | 10/6/2 |
| `core.primary-flow-tested` | Fluxo principal coberto por teste | ai | nao | high | 4/8/8 |
| `core.error-and-empty-states` | O produto se comporta quando algo da errado | ai | nao | medium | 4/6/1 |

### Monetização

_Você consegue cobrar de verdade e entregar o que foi pago._

| id | requisito | responsavel | acao do fundador? | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- | --- |
| `billing.pricing-decided` | Preço e planos decididos | founder | sim | blocker | 0/4/2 |
| `billing.gateway-configured` | Meio de pagamento configurado | integration | sim | blocker | 0/5/1 |
| `billing.checkout-implemented` | Tela de pagamento funciona | ai | nao | blocker | 0/6/1 |
| `billing.webhook-idempotency` | Confirmação de pagamento processada uma única vez | ai | nao | blocker | 0/9/1 |
| `billing.entitlements` | Quem pagou recebe o que pagou | ai | nao | blocker | 0/9/1 |
| `billing.cancellation-flow` | Cancelamento e reembolso tratados | ai | nao | high | 0/7/1 |

### Segurança

_Seu produto não está aberto para quem não deveria entrar._

| id | requisito | responsavel | acao do fundador? | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- | --- |
| `security.no-secrets-in-repo` | Nenhuma senha ou chave dentro do código | ai | nao | blocker | 2/10/4 |
| `security.input-validation` | Entradas do usuário validadas no servidor | ai | nao | high | 2/8/3 |
| `security.rate-limiting` | Limite de tentativas em rotas sensíveis | ai | nao | high | 0/8/2 |
| `security.untrusted-content-boundary` | Conteúdo analisado tratado como não confiável | ai | nao | blocker | 3/10/4 |
| `security.least-privilege-access` | Acesso mínimo a sistemas de terceiros | founder_and_ai | sim | high | 1/8/2 |

### Confiabilidade e observabilidade

_Você fica sabendo quando algo quebra._

| id | requisito | responsavel | acao do fundador? | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- | --- |
| `reliability.error-tracking` | Você fica sabendo quando quebra | integration | sim | high | 0/7/2 |
| `reliability.health-check` | Verificação de saúde do sistema | ai | nao | medium | 0/5/1 |

### Deploy e entrega

_O produto está no ar e você consegue publicar mudanças._

| id | requisito | responsavel | acao do fundador? | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- | --- |
| `deploy.hosting-decided` | Onde o produto vai rodar está decidido | founder_and_ai | sim | medium | 3/4/3 |
| `deploy.ci-pipeline` | Verificação automática a cada mudança | ai | nao | high | 1/6/10 |
| `deploy.production-deploy-works` | O produto está realmente no ar | founder_and_ai | sim | blocker | 5/8/2 |
| `deploy.env-secrets-management` | Segredos guardados no lugar certo | founder_and_ai | sim | high | 1/7/3 |

### Jurídico e privacidade

_Você tem o mínimo legal para receber usuários e dinheiro._

| id | requisito | responsavel | acao do fundador? | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- | --- |
| `legal.terms-and-privacy` | Termos de uso e politica de privacidade | founder_and_ai | sim | high | 0/6/1 |
| `legal.data-retention-policy` | Politica de retenção de dados | founder | sim | medium | 0/5/1 |

### Lançamento

_Existe uma porta de entrada e alguém já usou de verdade._

| id | requisito | responsavel | acao do fundador? | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- | --- |
| `launch.landing-page` | Porta de entrada pública | founder_and_ai | sim | medium | 3/3/1 |
| `launch.first-real-user-test` | Alguém de fora usou de verdade | founder | sim | high | 6/5/1 |

### Prontidão para desenvolvimento com IA

_Um agente de IA consegue continuar este projeto sem quebrar tudo._

| id | requisito | responsavel | acao do fundador? | severidade | pesos (MVP/Prod/AI) |
| --- | --- | --- | --- | --- | --- |
| `ai.claude-md` | Manual do projeto para agentes | ai | nao | high | 1/2/10 |
| `ai.agents-md` | Regras de trabalho para agentes | ai | nao | high | 1/2/9 |
| `ai.quality-gates-runnable` | Verificações rodam com um comando | ai | nao | high | 1/4/10 |
| `ai.decision-log` | Histórico de decisões | ai | nao | medium | 1/2/8 |
| `ai.framework-validation` | Framework validado automaticamente | ai | nao | high | 2/3/9 |

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
