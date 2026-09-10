import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { detectSignals } from "../src/collectors/repo-scanner.js";
import { loadFramework } from "../src/framework/index.js";
import { parseProjectState } from "../src/state/index.js";
import { parseProjectCycles, recentCycles } from "../src/history/cycle.js";
import { isApplicable } from "../src/scoring/score.js";

const framework = loadFramework();
const state = parseProjectState(
  JSON.parse(readFileSync("data/projects/readiness-os/state.json", "utf8")),
);
const cycles = parseProjectCycles(
  JSON.parse(readFileSync("data/projects/readiness-os/cycles.json", "utf8")),
);

describe("sinais do projeto sao detectados, nao mantidos a mao", () => {
  it("detecta ausencia de configuracao por ambiente com evidencia", () => {
    const [signal] = detectSignals();
    expect(signal!.signal).toBe("uses_environment_config");
    expect(signal!.evidence.length).toBeGreaterThan(0);
    expect(signal!.evidence[0]!.locator).toBeTruthy();
  });

  it("NODE_ENV nao conta como configuracao do produto", () => {
    // NODE_ENV e do runtime. Se contasse, todo projeto Next teria o sinal ligado.
    const [signal] = detectSignals();
    expect(signal!.present).toBe(false);
  });

  it("e deterministico", () => {
    expect(detectSignals()).toEqual(detectSignals());
  });

  it("o estado do projeto acompanha o sinal detectado", () => {
    const [signal] = detectSignals();
    expect(state.signals.includes(signal!.signal)).toBe(signal!.present);
  });

  it("requisito desligado pelo sinal sai do calculo", () => {
    const envExample = framework.requirements.find((r) => r.id === "foundation.env-example")!;
    expect(envExample.applicability.always).toBe(false);
    expect(envExample.applicability.requiresSignals).toContain("uses_environment_config");
    expect(isApplicable(envExample, state.signals)).toBe(false);
  });

  it("requisito nao aplicavel informa o motivo em linguagem de leigo", () => {
    const envExample = framework.requirements.find((r) => r.id === "foundation.env-example")!;
    expect(envExample.applicability.notApplicableReason).toBeTruthy();
  });
});

describe("registro de ciclo: a base de 'por que meu projeto avancou'", () => {
  it("todo ciclo guarda a CAUSA, nao so os numeros", () => {
    for (const cycle of cycles.cycles) {
      expect(cycle.actionTaken.length).toBeGreaterThan(10);
      expect(cycle.actionTechnical.length).toBeGreaterThan(10);
      expect(cycle.actionTaken).not.toBe(cycle.actionTechnical);
      expect(cycle.outcome.length).toBeGreaterThan(10);
    }
  });

  it("guarda o antes e o depois do Navigator", () => {
    for (const cycle of cycles.cycles) {
      expect(cycle.navigatorBefore.requirementName).toBeTruthy();
      expect(cycle.navigatorAfter.requirementName).toBeTruthy();
    }
  });

  it("guarda a suficiencia das tres dimensoes antes e depois", () => {
    for (const cycle of cycles.cycles) {
      expect(cycle.sufficiencyBefore).toHaveLength(3);
      expect(cycle.sufficiencyAfter).toHaveLength(3);
    }
  });

  it("guarda evidencia com localizador", () => {
    for (const cycle of cycles.cycles) {
      expect(cycle.evidenceProduced.length).toBeGreaterThan(0);
    }
  });

  it("um ciclo que NAO aumentou numero continua sendo um ciclo valido", () => {
    // O primeiro ciclo baixou a cobertura de Production. Isso e informacao,
    // nao fracasso: o ciclo evitou construir algo inutil.
    const primeiro = cycles.cycles.find((c) => c.id === "cycle-0001")!;
    const prodBefore = primeiro.sufficiencyBefore.find((d) => d.dimension === "production")!;
    const prodAfter = primeiro.sufficiencyAfter.find((d) => d.dimension === "production")!;
    expect(prodAfter.weightedCoverage).toBeLessThanOrEqual(prodBefore.weightedCoverage);
    expect(primeiro.outcome).toContain("Nenhum número subiu");
  });

  it("ciclos mais recentes primeiro", () => {
    const ordered = recentCycles(cycles, 10);
    for (let i = 1; i < ordered.length; i += 1) {
      expect(ordered[i - 1]!.at >= ordered[i]!.at).toBe(true);
    }
  });
});
