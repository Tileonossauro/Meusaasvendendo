import { evaluateSufficiency, type SufficiencyInput, type SufficiencyResult } from "./sufficiency.js";
import {
  isIndependentlyVerified,
  type Framework,
  type ProjectState,
  type Requirement,
  type RequirementState,
  type RequirementStatus,
} from "../framework/schema.js";

/**
 * SCORING DETERMINISTICO.
 *
 * REGRA ABSOLUTA: o LLM nunca decide a porcentagem. Ele pode encontrar
 * evidencia, classificar status e declarar confianca. O numero final sai
 * daqui, das mesmas entradas, sempre igual.
 */

export type Dimension = "mvp" | "production" | "aiBuild";
export const DIMENSIONS: Dimension[] = ["mvp", "production", "aiBuild"];

/**
 * Abaixo deste limiar a evidencia nao e boa o bastante para dar credito total.
 * Preferimos falso negativo a falso positivo: um "completed" com confianca
 * baixa vale o mesmo que "partial".
 */
export const CONFIDENCE_THRESHOLD = 0.7;

/**
 * @deprecated Substituido pelo modelo de suficiencia (`src/scoring/sufficiency.ts`).
 *
 * Contar requisitos verificados era a DT-001: 60% de requisitos triviais podia
 * liberar um score enquanto os criticos seguiam cegos. Mantido apenas como
 * referencia historica; `measured` NAO depende mais deste numero.
 */
export const MEASURED_COVERAGE_THRESHOLD = 0.6;

/** Teto imposto quando existe requisito que bloqueia lancamento em aberto. */
export const LAUNCH_BLOCKED_CAP = 49;

const STATUS_CREDIT: Record<RequirementStatus, number> = {
  completed: 1,
  partial: 0.5,
  missing: 0,
  blocked: 0,
  uncertain: 0,
  not_applicable: 0, // excluido do denominador antes de chegar aqui
};

export interface RequirementScoreDetail {
  requirementId: string;
  weight: number;
  status: RequirementStatus;
  confidence: number;
  /** Credito efetivamente aplicado, ja rebaixado por confianca insuficiente. */
  credit: number;
  /** true quando a confianca baixa reduziu o credito. */
  downgradedByConfidence: boolean;
}

export interface DimensionScore {
  dimension: Dimension;
  /** 0..100. So e leitura de prontidao real quando `measured` for true. */
  score: number;
  /** Score antes de qualquer teto por bloqueio de lancamento. */
  rawScore: number;
  cappedByLaunchBlockers: boolean;
  /** false => exibir "Bootstrap / ainda nao medido" em vez do numero. */
  measured: boolean;
  /**
   * Fracao dos aplicaveis com QUALQUER evidencia registrada — inclui ADR.
   * Util para acompanhar progresso, NAO suficiente para liberar o score.
   */
  evidenceCoverage: number;
  /**
   * Fracao dos aplicaveis verificados por SCANNER INDEPENDENTE (leitura de
   * codigo, execucao de comando, ferramenta dedicada). E esta que libera o score.
   */
  independentCoverage: number;
  /**
   * Requisitos criticos sem verificacao independente. Informativo — quem decide
   * se o score pode ser publicado e `sufficiency`.
   */
  criticalWithoutIndependentEvidence: string[];
  /**
   * SUFICIENCIA DE MEDICAO: observamos material suficiente para publicar este
   * score? Avaliada por dimensao, de forma independente. E ela que define
   * `measured`. Ver docs/SCORING.md e src/scoring/sufficiency.ts.
   */
  sufficiency: SufficiencyResult;
  applicableCount: number;
  totalWeight: number;
  openLaunchBlockers: string[];
  details: RequirementScoreDetail[];
}

export interface ScoreReport {
  projectId: string;
  frameworkVersion: string;
  dimensions: Record<Dimension, DimensionScore>;
  computedAt: string;
}

/** Um requisito e aplicavel quando `always`, ou quando o projeto tem todos os sinais exigidos. */
export function isApplicable(requirement: Requirement, projectSignals: string[]): boolean {
  if (requirement.applicability.always) return true;
  return requirement.applicability.requiresSignals.every((s) => projectSignals.includes(s));
}

function creditFor(state: RequirementState): { credit: number; downgraded: boolean } {
  const base = STATUS_CREDIT[state.status];
  if (base > 0 && state.confidence < CONFIDENCE_THRESHOLD) {
    // Rebaixamento conservador: confianca fraca nunca vale credito total.
    return { credit: Math.min(base, 0.5), downgraded: true };
  }
  return { credit: base, downgraded: false };
}

/** Qualquer evidencia registrada — inclusive declaracao lida de um ADR. */
function hasAnyEvidence(state: RequirementState): boolean {
  return state.provenance !== "human_declared" && state.evidence.length > 0;
}

/**
 * Verificacao independente: o sistema observou o projeto por conta propria.
 * `human_declared` e `decision_record` NAO contam.
 */
function hasIndependentEvidence(state: RequirementState): boolean {
  return isIndependentlyVerified(state.provenance) && state.evidence.length > 0;
}

export function computeDimensionScore(
  framework: Framework,
  projectState: ProjectState,
  dimension: Dimension,
): DimensionScore {
  const stateById = new Map(projectState.states.map((s) => [s.requirementId, s]));
  const details: RequirementScoreDetail[] = [];
  const openLaunchBlockers: string[] = [];

  let weightedSum = 0;
  let totalWeight = 0;
  let withEvidence = 0;
  let independentlyVerified = 0;
  let applicableCount = 0;
  const criticalWithoutIndependentEvidence: string[] = [];
  const sufficiencyInputs: SufficiencyInput[] = [];

  // Ordem estavel: o relatorio precisa ser diff-friendly.
  const requirements = [...framework.requirements].sort((a, b) => a.id.localeCompare(b.id));

  for (const requirement of requirements) {
    const weight = requirement.weights[dimension];
    if (weight === 0) continue;
    if (!isApplicable(requirement, projectState.signals)) continue;

    const state = stateById.get(requirement.id);
    // Requisito sem estado registrado conta como ausente, nunca como pronto.
    const effective: RequirementState = state ?? {
      requirementId: requirement.id,
      status: "missing",
      confidence: 1,
      evidence: [],
      provenance: "human_declared",
      collectionMethod: "manual",
      updatedAt: projectState.updatedAt,
    };

    if (effective.status === "not_applicable") continue;

    applicableCount += 1;
    const { credit, downgraded } = creditFor(effective);
    weightedSum += weight * credit;
    totalWeight += weight;
    if (hasAnyEvidence(effective)) withEvidence += 1;
    if (hasIndependentEvidence(effective)) {
      independentlyVerified += 1;
    } else if (requirement.launchBlocking || requirement.severity === "blocker") {
      criticalWithoutIndependentEvidence.push(requirement.id);
    }

    if (requirement.launchBlocking && effective.status !== "completed") {
      openLaunchBlockers.push(requirement.id);
    }

    sufficiencyInputs.push({ requirement, state, weight });

    details.push({
      requirementId: requirement.id,
      weight,
      status: effective.status,
      confidence: effective.confidence,
      credit,
      downgradedByConfidence: downgraded,
    });
  }

  const rawScore = totalWeight === 0 ? 0 : Math.round((weightedSum / totalWeight) * 100);

  // O teto vale apenas para Production: MVP mede promessa, nao seguranca.
  const shouldCap = dimension === "production" && openLaunchBlockers.length > 0;
  const score = shouldCap ? Math.min(rawScore, LAUNCH_BLOCKED_CAP) : rawScore;

  const evidenceCoverage = applicableCount === 0 ? 0 : withEvidence / applicableCount;
  const independentCoverage = applicableCount === 0 ? 0 : independentlyVerified / applicableCount;

  // COBERTURA responde "quanto observamos". SUFICIENCIA responde "observamos o
  // bastante para publicar". Sao perguntas diferentes: quem libera o score e a
  // segunda, avaliada por dimensao, independentemente das outras.
  const sufficiency = evaluateSufficiency(dimension, sufficiencyInputs);
  const measured = sufficiency.sufficient;

  return {
    dimension,
    score,
    rawScore,
    cappedByLaunchBlockers: shouldCap && score < rawScore,
    measured,
    evidenceCoverage: Math.round(evidenceCoverage * 100) / 100,
    independentCoverage: Math.round(independentCoverage * 100) / 100,
    criticalWithoutIndependentEvidence,
    sufficiency,
    applicableCount,
    totalWeight,
    openLaunchBlockers,
    details,
  };
}

export function computeScoreReport(
  framework: Framework,
  projectState: ProjectState,
  now: string = new Date().toISOString(),
): ScoreReport {
  const dimensions = Object.fromEntries(
    DIMENSIONS.map((d) => [d, computeDimensionScore(framework, projectState, d)]),
  ) as Record<Dimension, DimensionScore>;

  return {
    projectId: projectState.projectId,
    frameworkVersion: framework.frameworkVersion,
    dimensions,
    computedAt: now,
  };
}
