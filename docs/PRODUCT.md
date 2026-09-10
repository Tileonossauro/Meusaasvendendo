# PRODUCT.md — Readiness OS

## Promessa

**Conecte seu projeto SaaS e descubra quanto falta para termina-lo, o que falta,
o que esta bloqueando o lancamento, quem precisa agir e qual deve ser o proximo passo.**

## Para quem

Pessoas construindo SaaS com agentes de IA — Claude Code, Cursor, Codex, Lovable,
Replit e similares. Elas produzem software rapido, mas nao conseguem responder:

- o que ainda falta;
- se algo esta realmente pronto ou existe so visualmente;
- se podem receber usuarios reais;
- se podem cobrar;
- se ha problemas de seguranca;
- quais decisoes ainda dependem delas;
- o que a IA consegue resolver sozinha;
- qual deve ser a proxima tarefa.

Perfil secundario: quem constroi **varios** SaaS ao mesmo tempo e precisa enxergar
o portfolio inteiro em um lugar so.

## Problema

Velocidade de construcao aumentou; capacidade de julgamento sobre conclusao nao.
O resultado sao produtos que parecem prontos, mas nao suportam usuario real,
cobranca ou incidente de seguranca.

## Core job

"Me diga onde meu SaaS realmente esta e qual e a unica coisa que devo fazer agora."

## O que o produto faz

1. Representa o estado de um projeto contra um framework versionado de requisitos.
2. Calcula tres scores independentes de forma deterministica.
3. Monta o grafo de dependencias entre requisitos.
4. Recomenda a proxima acao com maior destravamento.
5. Separa o que depende do fundador do que a IA pode executar.
6. Reverifica e mostra o progresso mudando.

## Os tres scores

| Score | Pergunta que responde |
| --- | --- |
| **MVP Score** | O produto executa sua promessa principal? |
| **Production Score** | E seguro colocar usuarios reais e dinheiro aqui? |
| **AI Build Readiness** | Este repositorio esta preparado para continuar sendo desenvolvido por agentes de IA? |

Sao independentes de proposito. Um projeto com MVP 82% / Production 37% /
AI Build 64% carrega informacao valiosa exatamente na diferenca.

## Fluxo principal (core flow)

1. O fundador conecta ou aponta um projeto.
2. O Readiness OS coleta evidencia (determinismo primeiro, LLM so com evidencia).
3. Cada requisito aplicavel recebe status, confianca e evidencia.
4. Os tres scores sao calculados deterministicamente.
5. O Navigator identifica a proxima melhor acao e o que ela destrava.
6. O fundador ou a IA executa a acao.
7. O requisito e reverificado; estado, score e dashboard mudam.

O passo 7 fechando o ciclo e a definicao de sucesso do primeiro vertical slice.

## Nao e

- Um linter ou auditoria de codigo generica.
- Um substituto de pentest ou revisao de seguranca profissional.
- Um gerador de codigo.

## Estado atual

Bootstrap. Framework v0.1.0 com 44 requisitos, motores de scoring, grafo e
Navigator implementados e testados. Sem scanner automatico e sem interface —
por isso os scores aparecem como **"Bootstrap / ainda nao medido"**.
