# RESEARCH.md — estudo dos projetos de referencia

Estudo feito em 2026-09-10, antes das decisoes de arquitetura. Nenhum codigo ou
texto foi copiado de qualquer projeto abaixo. O que herdamos sao **padroes**,
reimplementados do zero.

## Situacao de licenca (verificada arquivo a arquivo)

| Projeto | Licenca | O que podemos fazer |
| --- | --- | --- |
| roboco-io/vibe-ready-cli | MIT | Reutilizar codigo com aviso de copyright, se algum dia for util |
| finehq/vibe-coding-checklist | MIT | Reutilizar conteudo do checklist com atribuicao |
| aiqualitylab/vibe-coding-checklist | MIT | Idem |
| muyen/vibe-to-prod | MIT | Idem |
| roboco-io/roboco-cli | MIT | Idem |
| agent-team-foundation/launch-readiness-scan | **Sem arquivo de licenca** | **Todos os direitos reservados por padrao.** Somente leitura e aprendizado conceitual. Nao copiar codigo nem texto. |
| Mahmoudz/vibe-coding | Proprietaria permissiva | Permite usar e modificar para construir projetos proprios; **proibe redistribuir os materiais como produto**. Tratamos como estudo apenas, para eliminar qualquer risco. |

Regra adotada: **ideias sim, texto e codigo nao.** Todo requisito, texto e
algoritmo do Readiness OS foi escrito por nos.

## O que ADOTAMOS

1. **Evidencia com `arquivo:linha` obrigatoria** (launch-readiness-scan).
   Achado sem localizador nao e achado. Virou o campo `evidence.locator`.
2. **Separacao entre fato provavel estaticamente e inferencia** (launch-readiness-scan).
   Eles usam `confirmed` / `needs-check`; nos usamos `confidence` numerico com
   porta em 0,7 e o status `uncertain`.
3. **Funcao de decisao deterministica em vez de score por opiniao do modelo**
   (launch-readiness-scan). E a nossa regra absoluta de scoring.
4. **Aplicabilidade antes de cobranca**: nao inventar achado de autenticacao em
   site estatico. Virou `applicability` com sinais de projeto.
5. **Conteudo do repositorio analisado como dado nao confiavel**
   (launch-readiness-scan). Virou requisito de framework e regra de arquitetura.
6. **Categorias com peso e nivel de exigencia** (vibe-ready-cli). Virou peso por
   dimensao, com o refinamento de tres dimensoes independentes.
7. **Penalidade que limita o resultado geral** (vibe-ready-cli usa teto de nota
   quando categoria obrigatoria falha). Virou o teto de 49 no Production Score
   quando existe bloqueador de lancamento em aberto.
8. **Checklist como dado estruturado e versionado** (finehq, aiqualitylab).
   Reforcou a decisao de framework como JSON validado, nunca prompt.
9. **CLAUDE.md compacto com comandos reais e restricoes** (vibe-ready-cli, roboco-cli).
10. **Contrato legivel por maquina do relatorio** (launch-readiness-scan).
    Nosso `ScoreReport` carrega o detalhamento por requisito para explicar
    por que um score mudou.

## O que ADAPTAMOS

1. **Um score → tres scores.** Todos os projetos estudados produzem um numero
   unico. Achamos que a diferenca entre MVP, Production e AI Build carrega mais
   informacao que a media entre eles.
2. **Notas por letra → porcentagem.** Letra esconde a distancia ate o proximo
   passo; nosso publico quer saber quanto falta.
3. **Tiers inferidos → sinais de projeto.** Em vez de tres perfis fixos,
   usamos sinais (`charges_money`, `has_user_accounts`, ...) que ligam requisitos
   individualmente. Mais granular e mais facil de calibrar.
4. **Checklist plana → grafo de dependencias.** Nenhum projeto estudado modela
   dependencia entre itens. E exatamente o que permite dizer "faca isto, destrava
   sete coisas" — o nosso diferencial.
5. **Severidade tecnica → severidade + responsavel.** Separar `status` de `owner`
   nao aparece em nenhum dos projetos e e o que permite as listas "depende de voce"
   e "IA pode fazer".
6. **Relatorio unico → dashboard vivo, multi-projeto.**

## O que REJEITAMOS

1. **Pedir a nota ao modelo** (vibe-ready-cli pede `score: 0-100` por categoria ao
   LLM). Quebra reprodutibilidade: o mesmo repositorio pode oscilar entre execucoes.
   Nosso LLM classifica e evidencia; quem calcula e o codigo.
2. **Tom agressivo/roast no relatorio** (launch-readiness-scan). Funciona como
   marketing, mas nosso usuario e um fundador leigo tentando terminar um produto;
   humilhacao nao ajuda a decidir o proximo passo.
3. **Fluxo rigido de sete estagios com pop-ups obrigatorios.** Nosso produto e um
   painel continuo, nao uma auditoria de execucao unica.
4. **Checklists muito grandes sem aplicabilidade** (finehq: centenas de itens).
   Volume sem filtro paralisa; preferimos 44 requisitos com aplicabilidade real,
   crescendo para 80-120 com calibracao.
5. **Monorepo com backend, mobile e infraestrutura de exemplo** (vibe-to-prod).
   Otimo como material de estudo, infraestrutura antecipada demais para nos.
6. **Analise apenas por LLM, sem etapa deterministica.** Cara, lenta e instavel.

## O que poderia ser reutilizado no futuro (com licenca compativel)

- Conteudo de categorias de seguranca de finehq e aiqualitylab (MIT) como fonte
  ao expandir o framework para 80-120 requisitos — com atribuicao no repositorio.
- Checklists de producao de vibe-to-prod (MIT) como fonte de requisitos das
  categorias de deploy, secrets e CI/CD.

Nada disso foi incorporado ainda.
