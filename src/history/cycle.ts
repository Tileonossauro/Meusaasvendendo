import { z } from "zod";

/**
 * REGISTRO DE CICLO DO NAVIGATOR.
 *
 * Base da futura funcionalidade "por que meu projeto avancou?".
 *
 * Um ciclo e uma volta completa do loop operacional:
 *   NBA recomenda -> acao executada -> evidencia produzida -> estado muda ->
 *   grafo muda -> NBA recalcula -> suficiencia muda -> historico registra.
 *
 * Guardar so o "antes e depois" dos numeros nao explica nada. O ciclo guarda a
 * CAUSA: o que foi feito, que evidencia surgiu e o que isso destravou.
 */

export const navigatorSnapshotSchema = z.object({
  requirementId: z.string().nullable(),
  requirementName: z.string(),
  priority: z.number(),
  /** Ficavam executaveis imediatamente. */
  unlocksNow: z.array(z.string()),
  /** Ganhavam caminho aberto para o futuro. */
  downstreamImpact: z.array(z.string()),
});
export type NavigatorSnapshot = z.infer<typeof navigatorSnapshotSchema>;

export const dimensionSnapshotSchema = z.object({
  dimension: z.enum(["mvp", "production", "aiBuild"]),
  weightedCoverage: z.number(),
  sufficient: z.boolean(),
  criticalGaps: z.number(),
  blindSpots: z.number(),
});

export const requirementChangeSchema = z.object({
  requirementId: z.string(),
  from: z.string(),
  to: z.string(),
  /** Por que mudou, em linguagem de leigo. */
  simpleReason: z.string(),
});

export const cycleSchema = z.object({
  id: z.string(),
  /** Do relogio, como todo timestamp. Ver ADR 0008. */
  at: z.string().datetime(),
  frameworkVersion: z.string(),
  /** O que o Navigator recomendava quando o ciclo comecou. */
  navigatorBefore: navigatorSnapshotSchema,
  /** O que foi efetivamente feito. Em linguagem de leigo. */
  actionTaken: z.string().min(10),
  /** O mesmo, em detalhe tecnico. */
  actionTechnical: z.string().min(10),
  /** Localizadores da evidencia produzida (arquivo:linha ou comando). */
  evidenceProduced: z.array(z.string()),
  requirementsChanged: z.array(requirementChangeSchema),
  navigatorAfter: navigatorSnapshotSchema,
  sufficiencyBefore: z.array(dimensionSnapshotSchema),
  sufficiencyAfter: z.array(dimensionSnapshotSchema),
  /** O que este ciclo ensinou. Nem todo ciclo aumenta numero. */
  outcome: z.string().min(10),
});
export type Cycle = z.infer<typeof cycleSchema>;

export const projectCyclesSchema = z.object({
  projectId: z.string(),
  cycles: z.array(cycleSchema),
});
export type ProjectCycles = z.infer<typeof projectCyclesSchema>;

export function parseProjectCycles(raw: unknown): ProjectCycles {
  return projectCyclesSchema.parse(raw);
}

/** Ciclos mais recentes primeiro. */
export function recentCycles(cycles: ProjectCycles, limit = 3): Cycle[] {
  return [...cycles.cycles]
    .sort((a, b) => (b.at !== a.at ? b.at.localeCompare(a.at) : b.id.localeCompare(a.id)))
    .slice(0, limit);
}
