import type {
  CollectionMethod,
  Provenance,
  Requirement,
  RequirementKind,
  RequirementState,
  RequirementStatus,
} from "../framework/schema.js";
import type { Dimension } from "./score.js";

/**
 * SUFICIENCIA DE MEDICAO — o pagamento da DT-001.
 *
 * Duas perguntas DIFERENTES, que estavam sendo respondidas pelo mesmo numero:
 *
 *   COBERTURA    "quanto da superficie conseguimos observar?"
 *   SUFICIENCIA  "observamos material suficiente para PUBLICAR este score?"
 *
 * Contar requisitos respondia mal as duas. 60% de requisitos triviais nao
 * autoriza publicar um Production Score enquanto os criticos seguem cegos.
 *
 * A regra abaixo e deterministica, auditavel e conservadora. Os limiares sao
 * HIPOTESES DE PRODUTO, versionadas aqui e calibraveis — nao estatistica.
 *
 * Cada dimensao prova a propria suficiencia. Nao existe porta global: e
 * desejavel que AI Build seja publicavel enquanto Production ainda nao e.
 */

export const SUFFICIENCY_MODEL_VERSION = "1.0.0";

/** Os limiares sao hipoteses. Ver docs/CALIBRATION.md. */
export const SUFFICIENCY_CALIBRATED = false;

/**
 * Quanto cada proveniencia vale como observacao.
 * Declaracao humana nao observa nada; executar um comando observa o fato.
 */
export const PROVENANCE_STRENGTH: Record<Provenance, number> = {
  human_declared: 0,
  decision_record: 0.5,
  llm_inference: 0.6,
  static_analysis: 0.8,
  specialized_tool: 0.9,
  command_execution: 1,
  runtime_probe: 1,
};

/**
 * Adequacao da proveniencia ao TIPO do requisito.
 *
 * Ler um arquivo prova que um documento existe. Nao prova que um codigo
 * funciona, nem que um servico esta no ar. Um ADR prova uma decisao e nada alem.
 */
export const KIND_FIT: Record<RequirementKind, Partial<Record<Provenance, number>>> = {
  // A DoD e uma decisao registrada: ler o registro E a verificacao adequada.
  decision: { decision_record: 1, static_analysis: 1, llm_inference: 0.7 },
  // A DoD e um arquivo existir com conteudo: leitura estatica basta.
  artifact: { static_analysis: 1, command_execution: 1, decision_record: 0.4, llm_inference: 0.6 },
  // A DoD e codigo que funciona: so executar prova. Ler o codigo observa em parte.
  implementation: {
    command_execution: 1,
    specialized_tool: 1,
    runtime_probe: 1,
    static_analysis: 0.6,
    llm_inference: 0.4,
    decision_record: 0,
  },
  // A DoD depende do sistema no ar: so observacao de runtime prova.
  operational: {
    runtime_probe: 1,
    command_execution: 0.5,
    specialized_tool: 0.5,
    static_analysis: 0.3,
    llm_inference: 0.2,
    decision_record: 0,
  },
};

export const SUFFICIENCY_THRESHOLDS = {
  /** Cobertura PONDERADA pelo peso do requisito na dimensao. */
  weightedCoverage: 0.7,
  /** Forca minima de observacao num requisito critico daquela dimensao. */
  criticalMinStrength: 0.6,
  /** Peso a partir do qual um requisito critico e critico PARA A DIMENSAO. */
  criticalWeightFloor: 5,
  /** Peso a partir do qual nao aceitamos cegueira total (forca zero). */
  highWeightFloor: 7,
} as const;

/**
 * FORCA DA OBSERVACAO de um requisito: 0 (nao observamos) a 1 (observamos bem).
 *
 * NAO diz se o requisito esta pronto — isso e o `status`. Diz o quanto sabemos
 * sobre ele. Um "confirmado ausente" e uma observacao FORTE.
 */
export function observationStrength(
  requirement: Requirement,
  state: RequirementState | undefined,
): number {
  if (!state || state.evidence.length === 0) return 0;

  const base = PROVENANCE_STRENGTH[state.provenance];
  if (base === 0) return 0;

  // Provar AUSENCIA nao exige executar nada — MAS so quando a ausencia e
  // CONCLUSIVA: o coletor precisa conhecer todo o espaco relevante (um caminho
  // fixo, uma lista enumeravel). "Procurei padroes e nao achei" nao prova nada:
  // a funcionalidade pode existir de forma que o detector nao reconhece.
  const conclusiveAbsence =
    state.status === "missing" && state.detectionOutcome === "confirmed_absent";

  const fit = conclusiveAbsence ? 1 : (KIND_FIT[requirement.kind][state.provenance] ?? 0);

  return Math.round(base * fit * state.confidence * 100) / 100;
}

/** Critico PARA ESTA DIMENSAO: alto risco E peso material nesta dimensao. */
export function isCriticalForDimension(requirement: Requirement, dimension: Dimension): boolean {
  const highStakes = requirement.launchBlocking || requirement.severity === "blocker";
  return highStakes && requirement.weights[dimension] >= SUFFICIENCY_THRESHOLDS.criticalWeightFloor;
}

export interface SufficiencyGap {
  requirementId: string;
  requirementName: string;
  weight: number;
  strength: number;
  /** Por que este item impede a publicacao, em linguagem de leigo. */
  simpleReason: string;
}

export interface SufficiencyResult {
  modelVersion: string;
  calibrated: boolean;
  /** Podemos publicar o score desta dimensao? */
  sufficient: boolean;
  /** Cobertura ponderada pelo peso: 0..1. */
  weightedCoverage: number;
  /** Criticos desta dimensao observados fracamente ou nem observados. */
  criticalGaps: SufficiencyGap[];
  /** Requisitos de peso alto sobre os quais nao sabemos absolutamente nada. */
  blindSpots: SufficiencyGap[];
  /** Motivos, em linguagem de leigo, do bloqueio (vazio quando suficiente). */
  reasons: string[];
}

export interface SufficiencyInput {
  requirement: Requirement;
  state: RequirementState | undefined;
  weight: number;
}

/**
 * Avalia UMA dimensao. Deterministica: mesma entrada, mesmo resultado.
 *
 * Tres portas, todas obrigatorias:
 *   1. cobertura ponderada suficiente;
 *   2. nenhum critico da dimensao mal observado;
 *   3. nenhum requisito de peso alto totalmente cego.
 */
export function evaluateSufficiency(
  dimension: Dimension,
  inputs: SufficiencyInput[],
): SufficiencyResult {
  let weightedStrength = 0;
  let totalWeight = 0;
  const criticalGaps: SufficiencyGap[] = [];
  const blindSpots: SufficiencyGap[] = [];

  // Ordem estavel: o resultado alimenta a interface e precisa ser diff-friendly.
  const ordered = [...inputs].sort((a, b) => a.requirement.id.localeCompare(b.requirement.id));

  for (const { requirement, state, weight } of ordered) {
    if (weight === 0) continue;
    const strength = observationStrength(requirement, state);
    weightedStrength += weight * strength;
    totalWeight += weight;

    const gap: SufficiencyGap = {
      requirementId: requirement.id,
      requirementName: requirement.name,
      weight,
      strength,
      simpleReason:
        strength === 0
          ? "Ainda não olhamos para este item — não sabemos em que pé ele está."
          : "Olhamos, mas com evidência fraca demais para um item deste peso.",
    };

    if (isCriticalForDimension(requirement, dimension) && strength < SUFFICIENCY_THRESHOLDS.criticalMinStrength) {
      criticalGaps.push(gap);
    }
    if (weight >= SUFFICIENCY_THRESHOLDS.highWeightFloor && strength === 0) {
      blindSpots.push(gap);
    }
  }

  const weightedCoverage =
    totalWeight === 0 ? 0 : Math.round((weightedStrength / totalWeight) * 100) / 100;

  const reasons: string[] = [];
  if (weightedCoverage < SUFFICIENCY_THRESHOLDS.weightedCoverage) {
    reasons.push(
      `Observamos ${Math.round(weightedCoverage * 100)}% do que importa nesta pergunta; ` +
        `precisamos de ${Math.round(SUFFICIENCY_THRESHOLDS.weightedCoverage * 100)}%.`,
    );
  }
  if (criticalGaps.length > 0) {
    reasons.push(
      `${criticalGaps.length} item(ns) decisivo(s) desta pergunta ainda sem evidência boa o bastante.`,
    );
  }
  if (blindSpots.length > 0) {
    reasons.push(`${blindSpots.length} item(ns) de peso alto sobre os quais não sabemos nada.`);
  }

  return {
    modelVersion: SUFFICIENCY_MODEL_VERSION,
    calibrated: SUFFICIENCY_CALIBRATED,
    sufficient: reasons.length === 0,
    weightedCoverage,
    criticalGaps,
    blindSpots,
    reasons,
  };
}

export type { Dimension, RequirementStatus, CollectionMethod };
