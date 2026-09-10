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

/**
 * PROVENIENCIA — de onde vem a VERDADE da evidencia.
 *
 * Nao confundir com o metodo de coleta (abaixo): sao eixos independentes.
 * Ler um ADR deterministicamente prova "existe uma decisao formal registrada".
 * NAO prova "a implementacao existe e funciona". Um ADR declarando que o rate
 * limiting esta pronto jamais pode valer o mesmo que um scanner detectando
 * rate limiting real no codigo.
 *
 * Ordenado do menos para o mais independente.
 */
export const provenanceSchema = z.enum([
  /** Alguem digitou. Nenhuma verificacao. */
  "human_declared",
  /** Registro de decisao (ADR) — declaracao humana lida por maquina. */
  "decision_record",
  /** Leitura do proprio codigo/arquivos do projeto. */
  "static_analysis",
  /** Um comando foi executado e o resultado observado. */
  "command_execution",
  /** Ferramenta dedicada (scanner de segredos, auditoria de dependencias). */
  "specialized_tool",
  /** Um modelo interpretou evidencia. Sempre acompanhado de localizador. */
  "llm_inference",
  /** Observacao do sistema rodando. Ainda nao implementado. */
  "runtime_probe",
]);
export type Provenance = z.infer<typeof provenanceSchema>;

/** COMO a evidencia foi coletada. Eixo independente da proveniencia. */
export const collectionMethodSchema = z.enum(["manual", "deterministic", "llm"]);
export type CollectionMethod = z.infer<typeof collectionMethodSchema>;

/**
 * Proveniencias que constituem VERIFICACAO INDEPENDENTE: o sistema observou o
 * projeto por conta propria, em vez de acreditar em algo que alguem declarou.
 *
 * `decision_record` NAO esta aqui de proposito — e declaracao humana, ainda que
 * lida deterministicamente.
 */
export const INDEPENDENT_PROVENANCES: Provenance[] = [
  "static_analysis",
  "command_execution",
  "specialized_tool",
  "runtime_probe",
];

export function isIndependentlyVerified(provenance: Provenance): boolean {
  return INDEPENDENT_PROVENANCES.includes(provenance);
}

/**
 * NATUREZA do requisito — o que a Definition of Done realmente exige.
 *
 * Existe para impedir, estruturalmente, que uma declaracao satisfaca um
 * requisito de implementacao. Um ADR pode satisfazer `decision`; nunca
 * `implementation` nem `operational`.
 */
export const requirementKindSchema = z.enum([
  /** A DoD e uma decisao tomada e registrada. */
  "decision",
  /** A DoD e um documento ou arquivo existir com conteudo real. */
  "artifact",
  /** A DoD e codigo que existe e funciona. */
  "implementation",
  /** A DoD depende de servico externo ou do sistema no ar. */
  "operational",
]);
export type RequirementKind = z.infer<typeof requirementKindSchema>;

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
  /** O que a DoD realmente exige. Governa que proveniencia pode satisfazer. */
  kind: requirementKindSchema,
  name: z.string().min(3),
  /**
   * Linguagem de leigo, ESCRITA A MAO e versionada junto do requisito.
   * Aparece por padrao na interface. Nunca dependemos de uma chamada de IA
   * para traduzir o requisito em tempo de exibicao.
   */
  simpleExplanation: z.string().min(10),
  /** Linguagem tecnica. So aparece atras de "ver detalhes tecnicos". */
  technicalExplanation: z.string().min(10),
  whyItMatters: z.string().min(10),
  weights: weightsSchema,
  applicability: applicabilitySchema,
  detection: z.array(detectionSignalSchema).min(1),
  dependsOn: z.array(z.string()).default([]),
  definitionOfDone: z.array(z.string().min(5)).min(1),
  impactSummary: z.string().min(10),
  severity: severitySchema,
  owner: ownerSchema,
  /** A IA consegue executar este requisito sozinha? */
  aiCanHandle: z.boolean(),
  /**
   * O fundador precisa agir? Derivado de `owner`, mas persistido de proposito:
   * a interface le o campo direto, sem recalcular regra de negocio na tela.
   * `refineRequirement` garante que os dois nunca divirjam.
   */
  userActionRequired: z.boolean(),
  recommendedAction: z.string().min(5),
  verification: z.string().min(5),
  /** true = enquanto nao estiver completed, o produto nao pode receber usuarios reais. */
  launchBlocking: z.boolean(),
}).superRefine((requirement, ctx) => {
  // Guarda contra divergencia silenciosa entre `owner` e `userActionRequired`.
  const ownerNeedsFounder = requirement.owner !== "ai";
  if (requirement.userActionRequired !== ownerNeedsFounder) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["userActionRequired"],
      message:
        `Requisito "${requirement.id}": userActionRequired=${requirement.userActionRequired} ` +
        `contradiz owner="${requirement.owner}".`,
    });
  }
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
  /** De onde vem a verdade desta evidencia. */
  provenance: provenanceSchema,
  /** caminho:linha, ou o comando executado. */
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
  /** De onde vem a verdade deste estado. Decide se conta como verificacao independente. */
  provenance: provenanceSchema,
  /** Como foi coletado. Independente da proveniencia. */
  collectionMethod: collectionMethodSchema,
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
