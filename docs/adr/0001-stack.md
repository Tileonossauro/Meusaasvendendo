# ADR 0001 — Stack inicial

**Status:** aceito · 2026-09-10

## Contexto

Precisamos de uma base capaz de sustentar um dashboard web e um motor de analise,
sem infraestrutura antecipada.

## Decisao

TypeScript estrito em ESM, Node >= 20. Core em TypeScript puro sem framework.
`zod` como unica dependencia de runtime (validacao de schema). `vitest` para
testes e `tsx` para scripts. Next.js (App Router) + Tailwind entram no Slice 1,
apenas para o Self-Build Dashboard. Vercel como alvo de deploy.

## Alternativas consideradas

- **Python** — ecossistema de analise estatica mais rico, mas separaria a
  linguagem do dashboard e dobraria o ferramental.
- **Next.js desde o primeiro commit** — traria o framework antes de existir
  qualquer regra de negocio para exibir.
- **Sem `zod`, validacao a mao** — evitaria uma dependencia, mas o framework e
  nosso ativo principal e merece validacao declarativa e madura.

## Consequencias

- O core e testavel sem navegador, sem servidor e sem rede.
- O dashboard consome os mesmos modulos que uma futura API consumira.
- Uma dependencia de runtime a manter.
