import type { Framework, ProjectState, Requirement, RequirementState, Severity } from "../framework/schema.js";
import { buildGraph, type RequirementGraph } from "../graph/graph.js";
import { isApplicable } from "../scoring/score.js";

/**
 * NEXT BEST ACTION — o coracao do Navigator.
 *
 * Uma auditoria diz "voce tem 31 problemas". O Navigator diz "faca ESTA coisa
 * agora, porque ela destrava outras sete". O algoritmo e deterministico e
 * documentado em docs/NEXT_BEST_ACTION.md; o LLM nao vota aqui.
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
  /** Por requisito destravado (direta ou indiretamente) — a QUANTIDADE. */
  perUnlockedRequirement: 6,
  /**
   * Multiplicador sobre o peso somado dos requisitos destravados — a RELEVANCIA.
   * Destravar dois requisitos criticos vale mais que destravar cinco triviais.
   */
  unlockedWeight: 0.5,
  /** Bonus por bloqueador de lancamento destravado. */
  perUnlockedLaunchBlocker: 8,
  /** Multiplicador aplicado ao peso somado do proprio requisito. */
  ownWeight: 1.5,
  /** Bonus quando destrava tarefas que a IA consegue executar sozinha. */
  perUnlockedAiTask: 4,
  /** Decisao do fundador que destrava trabalho tende a ser gargalo: priorize. */
  founderBottleneck: 15,
} as const;

export interface ActionCandidate {
  requirement: Requirement;
  priority: number;
  /** Requisitos aplicaveis ainda nao concluidos que este destrava (transitivo). */
  unlocks: string[];
  unlockedAiTasks: number;
  /** Peso somado dos requisitos destravados: a relevancia, nao so a contagem. */
  unlockedWeight: number;
  unlockedLaunchBlockers: number;
  /** Explicacao ja em linguagem simples — o produto e "simple first". */
  reason: string;
  breakdown: Record<string, number>;
}

export interface NavigatorResult {
  /** A recomendacao. `null` quando nao ha nada disponivel (tudo pronto ou tudo bloqueado). */
  nextBestAction: ActionCandidate | null;
  /** Ranking completo, ordenado. Alimenta "depende de voce" e "IA pode fazer". */
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

    const unlocks = (graph.transitiveDependents.get(requirement.id) ?? []).filter(isOpen);
    const unlockedRequirements = unlocks.map((id) => byId.get(id)!);
    const unlockedAiTasks = unlockedRequirements.filter((r) => r.aiCanHandle).length;
    const unlockedLaunchBlockers = unlockedRequirements.filter((r) => r.launchBlocking).length;
    const unlockedWeight = unlockedRequirements.reduce(
      (sum, r) => sum + r.weights.mvp + r.weights.production + r.weights.aiBuild,
      0,
    );

    const ownWeight =
      requirement.weights.mvp + requirement.weights.production + requirement.weights.aiBuild;
    const founderIsBottleneck = requirement.userActionRequired && unlocks.length > 0;

    const breakdown = {
      severity: SEVERITY_POINTS[requirement.severity] * NBA_WEIGHTS.severity,
      launchBlocking: requirement.launchBlocking ? NBA_WEIGHTS.launchBlocking : 0,
      unlocks: unlocks.length * NBA_WEIGHTS.perUnlockedRequirement,
      unlockedWeight: unlockedWeight * NBA_WEIGHTS.unlockedWeight,
      unlockedLaunchBlockers: unlockedLaunchBlockers * NBA_WEIGHTS.perUnlockedLaunchBlocker,
      unlockedAiTasks: unlockedAiTasks * NBA_WEIGHTS.perUnlockedAiTask,
      ownWeight: ownWeight * NBA_WEIGHTS.ownWeight,
      founderBottleneck: founderIsBottleneck ? NBA_WEIGHTS.founderBottleneck : 0,
    };

    const priority = Math.round(Object.values(breakdown).reduce((a, b) => a + b, 0) * 100) / 100;

    candidates.push({
      requirement,
      priority,
      unlocks,
      unlockedAiTasks,
      unlockedWeight,
      unlockedLaunchBlockers,
      reason: buildReason(requirement, unlocks.length, unlockedAiTasks),
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

function buildReason(requirement: Requirement, unlockCount: number, aiTasks: number): string {
  const parts: string[] = [];
  if (requirement.launchBlocking) {
    parts.push("Impede que o produto receba usuarios reais.");
  }
  if (unlockCount > 0) {
    parts.push(
      aiTasks > 0
        ? `Destrava ${unlockCount} requisito(s), sendo ${aiTasks} que a IA consegue executar sozinha.`
        : `Destrava ${unlockCount} requisito(s).`,
    );
  }
  if (parts.length === 0) {
    parts.push("Nao destrava outros itens, mas ainda falta para o produto cumprir a promessa.");
  }
  return parts.join(" ");
}
