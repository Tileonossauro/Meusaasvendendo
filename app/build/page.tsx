import { buildDashboardViewModel } from "../../src/dashboard/view-model.js";
import { BuildProgressCard, ReadinessCards } from "./components/ScoreCards";
import { NextBestAction } from "./components/NextBestAction";
import { RequirementList, BlockerList } from "./components/RequirementList";
import { ProjectMap } from "./components/ProjectMap";
import { RecentlyCompleted, NowBuilding } from "./components/History";
import { Section } from "./components/Section";

// Le arquivos locais a cada requisicao: editar o estado e recarregar a pagina
// ja mostra o novo progresso. E o que fecha o loop de dogfooding.
export const dynamic = "force-dynamic";

export default function BuildPage() {
  // Multi-projeto: o piloto e o Readiness OS, mas a funcao recebe o projeto.
  const vm = buildDashboardViewModel("readiness-os");

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-16">
      {/* HERO */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
          Readiness OS
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-50 md:text-4xl">
          Construindo o próprio Readiness OS
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-400">
          O primeiro projeto analisado pelo Readiness OS é ele mesmo. Esta página mostra o
          estado real da construção — sem terminal, sem código.
        </p>
        <p className="mt-3 text-xs text-slate-600">
          Framework v{vm.frameworkVersion} · projeto{" "}
          <span className="font-mono">{vm.projectId}</span>
        </p>
      </header>

      {/* BUILD PROGRESS — separado dos Readiness Scores de propósito */}
      <div className="mt-10">
        <BuildProgressCard progress={vm.buildProgress} />
      </div>

      {/* OS TRÊS READINESS SCORES */}
      <Section
        title="Prontidão do produto"
        hint="Três perguntas independentes. Nunca somadas entre si — a diferença entre elas é a informação."
      >
        <ReadinessCards cards={vm.readiness} />
      </Section>

      {/* NEXT BEST ACTION */}
      <NextBestAction action={vm.nextBestAction} />

      {/* AGORA */}
      <Section title="Agora" hint="O que está sendo construído neste momento.">
        <NowBuilding now={vm.nowBuilding} milestones={vm.milestones} />
      </Section>

      {/* DEPENDE DE VOCÊ */}
      <Section
        title="Depende de você"
        count={vm.dependsOnFounder.length}
        hint="Decisões que só você pode tomar. Cada uma normalmente destrava trabalho para a IA."
      >
        <RequirementList items={vm.dependsOnFounder} />
      </Section>

      {/* IA PODE FAZER */}
      <Section
        title="A IA pode fazer"
        count={vm.aiCanDo.length}
        hint="Tarefas prontas para um agente executar, sem precisar de você."
      >
        <RequirementList items={vm.aiCanDo} />
      </Section>

      {/* BLOQUEADORES */}
      <Section
        title="Bloqueadores"
        count={vm.blockers.length}
        hint="Itens que não podem começar porque esperam outra coisa terminar antes."
      >
        <BlockerList items={vm.blockers} />
      </Section>

      {/* MAPA DO PROJETO */}
      <Section
        title="Mapa do projeto"
        hint="As 12 áreas que um SaaS precisa cobrir, e quanto de cada uma já existe."
      >
        <ProjectMap blocks={vm.categories} />
      </Section>

      {/* RECENTEMENTE CONCLUÍDO */}
      <Section title="Recentemente concluído" hint="O que mudou por aqui.">
        <RecentlyCompleted events={vm.recentlyCompleted} />
      </Section>

      <footer className="mt-16 border-t border-ink-line pt-6 text-xs text-slate-600">
        Gerado a partir de dados locais versionados — nenhum número foi inventado. Enquanto os
        Readiness Scores não forem medidos por evidência real, eles aparecem como
        &ldquo;Bootstrap / ainda não medido&rdquo;.
      </footer>
    </main>
  );
}
