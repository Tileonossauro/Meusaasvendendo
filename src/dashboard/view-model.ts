import { readFileSync } from "node:fs";
import path from "node:path";
import { isIndependentlyVerified, loadFramework, type Category, type Requirement } from "../framework/index.js";
import { parseProjectState } from "../state/index.js";
import { parseProjectHistory, recentEvents, type HistoryEvent } from "../history/schema.js";
import { computeBuildProgress, parseBuildPlan, type BuildProgress, type Milestone } from "../progress/build-progress.js";
import { computeScoreReport, DIMENSIONS, isApplicable, type Dimension, type DimensionScore } from "../scoring/score.js";
import { computeNextBestAction, type ActionCandidate } from "../navigator/next-best-action.js";
import type { ProjectState, RequirementState } from "../framework/schema.js";

/**
 * Monta tudo que o dashboard precisa, para UM projeto.
 *
 * Multi-projeto: a funcao recebe `projectId` e le de `data/projects/<projectId>/`.
 * Nada aqui assume que existe um projeto so — o piloto e que e um projeto so.
 */

const DIMENSION_LABELS: Record<Dimension, string> = {
  mvp: "MVP Readiness",
  production: "Production Readiness",
  aiBuild: "AI Build Readiness",
};

const DIMENSION_QUESTIONS: Record<Dimension, string> = {
  mvp: "O produto executa sua promessa principal?",
  production: "É seguro colocar usuários reais e dinheiro aqui?",
  aiBuild: "Agentes de IA conseguem continuar este projeto com segurança?",
};

export interface ReadinessCard {
  dimension: Dimension;
  label: string;
  question: string;
  /**
   * `null` enquanto nao houver medicao por evidencia real.
   * A interface e OBRIGADA a exibir "Bootstrap / ainda nao medido" nesse caso.
   */
  percent: number | null;
  measured: boolean;
  /** Cobertura por evidencia de qualquer origem (inclui ADR). */
  evidenceCoverage: number;
  /** Cobertura por scanner independente. E esta que libera o score. */
  independentCoverage: number;
  /** Requisitos criticos sem verificacao independente. */
  criticalWithoutIndependentEvidence: string[];
  applicableCount: number;
  /** Calculo provisorio, exposto so em "detalhes tecnicos". Nunca como prontidao. */
  provisionalPercent: number;
  cappedByLaunchBlockers: boolean;
  openLaunchBlockers: string[];
}

export interface CategoryBlock {
  category: Category;
  total: number;
  completed: number;
  partial: number;
  missing: number;
  blocked: number;
  notApplicable: number;
  /** Progresso da categoria, so para o mapa visual. Nao e Readiness Score. */
  percent: number;
  /** Quantos estados vieram de verificacao INDEPENDENTE (scanner). */
  verifiedCount: number;
  /** Quantos vieram de um registro de decisao (ADR) — declaracao, nao scanner. */
  decisionRecordCount: number;
  /** Quantos foram declarados a mao, sem nenhuma evidencia. */
  declaredCount: number;
  /**
   * De onde vem o preenchimento desta barra. Enquanto nao for "verified", a
   * barra NAO representa auditoria. A interface e obrigada a rotular isso.
   */
  evidenceSource: "declared" | "decision_record" | "mixed" | "verified";
}

/**
 * Verificacao INDEPENDENTE: o sistema observou o projeto por conta propria.
 * Declaracao humana e registro de decisao (ADR) nao contam.
 */
function isVerified(state: RequirementState | undefined): boolean {
  if (!state) return false;
  return isIndependentlyVerified(state.provenance) && state.evidence.length > 0;
}

export interface RequirementCardView {
  requirement: Requirement;
  state: RequirementState | null;
  status: string;
  /** Quantos ficam executaveis IMEDIATAMENTE. Nunca confundir com o de baixo. */
  unlocksNow: number;
  /** Quantos esta acao ajuda a liberar mais adiante. */
  downstreamImpact: number;
  unlockedAiTasksNow: number;
  priority: number;
  reason: string;
  breakdown: Record<string, number>;
}

export interface BlockerView {
  requirement: Requirement;
  waitingOn: { id: string; name: string }[];
  status: string;
  launchBlocking: boolean;
}

/**
 * O que a secao "AGORA" mostra. Quando nenhum marco esta em andamento, a tela
 * ainda precisa dizer algo util — normalmente que estamos esperando revisao.
 * A regra vive aqui, no dado, e nao no componente.
 */
export interface NowBuilding {
  milestone: Milestone;
  state: "in_progress" | "awaiting_review";
}

export interface DashboardViewModel {
  projectId: string;
  projectName: string;
  frameworkVersion: string;
  generatedAt: string;
  buildProgress: BuildProgress;
  milestones: Milestone[];
  nowBuilding: NowBuilding | null;
  readiness: ReadinessCard[];
  nextBestAction: RequirementCardView | null;
  dependsOnFounder: RequirementCardView[];
  aiCanDo: RequirementCardView[];
  blockers: BlockerView[];
  categories: CategoryBlock[];
  recentlyCompleted: HistoryEvent[];
  scoreDetails: Record<Dimension, DimensionScore>;
}

function readJson(projectId: string, file: string): unknown {
  const full = path.join(process.cwd(), "data", "projects", projectId, file);
  return JSON.parse(readFileSync(full, "utf8"));
}

function toCardView(candidate: ActionCandidate, state: ProjectState): RequirementCardView {
  return {
    requirement: candidate.requirement,
    state: state.states.find((s) => s.requirementId === candidate.requirement.id) ?? null,
    status: state.states.find((s) => s.requirementId === candidate.requirement.id)?.status ?? "missing",
    unlocksNow: candidate.unlocksNow.length,
    downstreamImpact: candidate.downstreamImpact.length,
    unlockedAiTasksNow: candidate.unlockedAiTasksNow,
    priority: candidate.priority,
    reason: candidate.reason,
    breakdown: candidate.breakdown,
  };
}

export function buildDashboardViewModel(projectId = "readiness-os"): DashboardViewModel {
  const framework = loadFramework();
  const state = parseProjectState(readJson(projectId, "state.json"));
  const history = parseProjectHistory(readJson(projectId, "history.json"));
  const plan = parseBuildPlan(readJson(projectId, "build-plan.json"));

  const scoreReport = computeScoreReport(framework, state);
  const navigator = computeNextBestAction(framework, state);
  const byId = new Map(framework.requirements.map((r) => [r.id, r]));
  const stateById = new Map(state.states.map((s) => [s.requirementId, s]));

  const readiness: ReadinessCard[] = DIMENSIONS.map((dimension) => {
    const d = scoreReport.dimensions[dimension];
    return {
      dimension,
      label: DIMENSION_LABELS[dimension],
      question: DIMENSION_QUESTIONS[dimension],
      // A regra vive aqui, no dado: a tela nao tem como "esquecer" de aplicar.
      percent: d.measured ? d.score : null,
      measured: d.measured,
      evidenceCoverage: d.evidenceCoverage,
      independentCoverage: d.independentCoverage,
      criticalWithoutIndependentEvidence: d.criticalWithoutIndependentEvidence,
      applicableCount: d.applicableCount,
      provisionalPercent: d.score,
      cappedByLaunchBlockers: d.cappedByLaunchBlockers,
      openLaunchBlockers: d.openLaunchBlockers,
    };
  });

  const candidates = navigator.candidates.map((c) => toCardView(c, state));

  const inProgress = plan.milestones.find((m) => m.status === "in_progress");
  const nextPlanned = plan.milestones.find((m) => m.status === "planned");
  const nowBuilding: NowBuilding | null = inProgress
    ? { milestone: inProgress, state: "in_progress" }
    : nextPlanned
      ? { milestone: nextPlanned, state: "awaiting_review" }
      : null;

  const categories: CategoryBlock[] = framework.categories.map((category) => {
    const reqs = framework.requirements.filter(
      (r) => r.category === category.id && isApplicable(r, state.signals),
    );
    const statusOf = (r: Requirement): string => stateById.get(r.id)?.status ?? "missing";
    const completed = reqs.filter((r) => statusOf(r) === "completed").length;
    const partial = reqs.filter((r) => statusOf(r) === "partial").length;
    const notApplicable = framework.requirements.filter(
      (r) => r.category === category.id && !isApplicable(r, state.signals),
    ).length;

    const verifiedCount = reqs.filter((r) => isVerified(stateById.get(r.id))).length;
    const decisionRecordCount = reqs.filter(
      (r) => stateById.get(r.id)?.provenance === "decision_record",
    ).length;
    const declaredCount = reqs.length - verifiedCount - decisionRecordCount;

    const evidenceSource: CategoryBlock["evidenceSource"] =
      verifiedCount === reqs.length && reqs.length > 0
        ? "verified"
        : verifiedCount > 0
          ? "mixed"
          : decisionRecordCount > 0
            ? "decision_record"
            : "declared";

    return {
      category,
      total: reqs.length,
      completed,
      partial,
      missing: reqs.filter((r) => statusOf(r) === "missing").length,
      blocked: reqs.filter((r) => statusOf(r) === "blocked").length,
      notApplicable,
      percent: reqs.length === 0 ? 0 : Math.round(((completed + partial * 0.5) / reqs.length) * 100),
      verifiedCount,
      decisionRecordCount,
      declaredCount,
      evidenceSource,
    };
  });

  const blockers: BlockerView[] = navigator.blocked
    .map((b) => {
      const requirement = byId.get(b.requirementId)!;
      return {
        requirement,
        waitingOn: b.waitingOn.map((id) => ({ id, name: byId.get(id)?.name ?? id })),
        status: stateById.get(b.requirementId)?.status ?? "missing",
        launchBlocking: requirement.launchBlocking,
      };
    })
    // Bloqueadores relevantes primeiro: os que impedem lancamento.
    .sort((a, b) => Number(b.launchBlocking) - Number(a.launchBlocking) || a.requirement.id.localeCompare(b.requirement.id));

  return {
    projectId: state.projectId,
    projectName: state.projectName,
    frameworkVersion: framework.frameworkVersion,
    generatedAt: scoreReport.computedAt,
    buildProgress: computeBuildProgress(plan),
    milestones: plan.milestones,
    nowBuilding,
    readiness,
    nextBestAction: candidates[0] ?? null,
    dependsOnFounder: candidates.filter((c) => c.requirement.userActionRequired),
    aiCanDo: candidates.filter((c) => c.requirement.aiCanHandle && !c.requirement.userActionRequired),
    blockers,
    categories,
    recentlyCompleted: recentEvents(history, 6),
    scoreDetails: scoreReport.dimensions,
  };
}
