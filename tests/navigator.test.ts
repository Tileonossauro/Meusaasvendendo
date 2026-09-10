import { describe, expect, it } from "vitest";
import { loadFramework } from "../src/framework/index.js";
import type { Framework, ProjectState } from "../src/framework/schema.js";
import { computeNextBestAction } from "../src/navigator/next-best-action.js";

const framework: Framework = loadFramework();

function emptyState(signals: string[] = []): ProjectState {
  return {
    projectId: "test",
    projectName: "Test",
    frameworkVersion: framework.frameworkVersion,
    signals,
    states: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("next best action", () => {
  it("nunca recomenda algo com dependencia em aberto", () => {
    const result = computeNextBestAction(framework, emptyState(["charges_money", "has_user_accounts"]));
    for (const candidate of result.candidates) {
      for (const dep of candidate.requirement.dependsOn) {
        const depReq = framework.requirements.find((r) => r.id === dep)!;
        const applicable = depReq.applicability.always || depReq.applicability.requiresSignals.every((s) => ["charges_money", "has_user_accounts"].includes(s));
        expect(applicable).toBe(false);
      }
    }
  });

  it("e deterministico", () => {
    const state = emptyState(["charges_money"]);
    const a = computeNextBestAction(framework, state);
    const b = computeNextBestAction(framework, state);
    expect(a.nextBestAction?.requirement.id).toBe(b.nextBestAction?.requirement.id);
    expect(a.candidates.map((c) => c.requirement.id)).toEqual(b.candidates.map((c) => c.requirement.id));
  });

  it("classifica os candidatos em ordem decrescente de prioridade", () => {
    const { candidates } = computeNextBestAction(framework, emptyState());
    for (let i = 1; i < candidates.length; i += 1) {
      expect(candidates[i - 1]!.priority).toBeGreaterThanOrEqual(candidates[i]!.priority);
    }
  });

  it("uma decisao do fundador que destrava tarefas de IA supera uma tarefa isolada de mesma severidade", () => {
    // pricing so vira candidato depois que sua dependencia esta concluida.
    const state: ProjectState = {
      ...emptyState(["charges_money"]),
      states: [
        {
          requirementId: "product.target-user-defined",
          status: "completed",
          confidence: 1,
          evidence: [],
          verifiedBy: "deterministic",
          updatedAt: "x",
        },
      ],
    };
    const { candidates } = computeNextBestAction(framework, state);
    const pricing = candidates.find((c) => c.requirement.id === "billing.pricing-decided");
    expect(pricing).toBeDefined();
    expect(pricing!.unlocks.length).toBeGreaterThan(0);
    expect(pricing!.breakdown.founderBottleneck).toBeGreaterThan(0);
  });

  it("lista como bloqueado o que espera dependencia", () => {
    const { blocked } = computeNextBestAction(framework, emptyState(["charges_money"]));
    const checkout = blocked.find((b) => b.requirementId === "billing.checkout-implemented");
    expect(checkout?.waitingOn).toContain("billing.gateway-configured");
  });

  it("quando tudo esta concluido nao ha proxima acao", () => {
    const all = framework.requirements.map((r) => ({
      requirementId: r.id,
      status: "completed" as const,
      confidence: 1,
      evidence: [],
      verifiedBy: "deterministic" as const,
      updatedAt: "x",
    }));
    const result = computeNextBestAction(framework, { ...emptyState(), states: all });
    expect(result.nextBestAction).toBeNull();
  });
});
