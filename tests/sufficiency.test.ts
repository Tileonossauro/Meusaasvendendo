import { describe, expect, it } from "vitest";
import { loadFramework } from "../src/framework/index.js";
import { parseProjectState } from "../src/state/index.js";
import { computeScoreReport, DIMENSIONS } from "../src/scoring/score.js";
import {
  evaluateSufficiency,
  isCriticalForDimension,
  KIND_FIT,
  observationStrength,
  PROVENANCE_STRENGTH,
  SUFFICIENCY_CALIBRATED,
  SUFFICIENCY_THRESHOLDS,
  type SufficiencyInput,
} from "../src/scoring/sufficiency.js";
import { readFileSync } from "node:fs";
import type { Requirement, RequirementState } from "../src/framework/schema.js";

const framework = loadFramework();
const state = parseProjectState(
  JSON.parse(readFileSync("data/projects/readiness-os/state.json", "utf8")),
);
const report = computeScoreReport(framework, state);
const req = (id: string): Requirement => framework.requirements.find((r) => r.id === id)!;

function stateOf(overrides: Partial<RequirementState>): RequirementState {
  return {
    requirementId: "x",
    status: "completed",
    confidence: 1,
    evidence: [{ source: "file", provenance: "static_analysis", locator: "a.ts:1", note: "nota" }],
    provenance: "static_analysis",
    collectionMethod: "deterministic",
    updatedAt: "x",
    ...overrides,
  };
}

describe("forca da observacao", () => {
  it("sem evidencia, forca zero", () => {
    expect(observationStrength(req("ai.claude-md"), undefined)).toBe(0);
    expect(observationStrength(req("ai.claude-md"), stateOf({ evidence: [] }))).toBe(0);
  });

  it("declaracao humana nunca observa nada", () => {
    expect(PROVENANCE_STRENGTH.human_declared).toBe(0);
    expect(
      observationStrength(req("ai.claude-md"), stateOf({ provenance: "human_declared" })),
    ).toBe(0);
  });

  it("ADR nao observa implementacao", () => {
    // O caso extremo: um documento afirmando que o rate limiting existe.
    const rateLimiting = req("security.rate-limiting");
    expect(rateLimiting.kind).toBe("implementation");
    expect(KIND_FIT.implementation.decision_record).toBe(0);
    expect(
      observationStrength(rateLimiting, stateOf({ provenance: "decision_record" })),
    ).toBe(0);
  });

  it("ADR observa bem uma decisao documentada", () => {
    const persistencia = req("data.persistence-chosen");
    expect(persistencia.kind).toBe("decision");
    const strength = observationStrength(
      persistencia,
      stateOf({ provenance: "decision_record", confidence: 0.9 }),
    );
    expect(strength).toBeGreaterThan(0.4);
  });

  it("executar um comando observa mais que ler o codigo", () => {
    const gate = req("foundation.typecheck-gate");
    const executado = observationStrength(gate, stateOf({ provenance: "command_execution" }));
    const lido = observationStrength(gate, stateOf({ provenance: "static_analysis" }));
    expect(executado).toBeGreaterThan(lido);
  });

  it("leitura estatica nao prova requisito operacional", () => {
    const deploy = req("deploy.production-deploy-works");
    expect(deploy.kind).toBe("operational");
    expect(observationStrength(deploy, stateOf({ provenance: "static_analysis" }))).toBeLessThan(0.5);
  });

  it("ausencia CONCLUSIVA e observacao forte, mesmo sem executar nada", () => {
    // Se o caminho e fixo e o arquivo nao esta la, ele nao existe.
    const boundary = req("security.untrusted-content-boundary");
    const ausente = observationStrength(
      boundary,
      stateOf({
        status: "missing",
        provenance: "static_analysis",
        confidence: 0.9,
        detectionOutcome: "confirmed_absent",
        observationScope: "caminho fixo",
      }),
    );
    const presente = observationStrength(
      boundary,
      stateOf({ status: "completed", provenance: "static_analysis", confidence: 0.9 }),
    );
    expect(ausente).toBeGreaterThan(presente);
    expect(ausente).toBeGreaterThanOrEqual(SUFFICIENCY_THRESHOLDS.criticalMinStrength);
  });

  it("ausencia NAO conclusiva nao ganha o bonus", () => {
    // "Procurei padroes e nao achei" nao prova que a funcionalidade nao existe.
    const boundary = req("security.untrusted-content-boundary");
    const naoConclusiva = observationStrength(
      boundary,
      stateOf({ status: "missing", detectionOutcome: "not_detected", confidence: 0.9 }),
    );
    expect(naoConclusiva).toBeLessThan(SUFFICIENCY_THRESHOLDS.criticalMinStrength);
  });

  it("confianca baixa reduz a forca proporcionalmente", () => {
    const alta = observationStrength(req("ai.claude-md"), stateOf({ confidence: 1 }));
    const baixa = observationStrength(req("ai.claude-md"), stateOf({ confidence: 0.5 }));
    expect(baixa).toBeLessThan(alta);
  });
});

describe("criticidade e relativa a dimensao", () => {
  it("o mesmo requisito pode ser critico numa dimensao e nao noutra", () => {
    const coreFlow = req("core.primary-flow-implemented");
    expect(coreFlow.weights.mvp).toBeGreaterThanOrEqual(SUFFICIENCY_THRESHOLDS.criticalWeightFloor);
    expect(coreFlow.weights.aiBuild).toBeLessThan(SUFFICIENCY_THRESHOLDS.criticalWeightFloor);

    expect(isCriticalForDimension(coreFlow, "mvp")).toBe(true);
    expect(isCriticalForDimension(coreFlow, "aiBuild")).toBe(false);
  });

  it("requisito sem alto risco nunca e critico, por maior que seja o peso", () => {
    const claudeMd = req("ai.claude-md");
    expect(claudeMd.launchBlocking).toBe(false);
    expect(claudeMd.severity).not.toBe("blocker");
    expect(isCriticalForDimension(claudeMd, "aiBuild")).toBe(false);
  });
});

describe("suficiencia: as tres portas", () => {
  const strong = (weight: number, id: string): SufficiencyInput => ({
    requirement: req(id),
    state: stateOf({ requirementId: id, provenance: "command_execution", confidence: 1 }),
    weight,
  });

  it("cobertura ponderada insuficiente bloqueia", () => {
    const result = evaluateSufficiency("aiBuild", [
      strong(1, "ai.claude-md"),
      { requirement: req("ai.agents-md"), state: undefined, weight: 9 },
    ]);
    expect(result.sufficient).toBe(false);
    expect(result.reasons.join(" ")).toContain("70%");
  });

  it("um critico mal observado bloqueia mesmo com cobertura alta", () => {
    const result = evaluateSufficiency("production", [
      strong(10, "ai.claude-md"),
      strong(10, "ai.agents-md"),
      {
        requirement: req("security.rate-limiting"),
        state: stateOf({ provenance: "decision_record", confidence: 1 }),
        weight: 8,
      },
    ]);
    expect(result.criticalGaps.length).toBeGreaterThan(0);
    expect(result.sufficient).toBe(false);
  });

  it("um ponto cego de peso alto bloqueia", () => {
    const result = evaluateSufficiency("aiBuild", [
      strong(10, "ai.claude-md"),
      strong(10, "ai.agents-md"),
      strong(10, "ai.quality-gates-runnable"),
      { requirement: req("core.primary-flow-tested"), state: undefined, weight: 8 },
    ]);
    expect(result.blindSpots.map((b) => b.requirementId)).toContain("core.primary-flow-tested");
    expect(result.sufficient).toBe(false);
  });

  it("com as tres portas abertas, a dimensao e publicavel", () => {
    const result = evaluateSufficiency("aiBuild", [
      strong(10, "ai.claude-md"),
      strong(9, "ai.agents-md"),
      strong(10, "ai.quality-gates-runnable"),
    ]);
    expect(result.sufficient).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("e deterministica", () => {
    const inputs = [strong(10, "ai.claude-md"), strong(9, "ai.agents-md")];
    expect(evaluateSufficiency("aiBuild", inputs)).toEqual(evaluateSufficiency("aiBuild", inputs));
  });

  it("declara os limiares como hipoteses nao calibradas", () => {
    expect(SUFFICIENCY_CALIBRATED).toBe(false);
  });
});

describe("cada dimensao prova a propria suficiencia", () => {
  it("nao existe porta global: uma dimensao nao bloqueia a outra", () => {
    // Production depende de deploy; isso nao pode travar AI Build.
    const mvpGaps = report.dimensions.mvp.sufficiency.criticalGaps.map((g) => g.requirementId);
    const aiGaps = report.dimensions.aiBuild.sufficiency.criticalGaps.map((g) => g.requirementId);
    expect(aiGaps).not.toEqual(mvpGaps);
    expect(report.dimensions.aiBuild.sufficiency.criticalGaps).toHaveLength(0);
  });

  it("`measured` vem da suficiencia da propria dimensao", () => {
    for (const dimension of DIMENSIONS) {
      const d = report.dimensions[dimension];
      expect(d.measured).toBe(d.sufficiency.sufficient);
    }
  });

  it("dimensao nao suficiente nunca expoe percentual", () => {
    for (const dimension of DIMENSIONS) {
      const d = report.dimensions[dimension];
      if (!d.sufficiency.sufficient) {
        expect(d.sufficiency.reasons.length).toBeGreaterThan(0);
      }
    }
  });

  it("estado atual do Readiness OS: nenhuma dimensao e publicavel ainda", () => {
    // Registro honesto do resultado no momento do Marco 4. Quando uma dimensao
    // passar legitimamente, este teste falha e obriga a revisao consciente.
    for (const dimension of DIMENSIONS) {
      expect(report.dimensions[dimension].measured).toBe(false);
    }
    expect(report.dimensions.aiBuild.sufficiency.weightedCoverage).toBeGreaterThan(
      report.dimensions.mvp.sufficiency.weightedCoverage,
    );
  });
});
