import type { Framework, ProjectState, Requirement, RequirementState, Severity } from "../framework/schema.js";
import { buildGraph, type RequirementGraph } from "../graph/graph.js";
import { isApplicable } from "../scoring/score.js";

/**
 * NEXT BEST ACTION — o coracao do Navigator.
 *
 * Uma auditoria diz "voce tem 31 problemas". O Navigator diz "faca ESTA coisa
 * agora, porque ela destrava outras sete". O algoritmo e deterministico e
 * documentado em docs/NEXT_BEST_ACTION.md; o LLM nao vota aqui.
 *
 * DESTRAVA AGORA vs IMPACTO FUTURO
 * --------------------------------
 * Num grafo A -> B -> C -> D, concluir A torna B executavel imediatamente.
 * C e D continuam bloqueados: A apenas abre caminho para eles.
 *
 * Chamar os quatro de "destravados" seria mentira para o fundador. Por isso o
 * resultado separa:
 *   - `unlocksNow`        — ficam executaveis IMEDIATAMENTE ao concluir esta acao;
 *   - `downstreamImpact`  — descendentes que esta acao ajuda a liberar depois.
 *
 * O grafo transitivo continua alimentando o ranking (impacto de longo prazo
 * importa), mas com peso menor que o destravamento imediato.
 */

const SEVERITY_POINTS: Record<Severity, number> = {
  blocker: 40,
  high: 25,
  medium: 12,
  low: 5,
};

/** Pesos do ranking. Sao HIPOTESES calibraveis, nao verdade cientifica. */
export const NBA_WEIGHTS = {
  severity: 1,
  launchBlocking: 30,
  /** Por requisito que fica executavel IMEDIATAMENTE. */
  perUnlockedNow: 6,
  /** Multiplicador sobre o peso somado dos destravados agora (relevancia). */
  unlocksNowWeight: 0.5,
  /** Por descendente que esta acao ajuda a liberar no futuro. Vale menos. */
  perDownstream: 2,
  /** Multiplicador sobre o peso somado do impacto futuro. Vale menos. */
  downstreamWeight: 0.2,
  /** Bonus por bloqueador de lancamento na cadeia (imediato ou futuro). */
  perUnlockedLaunchBlocker: 8,
  /** Bonus por tarefa de IA que fica executavel agora. */
  perUnlockedAiTaskNow: 4,
  /** Multiplicador aplicado ao peso somado do proprio requisito. */
  ownWeight: 1.5,
  /** Decisao do fundador que destrava trabalho tende a ser gargalo: priorize. */
  founderBottleneck: 15,
} as const;

export interface ActionCandidate {
  requirement: Requirement;
  priority: number;
  /** Ficam executaveis IMEDIATAMENTE ao concluir esta acao. */
  unlocksNow: string[];
  /** Descendentes que esta acao ajuda a liberar depois — nao agora. */
  downstreamImpact: string[];
  /** Quantas das tarefas destravadas agora a IA consegue executar sozinha. */
  unlockedAiTasksNow: number;
  /** Bloqueadores de lancamento em toda a cadeia (imediatos + futuros). */
  unlockedLaunchBlockers: number;
  unlocksNowWeight: number;
  downstreamWeight: number;
  /** Explicacao ja em linguagem simples — o produto e "simple first". */
  reason: string;
  breakdown: Record<string, number>;
}

export interface NavigatorResult {
  /** A recomendacao. `null` quando nao ha nada disponivel. */
  nextBestAction: ActionCandidate | null;
  /** Ranking completo. Alimenta "depende de voce" e "IA pode fazer". */
  candidates: ActionCandidate[];
  /** Aplicaveis, em aberto, mas com dependencia nao satisfeita. */
  blocked: { requirementId: string; waitingOn: string[] }[];
}

const OPEN_STATUSES = new Set(["missing", "partial", "uncertain", "blocked"]);

export function computeNextBestAction(
  framework: Framework,
  projectState: ProjectState,
  graph: RequirementGraph = buildGraph(framework),
): NavigatorResult {
  const stateById = new Map<string, RequirementState>(
    projectState.states.map((s) => [s.requirementId, s]),
  );
  const byId = new Map(framework.requirements.map((r) => [r.id, r]));

  const statusOf = (id: string): string => stateById.get(id)?.status ?? "missing";
  const applicable = (r: Requirement): boolean => isApplicable(r, projectState.signals);
  const isOpen = (id: string): boolean => {
    const req = byId.get(id);
    if (!req || !applicable(req)) return false;
    const status = statusOf(id);
    return status !== "not_applicable" && OPEN_STATUSES.has(status);
  };
  const isSatisfied = (id: string): boolean => {
    const req = byId.get(id);
    if (!req || !applicable(req)) return true; // dependencia nao aplicavel nao trava nada
    const status = statusOf(id);
    return status === "completed" || status === "not_applicable";
  };

  const sumWeights = (ids: string[]): number =>
    ids.reduce((sum, id) => {
      const r = byId.get(id);
      return r ? sum + r.weights.mvp + r.weights.production + r.weights.aiBuild : sum;
    }, 0);

  const candidates: ActionCandidate[] = [];
  const blocked: { requirementId: string; waitingOn: string[] }[] = [];

  for (const requirement of framework.requirements) {
    if (!applicable(requirement)) continue;
    if (!isOpen(requirement.id)) continue;

    const waitingOn = requirement.dependsOn.filter((d) => !isSatisfied(d));
    if (waitingOn.length > 0) {
      blocked.push({ requirementId: requirement.id, waitingOn });
      continue;
    }

    // Destrava AGORA: dependente direto, em aberto, cujas OUTRAS dependencias
    // ja estao satisfeitas. Concluir este requisito o torna executavel.
    const unlocksNow = (graph.dependents.get(requirement.id) ?? [])
      .filter(isOpen)
      .filter((id) => {
        const dependent = byId.get(id)!;
        return dependent.dependsOn
          .filter((d) => d !== requirement.id)
          .every((d) => isSatisfied(d));
      })
      .sort();

    const immediate = new Set(unlocksNow);
    // Impacto futuro: todo o resto da descendencia em aberto.
    const downstreamImpact = (graph.transitiveDependents.get(requirement.id) ?? [])
      .filter(isOpen)
      .filter((id) => !immediate.has(id))
      .sort();

    const unlockedAiTasksNow = unlocksNow.filter((id) => byId.get(id)!.aiCanHandle).length;
    const unlockedLaunchBlockers = [...unlocksNow, ...downstreamImpact].filter(
      (id) => byId.get(id)!.launchBlocking,
    ).length;

    const unlocksNowWeight = sumWeights(unlocksNow);
    const downstreamWeight = sumWeights(downstreamImpact);
    const ownWeight =
      requirement.weights.mvp + requirement.weights.production + requirement.weights.aiBuild;
    const touchesSomething = unlocksNow.length + downstreamImpact.length > 0;
    const founderIsBottleneck = requirement.userActionRequired && touchesSomething;

    const breakdown = {
      severity: SEVERITY_POINTS[requirement.severity] * NBA_WEIGHTS.severity,
      launchBlocking: requirement.launchBlocking ? NBA_WEIGHTS.launchBlocking : 0,
      unlocksNow: unlocksNow.length * NBA_WEIGHTS.perUnlockedNow,
      unlocksNowWeight: unlocksNowWeight * NBA_WEIGHTS.unlocksNowWeight,
      downstreamImpact: downstreamImpact.length * NBA_WEIGHTS.perDownstream,
      downstreamWeight: downstreamWeight * NBA_WEIGHTS.downstreamWeight,
      unlockedLaunchBlockers: unlockedLaunchBlockers * NBA_WEIGHTS.perUnlockedLaunchBlocker,
      unlockedAiTasksNow: unlockedAiTasksNow * NBA_WEIGHTS.perUnlockedAiTaskNow,
      ownWeight: ownWeight * NBA_WEIGHTS.ownWeight,
      founderBottleneck: founderIsBottleneck ? NBA_WEIGHTS.founderBottleneck : 0,
    };

    const priority = Math.round(Object.values(breakdown).reduce((a, b) => a + b, 0) * 100) / 100;

    candidates.push({
      requirement,
      priority,
      unlocksNow,
      downstreamImpact,
      unlockedAiTasksNow,
      unlockedLaunchBlockers,
      unlocksNowWeight,
      downstreamWeight,
      reason: buildReason(requirement, unlocksNow.length, downstreamImpact.length, unlockedAiTasksNow),
      breakdown,
    });
  }

  // Desempate por id: mesmo estado => mesma recomendacao, sempre.
  candidates.sort((a, b) =>
    b.priority !== a.priority
      ? b.priority - a.priority
      : a.requirement.id.localeCompare(b.requirement.id),
  );
  blocked.sort((a, b) => a.requirementId.localeCompare(b.requirementId));

  return { nextBestAction: candidates[0] ?? null, candidates, blocked };
}

/**
 * Texto em linguagem de leigo — e precisa ser VERDADEIRO:
 * "destrava agora" e "abre caminho para" sao coisas diferentes.
 */
function buildReason(
  requirement: Requirement,
  nowCount: number,
  downstreamCount: number,
  aiTasksNow: number,
): string {
  const parts: string[] = [];

  if (requirement.launchBlocking) {
    parts.push("Impede que o produto receba usuários reais.");
  }

  if (nowCount > 0 && downstreamCount > 0) {
    parts.push(
      `Destrava ${plural(nowCount, "tarefa", "tarefas")} agora e abre caminho para outros ${downstreamCount} requisito(s).`,
    );
  } else if (nowCount > 0) {
    parts.push(`Destrava ${plural(nowCount, "tarefa", "tarefas")} agora.`);
  } else if (downstreamCount > 0) {
    parts.push(
      `Não destrava nada de imediato, mas abre caminho para ${downstreamCount} requisito(s) mais adiante.`,
    );
  }

  if (aiTasksNow > 0) {
    parts.push(`${aiTasksNow} delas a IA consegue executar sozinha.`);
  }

  if (parts.length === 0) {
    parts.push("Não destrava outros itens, mas ainda falta para o produto cumprir a promessa.");
  }

  return parts.join(" ");
}

function plural(count: number, singular: string, plural_: string): string {
  return `${count} ${count === 1 ? singular : plural_}`;
}
