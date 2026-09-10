import { z } from "zod";

/**
 * Historico de progresso por projeto.
 *
 * Existe desde o primeiro slice porque "o score mudou" so tem valor quando da
 * para dizer O QUE mudou e POR QUE. Hoje e um JSON local; a forma do evento ja
 * e a que um banco usaria.
 */

export const historyEventTypeSchema = z.enum([
  "requirement_completed",
  "requirement_changed",
  "founder_decision",
  "dependency_unblocked",
  "score_changed",
  "milestone_completed",
]);
export type HistoryEventType = z.infer<typeof historyEventTypeSchema>;

export const historyEventSchema = z.object({
  id: z.string(),
  type: historyEventTypeSchema,
  at: z.string(),
  /** Titulo em linguagem de leigo. E o que aparece em "Recentemente concluido". */
  title: z.string().min(3),
  /** Detalhe opcional, tambem em linguagem simples. */
  detail: z.string().optional(),
  /** Requisito relacionado, quando houver. */
  requirementId: z.string().optional(),
  /** Marco relacionado, quando houver. */
  milestoneId: z.string().optional(),
  /**
   * Versao do framework que produziu este evento.
   * Toda analise registra a versao que a gerou — sem isso nao da para comparar
   * resultados entre versoes do framework.
   */
  frameworkVersion: z.string(),
  /** Para eventos de score: de quanto para quanto, em qual dimensao. */
  scoreChange: z
    .object({
      dimension: z.enum(["mvp", "production", "aiBuild", "buildProgress"]),
      from: z.number(),
      to: z.number(),
    })
    .optional(),
});
export type HistoryEvent = z.infer<typeof historyEventSchema>;

export const projectHistorySchema = z.object({
  projectId: z.string(),
  events: z.array(historyEventSchema),
});
export type ProjectHistory = z.infer<typeof projectHistorySchema>;

/** Eventos mais recentes primeiro. Ordenacao estavel por data e id. */
export function recentEvents(history: ProjectHistory, limit = 8): HistoryEvent[] {
  return [...history.events]
    .sort((a, b) => (b.at !== a.at ? b.at.localeCompare(a.at) : b.id.localeCompare(a.id)))
    .slice(0, limit);
}

export function parseProjectHistory(raw: unknown): ProjectHistory {
  return projectHistorySchema.parse(raw);
}
