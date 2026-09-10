import { describe, expect, it } from "vitest";
import { computeBuildProgress, parseBuildPlan } from "../src/progress/build-progress.js";
import { parseProjectHistory, recentEvents } from "../src/history/schema.js";
import { loadFramework } from "../src/framework/index.js";

describe("build progress", () => {
  const plan = parseBuildPlan({
    projectId: "t",
    planVersion: "1.0.0",
    milestones: [
      { id: "a", name: "Marco A", outcome: "Resultado A", status: "done", weight: 5 },
      { id: "b", name: "Marco B", outcome: "Resultado B", status: "in_progress", weight: 5 },
      { id: "c", name: "Marco C", outcome: "Resultado C", status: "planned", weight: 10 },
    ],
  });

  it("pondera marcos: concluido 1, em andamento 0,5, planejado 0", () => {
    // (5*1 + 5*0,5 + 10*0) / 20 = 37,5% -> 38%
    expect(computeBuildProgress(plan).percent).toBe(38);
  });

  it("identifica o marco em andamento para a secao AGORA", () => {
    expect(computeBuildProgress(plan).current?.id).toBe("b");
  });

  it("declara explicitamente que nao e prontidao de produto", () => {
    const progress = computeBuildProgress(plan);
    expect(progress.label).toBe("Build Progress");
    expect(progress.meaning.toLowerCase()).toContain("não a prontidão do produto");
  });
});

describe("historico de progresso", () => {
  it("aceita os seis tipos de evento exigidos", () => {
    const framework = loadFramework();
    const types = [
      "requirement_completed",
      "requirement_changed",
      "founder_decision",
      "dependency_unblocked",
      "score_changed",
      "milestone_completed",
    ] as const;

    const history = parseProjectHistory({
      projectId: "t",
      events: types.map((type, i) => ({
        id: `e${i}`,
        type,
        at: `2026-01-0${i + 1}T00:00:00.000Z`,
        title: `Evento ${type}`,
        frameworkVersion: framework.frameworkVersion,
      })),
    });

    expect(history.events).toHaveLength(6);
  });

  it("exige a versao do framework em todo evento", () => {
    expect(() =>
      parseProjectHistory({
        projectId: "t",
        events: [{ id: "e", type: "score_changed", at: "2026-01-01T00:00:00.000Z", title: "Sem versao" }],
      }),
    ).toThrow();
  });

  it("retorna os eventos mais recentes primeiro", () => {
    const history = parseProjectHistory({
      projectId: "t",
      events: [
        { id: "a", type: "score_changed", at: "2026-01-01T00:00:00.000Z", title: "Antigo", frameworkVersion: "0.1.0" },
        { id: "b", type: "score_changed", at: "2026-03-01T00:00:00.000Z", title: "Recente", frameworkVersion: "0.1.0" },
      ],
    });
    expect(recentEvents(history).map((e) => e.id)).toEqual(["b", "a"]);
  });
});

describe("historico nao pode divergir do calculo", () => {
  it("o ultimo evento de Build Progress bate com o valor realmente calculado", async () => {
    // Guarda contra numero inventado no historico — o erro exato que este
    // produto existe para impedir.
    const { buildDashboardViewModel } = await import("../src/dashboard/view-model.js");
    const vm = buildDashboardViewModel("readiness-os");

    const scoreEvents = vm.recentlyCompleted.filter(
      (e) => e.type === "score_changed" && e.scoreChange?.dimension === "buildProgress",
    );

    if (scoreEvents.length > 0) {
      const latest = scoreEvents[0]!;
      expect(latest.scoreChange!.to).toBe(vm.buildProgress.percent);
      expect(latest.title).toContain(String(vm.buildProgress.percent));
    }
  });
});
