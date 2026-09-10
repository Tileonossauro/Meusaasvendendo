# VERTICAL_SLICE.md — o primeiro loop completo

## Objetivo

Nossa primeira vitoria nao e login nem cobranca. E o **loop fechado**:

1. o framework existe;
2. o Readiness OS representa o proprio estado;
3. o dashboard mostra esse estado;
4. o Navigator identifica a proxima acao;
5. Leonardo ou a IA executa essa acao;
6. o requisito e reverificado;
7. o estado muda;
8. o score muda;
9. o dashboard mostra o novo progresso.

Quando isso funcionar ponta a ponta, temos o primeiro vertical slice.

## Estado apos o bootstrap (esta entrega)

Passos 1, 2, 4 e 6 (manual) ja funcionam via `npm run report`.
Faltam 3, 8 e 9 — ou seja, a interface.

## Escopo do Slice 1

1. Next.js (App Router) + Tailwind, apenas o necessario.
2. Rota `/build` — Self-Build Dashboard, lendo `data/projects/readiness-os/state.json`
   e o framework em tempo de build/servidor. Sem banco, sem autenticacao.
3. Hierarquia da tela, nesta ordem:
   - **HERO** — Readiness OS, "Construindo o proprio Readiness OS", progresso geral,
     os tres scores (com o rotulo "Bootstrap / ainda nao medido" enquanto for o caso);
   - **NEXT BEST ACTION** — elemento de maior destaque depois dos scores:
     nome, explicacao simples, responsavel, impacto, quantos requisitos destrava, CTA;
   - **AGORA** — o que esta sendo construido;
   - **DEPENDE DE VOCE** — decisoes que exigem o fundador;
   - **IA PODE FAZER** — tarefas disponiveis para agente;
   - **BLOQUEADORES** — apenas os relevantes;
   - **MAPA DO PROJETO** — 12 blocos de categoria com progresso, completos e faltantes;
   - **RECENTEMENTE CONCLUIDO** — historico curto;
   - **DETALHES** — progressive disclosure: evidencia, arquivo, linha, confianca,
     requisito tecnico.
4. Um `history.json` por projeto para alimentar "recentemente concluido" e a
   variacao de progresso.
5. Teste garantindo que o dashboard nunca exibe score como medido quando
   `measured` for falso.

## Fora do Slice 1

Scanner automatico, GitHub, banco, autenticacao, multi-projeto na interface,
cobranca. Ver `docs/BACKLOG.md`.

## Como saberemos que funcionou

Executamos a acao recomendada pelo Navigator (por exemplo, implementar a fronteira
de confianca contra conteudo nao confiavel), atualizamos o estado com evidencia
real, recarregamos `/build` e vemos o score subir — de X% para Y% — com o item
aparecendo em "recentemente concluido" e uma nova recomendacao no lugar da antiga.
