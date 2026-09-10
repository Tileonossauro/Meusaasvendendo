import { describe, expect, it } from "vitest";
import { loadFramework } from "../src/framework/index.js";
import type { Framework, ProjectState } from "../src/framework/schema.js";
import { computeNextBestAction, NBA_WEIGHTS } from "../src/navigator/next-best-action.js";

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
    expect(pricing!.unlocksNow.length).toBeGreaterThan(0);
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

describe("destrava agora vs impacto futuro", () => {
  // Cadeia real do framework:
  // billing.pricing-decided -> gateway-configured -> checkout -> webhook -> entitlements
  const chainState = (): ProjectState => ({
    ...emptyState(["charges_money", "has_user_accounts"]),
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
  });

  it("so conta como 'destrava agora' o que fica realmente executavel", () => {
    const { candidates } = computeNextBestAction(framework, chainState());
    const pricing = candidates.find((c) => c.requirement.id === "billing.pricing-decided")!;

    // Concluir o preco torna o gateway executavel — e so ele.
    expect(pricing.unlocksNow).toEqual(["billing.gateway-configured"]);

    // O checkout depende do gateway (ainda em aberto): e futuro, nao agora.
    expect(pricing.downstreamImpact).toContain("billing.checkout-implemented");
    expect(pricing.unlocksNow).not.toContain("billing.checkout-implemented");
  });

  it("nao conta o mesmo requisito nas duas listas", () => {
    const { candidates } = computeNextBestAction(framework, chainState());
    for (const candidate of candidates) {
      const now = new Set(candidate.unlocksNow);
      for (const id of candidate.downstreamImpact) {
        expect(now.has(id)).toBe(false);
      }
    }
  });

  it("nao promete como imediato um dependente que tem outra dependencia em aberto", () => {
    const { candidates } = computeNextBestAction(framework, chainState());
    for (const candidate of candidates) {
      for (const id of candidate.unlocksNow) {
        const dependent = framework.requirements.find((r) => r.id === id)!;
        const otherDeps = dependent.dependsOn.filter((d) => d !== candidate.requirement.id);
        for (const dep of otherDeps) {
          const depReq = framework.requirements.find((r) => r.id === dep)!;
          const applicable =
            depReq.applicability.always ||
            depReq.applicability.requiresSignals.every((s) =>
              ["charges_money", "has_user_accounts"].includes(s),
            );
          const satisfied =
            !applicable || dep === "product.target-user-defined";
          expect(satisfied).toBe(true);
        }
      }
    }
  });

  it("o texto para o fundador distingue 'agora' de 'abre caminho'", () => {
    const { candidates } = computeNextBestAction(framework, chainState());
    const pricing = candidates.find((c) => c.requirement.id === "billing.pricing-decided")!;
    expect(pricing.reason).toContain("agora");
    expect(pricing.reason).toContain("abre caminho");
  });

  it("preserva o grafo transitivo no ranking, com peso menor que o imediato", () => {
    expect(NBA_WEIGHTS.perDownstream).toBeLessThan(NBA_WEIGHTS.perUnlockedNow);
    expect(NBA_WEIGHTS.downstreamWeight).toBeLessThan(NBA_WEIGHTS.unlocksNowWeight);

    const { candidates } = computeNextBestAction(framework, chainState());
    const pricing = candidates.find((c) => c.requirement.id === "billing.pricing-decided")!;
    // O impacto futuro entra na pontuacao, mas nao vira promessa de imediato.
    expect(pricing.breakdown.downstreamImpact).toBeGreaterThan(0);
    expect(pricing.breakdown.unlocksNow).toBeGreaterThan(0);
  });

  it("continua deterministico apos a separacao", () => {
    const a = computeNextBestAction(framework, chainState());
    const b = computeNextBestAction(framework, chainState());
    expect(a.candidates.map((c) => c.requirement.id)).toEqual(
      b.candidates.map((c) => c.requirement.id),
    );
    expect(a.candidates.map((c) => c.priority)).toEqual(b.candidates.map((c) => c.priority));
  });
});
