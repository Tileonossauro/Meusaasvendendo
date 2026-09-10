import type {
  CollectionMethod,
  Evidence,
  Provenance,
  RequirementState,
  RequirementStatus,
} from "../framework/schema.js";

/**
 * CONTRATO COMUM DOS COLETORES.
 *
 * Um coletor le uma fonte de verdade e PROPOE estado. Nunca escreve: quem
 * aplica e um script, que tambem registra o historico. Ver ADR 0006.
 *
 * Todo coletor — reconciliador de ADR, scanner de repositorio, e o que vier —
 * devolve o mesmo formato, para que a aplicacao, o historico e a auditoria
 * sejam identicos independentemente da origem.
 */
export interface StateProposal {
  requirementId: string;
  status: RequirementStatus;
  /** 0..1. Abaixo de 0,7 o scoring rebaixa o credito. */
  confidence: number;
  /** Cada evidencia carrega localizador (arquivo:linha ou comando). */
  evidence: Evidence[];
  /** De onde vem a verdade. Decide se conta como verificacao independente. */
  provenance: Provenance;
  /** Como foi obtida. Eixo independente da proveniencia. */
  collectionMethod: CollectionMethod;
  /** Motivo tecnico da conclusao — para auditoria. */
  reason: string;
  /** O mesmo motivo em linguagem de leigo — e o que Leonardo le. */
  simpleReason: string;
}

/** Prioridade entre proveniencias quando duas fontes falam do mesmo requisito. */
const AUTHORITY: Record<Provenance, number> = {
  human_declared: 0,
  decision_record: 1,
  llm_inference: 2,
  static_analysis: 3,
  specialized_tool: 4,
  command_execution: 5,
  runtime_probe: 6,
};

/**
 * Uma proposta so vira mudanca se acrescentar algo.
 *
 * Fonte de menor autoridade nunca sobrescreve uma de maior: um ADR nao rebaixa
 * o que o scanner observou, e nada rebaixa a execucao de um comando.
 */
export function proposalChangesState(
  proposal: StateProposal,
  current: RequirementState | undefined,
): boolean {
  if (!current) return true;
  if (AUTHORITY[proposal.provenance] < AUTHORITY[current.provenance]) return false;
  return (
    current.status !== proposal.status ||
    current.provenance !== proposal.provenance ||
    current.confidence !== proposal.confidence ||
    current.evidence.length === 0
  );
}

export type { Evidence };
