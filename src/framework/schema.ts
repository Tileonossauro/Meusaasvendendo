import { z } from "zod";

/**
 * Contrato do framework do Readiness OS.
 *
 * O framework e DADO VERSIONAVEL, nao prompt. Toda mudanca de requisito, peso
 * ou regra acontece aqui e em `framework.v0.json`, nunca escondida em codigo.
 */

export const CATEGORY_IDS = [
  "product-scope",
  "foundation",
  "data",
  "identity-access",
  "core-functionality",
  "monetization",
  "security",
  "reliability-observability",
  "deploy-delivery",
  "legal-privacy",
  "launch",
  "ai-build-readiness",
] as const;

export const categoryIdSchema = z.enum(CATEGORY_IDS);
export type CategoryId = z.infer<typeof categoryIdSchema>;

/** Estado do requisito. NUNCA usar para dizer "a IA consegue fazer" — isso e owner. */
export const statusSchema = z.enum([
  "completed",
  "partial",
  "missing",
  "blocked",
  "not_applicable",
  "uncertain",
]);
export type RequirementStatus = z.infer<typeof statusSchema>;

/** Quem precisa agir. Ortogonal ao status. */
export const ownerSchema = z.enum(["founder", "ai", "integration", "founder_and_ai"]);
export type RequirementOwner = z.infer<typeof ownerSchema>;

export const severitySchema = z.enum(["blocker", "high", "medium", "low"]);
export type Severity = z.infer<typeof severitySchema>;

/**
 * Ordem de preferencia de deteccao (principio 27 do brief):
 * deterministic > tool > llm > ask_user. `guess` nao existe de proposito.
 */
export const detectionMethodSchema = z.enum(["deterministic", "tool", "llm", "ask_user"]);
export type DetectionMethod = z.infer<typeof detectionMethodSchema>;

export const weightsSchema = z.object({
  /** 0 = requisito nao participa desta dimensao. */
  mvp: z.number().min(0).max(10),
  production: z.number().min(0).max(10),
  aiBuild: z.number().min(0).max(10),
});

export const applicabilitySchema = z.object({
  /** true = sempre aplicavel; senao depende dos sinais abaixo. */
  always: z.boolean(),
  /** Sinais que tornam o requisito aplicavel, ex.: "projeto cobra dinheiro". */
  requiresSignals: z.array(z.string()).default([]),
  /** Texto exibido quando o requisito for marcado not_applicable. */
  notApplicableReason: z.string().optional(),
});

export const detectionSignalSchema = z.object({
  method: detectionMethodSchema,
  /** Descricao mecanica do que procurar — precisa ser executavel, nao vaga. */
  look_for: z.string().min(3),
  /** Por que este sinal sozinho pode enganar (anti-falso-positivo). */
  not_sufficient_alone: z.string().optional(),
});

export const requirementSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:[-.][a-z0-9]+)*$/, "id deve ser kebab com namespace por ponto"),
  category: categoryIdSchema,
  name: z.string().min(3),
  /** Linguagem de leigo. Aparece por padrao na interface. */
  simple: z.string().min(10),
  /** Linguagem tecnica. So aparece em "ver detalhes tecnicos". */
  technical: z.string().min(10),
  why: z.string().min(10),
  weights: weightsSchema,
  applicability: applicabilitySchema,
  detection: z.array(detectionSignalSchema).min(1),
  dependsOn: z.array(z.string()).default([]),
  definitionOfDone: z.array(z.string().min(5)).min(1),
  impact: z.string().min(10),
  severity: severitySchema,
  owner: ownerSchema,
  aiExecutable: z.boolean(),
  recommendedAction: z.string().min(5),
  verification: z.string().min(5),
  /** true = enquanto nao estiver completed, o produto nao pode receber usuarios reais. */
  launchBlocking: z.boolean(),
});
export type Requirement = z.infer<typeof requirementSchema>;

export const categorySchema = z.object({
  id: categoryIdSchema,
  name: z.string(),
  simple: z.string(),
});
export type Category = z.infer<typeof categorySchema>;

export const frameworkSchema = z.object({
  frameworkVersion: z.string(),
  /** Pesos sao HIPOTESES ate a calibracao. Ver docs/CALIBRATION.md. */
  weightsAreCalibrated: z.literal(false),
  categories: z.array(categorySchema).length(CATEGORY_IDS.length),
  requirements: z.array(requirementSchema).min(1),
});
export type Framework = z.infer<typeof frameworkSchema>;

/** Uma evidencia concreta. Sem evidencia, nada vira "completed" com confianca alta. */
export const evidenceSchema = z.object({
  source: z.enum(["file", "command", "founder_answer", "external_service", "manual_bootstrap"]),
  /** caminho:linha quando aplicavel. */
  locator: z.string().optional(),
  note: z.string().min(3),
});
export type Evidence = z.infer<typeof evidenceSchema>;

export const requirementStateSchema = z.object({
  requirementId: z.string(),
  status: statusSchema,
  /** 0..1. Abaixo de CONFIDENCE_THRESHOLD o credito e rebaixado — preferimos falso negativo. */
  confidence: z.number().min(0).max(1),
  evidence: z.array(evidenceSchema).default([]),
  verifiedBy: detectionMethodSchema.or(z.literal("manual_bootstrap")),
  updatedAt: z.string(),
  note: z.string().optional(),
});
export type RequirementState = z.infer<typeof requirementStateSchema>;

/**
 * Multi-projeto desde o inicio: todo estado pertence a um projectId.
 * O Readiness OS e apenas o primeiro projeto, nunca o unico.
 */
export const projectStateSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  frameworkVersion: z.string(),
  /** Sinais do projeto que ligam/desligam aplicabilidade de requisitos. */
  signals: z.array(z.string()).default([]),
  states: z.array(requirementStateSchema),
  updatedAt: z.string(),
});
export type ProjectState = z.infer<typeof projectStateSchema>;
