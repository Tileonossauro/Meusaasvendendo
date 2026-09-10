import { describe, expect, it } from "vitest";
import { scanRepository } from "../src/collectors/repo-scanner.js";
import { loadFramework } from "../src/framework/index.js";
import { observationStrength, SUFFICIENCY_THRESHOLDS } from "../src/scoring/sufficiency.js";
import { requirementStateSchema, type Requirement, type RequirementState } from "../src/framework/schema.js";

const framework = loadFramework();
const proposals = scanRepository({ runCommands: false });
const byId = new Map(proposals.map((p) => [p.requirementId, p]));
const req = (id: string): Requirement => framework.requirements.find((r) => r.id === id)!;

function stateOf(overrides: Partial<RequirementState>): RequirementState {
  return {
    requirementId: "x",
    status: "missing",
    confidence: 0.9,
    evidence: [{ source: "file", provenance: "static_analysis", locator: "a:1", note: "nota" }],
    provenance: "static_analysis",
    collectionMethod: "deterministic",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("caso 1: arquivo obrigatorio inexistente = ausencia CONCLUSIVA", () => {
  it(".env.example ausente e conclusivo: o caminho e fixo", () => {
    const p = byId.get("foundation.env-example")!;
    expect(p.detectionOutcome).toBe("confirmed_absent");
    expect(p.observationScope).toContain(".env.example");
  });

  it("ausencia conclusiva recebe forca elevada mesmo sem executar comando", () => {
    const strength = observationStrength(
      req("security.rate-limiting"),
      stateOf({ status: "missing", detectionOutcome: "confirmed_absent", observationScope: "caminho fixo" }),
    );
    expect(strength).toBeGreaterThanOrEqual(SUFFICIENCY_THRESHOLDS.criticalMinStrength);
  });

  it("script npm ausente e conclusivo: package.json enumera todo o espaco", () => {
    // Verificacao direta do contrato do coletor.
    for (const p of proposals) {
      if (p.detectionOutcome !== "confirmed_absent") continue;
      expect(p.observationScope, `${p.requirementId} sem espaco declarado`).toBeTruthy();
    }
  });
});

describe("caso 2: feature complexa nao encontrada = ausencia NAO conclusiva", () => {
  it("busca por padroes nunca produz ausencia conclusiva", () => {
    const p = byId.get("security.untrusted-content-boundary")!;
    expect(p.detectionOutcome).toBe("not_detected");
    expect(p.status).not.toBe("missing");
    expect(p.status).toBe("uncertain");
  });

  it("varredura de segredos por padrao tambem e nao conclusiva", () => {
    const p = byId.get("security.no-secrets-in-repo")!;
    expect(p.detectionOutcome).toBe("not_detected");
    expect(p.status).toBe("partial");
  });

  it("ausencia NAO conclusiva nao ganha o bonus de forca", () => {
    const naoConclusiva = observationStrength(
      req("security.rate-limiting"),
      stateOf({ status: "missing", detectionOutcome: "not_detected" }),
    );
    const conclusiva = observationStrength(
      req("security.rate-limiting"),
      stateOf({ status: "missing", detectionOutcome: "confirmed_absent", observationScope: "caminho fixo" }),
    );
    expect(naoConclusiva).toBeLessThan(conclusiva);
    expect(naoConclusiva).toBeLessThan(SUFFICIENCY_THRESHOLDS.criticalMinStrength);
  });

  it("o scanner recusa emitir missing apoiado em not_detected", () => {
    // Guarda estrutural: nenhuma proposta pode combinar os dois.
    for (const p of proposals) {
      if (p.status === "missing") expect(p.detectionOutcome).not.toBe("not_detected");
    }
  });

  it("ausencia conclusiva sem espaco declarado e rejeitada pelo schema", () => {
    expect(() =>
      requirementStateSchema.parse(
        stateOf({ detectionOutcome: "confirmed_absent", observationScope: undefined }),
      ),
    ).toThrow();
  });
});

describe("caso 3: requisito operacional nunca vira missing por analise estatica", () => {
  it("o scanner nao se pronuncia sobre requisitos operacionais", () => {
    const operacionais = framework.requirements.filter((r) => r.kind === "operational");
    expect(operacionais.length).toBeGreaterThan(0);
    for (const requirement of operacionais) {
      const p = byId.get(requirement.id);
      if (!p) continue;
      expect(p.status).not.toBe("missing");
      expect(p.provenance).not.toBe("static_analysis");
    }
  });

  it("leitura estatica de requisito operacional tem forca baixa mesmo se alguem tentar", () => {
    const deploy = req("deploy.production-deploy-works");
    expect(deploy.kind).toBe("operational");
    const strength = observationStrength(
      deploy,
      stateOf({ status: "completed", provenance: "static_analysis", confidence: 1 }),
    );
    expect(strength).toBeLessThan(SUFFICIENCY_THRESHOLDS.criticalMinStrength);
  });
});
