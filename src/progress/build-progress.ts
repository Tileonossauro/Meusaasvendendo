import { z } from "zod";

/**
 * BUILD PROGRESS — progresso do PLANO DE CONSTRUCAO.
 *
 * NAO e prontidao de produto. Nao confunda com os tres Readiness Scores.
 * Este numero responde "quanto do que planejamos construir ja foi construido",
 * e e a unica porcentagem honesta enquanto o scanner nao existir, porque sai de
 * marcos que nos mesmos declaramos — nao de evidencia sobre o produto.
 */

export const milestoneStatusSchema = z.enum(["done", "in_progress", "planned"]);
export type MilestoneStatus = z.infer<typeof milestoneStatusSchema>;

export const milestoneSchema = z.object({
  id: z.string(),
  name: z.string().min(3),
  /** O que Leonardo vai conseguir ver quando este marco terminar. */
  outcome: z.string().min(5),
  status: milestoneStatusSchema,
  weight: z.number().min(1).max(10),
});
export type Milestone = z.infer<typeof milestoneSchema>;

export const buildPlanSchema = z.object({
  projectId: z.string(),
  planVersion: z.string(),
  milestones: z.array(milestoneSchema).min(1),
});
export type BuildPlan = z.infer<typeof buildPlanSchema>;

const STATUS_CREDIT: Record<MilestoneStatus, number> = {
  done: 1,
  in_progress: 0.5,
  planned: 0,
};

export interface BuildProgress {
  /** 0..100. Progresso do plano de construcao, NUNCA prontidao do produto. */
  percent: number;
  done: number;
  inProgress: number;
  planned: number;
  total: number;
  /** O marco em andamento. Alimenta a secao "AGORA" do dashboard. */
  current: Milestone | null;
  /** Rotulo fixo, para a interface nunca confundir isto com um Readiness Score. */
  label: "Build Progress";
  meaning: string;
}

export function computeBuildProgress(plan: BuildPlan): BuildProgress {
  const totalWeight = plan.milestones.reduce((sum, m) => sum + m.weight, 0);
  const earned = plan.milestones.reduce((sum, m) => sum + m.weight * STATUS_CREDIT[m.status], 0);

  return {
    percent: totalWeight === 0 ? 0 : Math.round((earned / totalWeight) * 100),
    done: plan.milestones.filter((m) => m.status === "done").length,
    inProgress: plan.milestones.filter((m) => m.status === "in_progress").length,
    planned: plan.milestones.filter((m) => m.status === "planned").length,
    total: plan.milestones.length,
    current: plan.milestones.find((m) => m.status === "in_progress") ?? null,
    label: "Build Progress",
    meaning:
      "Mede o progresso do nosso plano de construção, não a prontidão do produto. " +
      "Prontidão real só aparece quando o scanner medir evidência.",
  };
}

export function parseBuildPlan(raw: unknown): BuildPlan {
  return buildPlanSchema.parse(raw);
}
