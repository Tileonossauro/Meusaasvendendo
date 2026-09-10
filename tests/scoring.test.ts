import { describe, expect, it } from "vitest";
import { loadFramework } from "../src/framework/index.js";
import type { Framework, ProjectState } from "../src/framework/schema.js";
import {
  CONFIDENCE_THRESHOLD,
  computeDimensionScore,
  computeScoreReport,
  LAUNCH_BLOCKED_CAP,
} from "../src/scoring/score.js";

const framework: Framework = loadFramework();

function stateWith(overrides: ProjectState["states"], signals: string[] = []): ProjectState {
  return {
    projectId: "test",
    projectName: "Test",
    frameworkVersion: framework.frameworkVersion,
    signals,
    states: overrides,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("scoring deterministico", () => {
  it("projeto vazio pontua 0 em todas as dimensoes", () => {
    const report = computeScoreReport(framework, stateWith([]), "2026-01-01T00:00:00.000Z");
    expect(report.dimensions.mvp.score).toBe(0);
    expect(report.dimensions.production.score).toBe(0);
    expect(report.dimensions.aiBuild.score).toBe(0);
  });

  it("e reproduzivel: mesmo estado, mesmo score", () => {
    const state = stateWith([
      { requirementId: "ai.claude-md", status: "completed", confidence: 1, evidence: [], verifiedBy: "deterministic", updatedAt: "x" },
    ]);
    const a = computeScoreReport(framework, state, "t");
    const b = computeScoreReport(framework, state, "t");
    expect(a).toEqual(b);
  });

  it("requisito sem estado registrado conta como ausente, nunca como pronto", () => {
    const withNothing = computeDimensionScore(framework, stateWith([]), "aiBuild");
    expect(withNothing.score).toBe(0);
    expect(withNothing.applicableCount).toBeGreaterThan(0);
  });

  it("confianca abaixo do limiar rebaixa completed para meio credito", () => {
    const low = stateWith([
      { requirementId: "ai.claude-md", status: "completed", confidence: CONFIDENCE_THRESHOLD - 0.1, evidence: [], verifiedBy: "llm", updatedAt: "x" },
    ]);
    const high = stateWith([
      { requirementId: "ai.claude-md", status: "completed", confidence: 1, evidence: [], verifiedBy: "llm", updatedAt: "x" },
    ]);
    const lowDetail = computeDimensionScore(framework, low, "aiBuild").details.find((d) => d.requirementId === "ai.claude-md");
    const highDetail = computeDimensionScore(framework, high, "aiBuild").details.find((d) => d.requirementId === "ai.claude-md");
    expect(lowDetail?.credit).toBe(0.5);
    expect(lowDetail?.downgradedByConfidence).toBe(true);
    expect(highDetail?.credit).toBe(1);
  });

  it("requisito nao aplicavel sai do denominador", () => {
    const semCobranca = computeDimensionScore(framework, stateWith([], []), "production");
    const comCobranca = computeDimensionScore(framework, stateWith([], ["charges_money"]), "production");
    expect(comCobranca.applicableCount).toBeGreaterThan(semCobranca.applicableCount);
  });

  it("bloqueador de lancamento em aberto limita o Production Score", () => {
    const allDone = framework.requirements.map((r) => ({
      requirementId: r.id,
      status: "completed" as const,
      confidence: 1,
      evidence: [],
      verifiedBy: "deterministic" as const,
      updatedAt: "x",
    }));
    const blockerId = framework.requirements.find((r) => r.launchBlocking && r.weights.production > 0 && r.applicability.always)?.id;
    expect(blockerId).toBeDefined();
    const withBlocker = allDone.map((s) => (s.requirementId === blockerId ? { ...s, status: "missing" as const } : s));
    const scored = computeDimensionScore(framework, stateWith(withBlocker), "production");
    expect(scored.rawScore).toBeGreaterThan(LAUNCH_BLOCKED_CAP);
    expect(scored.score).toBeLessThanOrEqual(LAUNCH_BLOCKED_CAP);
    expect(scored.cappedByLaunchBlockers).toBe(true);
  });

  it("estado declarado manualmente nao conta como medido", () => {
    const manual = framework.requirements.map((r) => ({
      requirementId: r.id,
      status: "completed" as const,
      confidence: 1,
      evidence: [],
      verifiedBy: "manual_bootstrap" as const,
      updatedAt: "x",
    }));
    const scored = computeDimensionScore(framework, stateWith(manual), "mvp");
    expect(scored.measured).toBe(false);
    expect(scored.measuredCoverage).toBe(0);
  });
});
