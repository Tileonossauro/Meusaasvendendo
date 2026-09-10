import { describe, expect, it } from "vitest";
import { loadFramework } from "../src/framework/index.js";
import { buildGraph, FrameworkGraphError } from "../src/graph/graph.js";
import { frameworkSchema } from "../src/framework/schema.js";

describe("framework v0", () => {
  const framework = loadFramework();

  it("valida contra o schema", () => {
    expect(() => frameworkSchema.parse(framework)).not.toThrow();
  });

  it("tem ids unicos", () => {
    const ids = framework.requirements.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("nao tem dependencia orfa nem ciclo", () => {
    expect(() => buildGraph(framework)).not.toThrow();
  });

  it("cobre as 12 categorias declaradas", () => {
    const used = new Set(framework.requirements.map((r) => r.category));
    for (const category of framework.categories) {
      expect(used.has(category.id)).toBe(true);
    }
  });

  it("declara pesos como nao calibrados", () => {
    expect(framework.weightsAreCalibrated).toBe(false);
  });

  it("todo requisito tem ao menos um sinal de deteccao e uma Definition of Done", () => {
    for (const r of framework.requirements) {
      expect(r.detection.length).toBeGreaterThan(0);
      expect(r.definitionOfDone.length).toBeGreaterThan(0);
    }
  });

  it("todo requisito carrega a linguagem de leigo escrita a mao, sem depender de IA", () => {
    for (const r of framework.requirements) {
      expect(r.simpleExplanation.length).toBeGreaterThan(10);
      expect(r.technicalExplanation.length).toBeGreaterThan(10);
      expect(r.whyItMatters.length).toBeGreaterThan(10);
      expect(r.impactSummary.length).toBeGreaterThan(10);
      expect(typeof r.userActionRequired).toBe("boolean");
      expect(typeof r.aiCanHandle).toBe("boolean");
      // A explicacao simples nao pode ser copia da tecnica.
      expect(r.simpleExplanation).not.toBe(r.technicalExplanation);
    }
  });

  it("userActionRequired nunca contradiz o owner", () => {
    for (const r of framework.requirements) {
      expect(r.userActionRequired).toBe(r.owner !== "ai");
    }
  });

  it("rejeita requisito cujo userActionRequired contradiz o owner", () => {
    const broken = structuredClone(framework);
    broken.requirements[0]!.owner = "ai";
    broken.requirements[0]!.userActionRequired = true;
    expect(() => frameworkSchema.parse(broken)).toThrow();
  });

  it("declara a versao do framework, para toda analise poder registra-la", () => {
    expect(framework.frameworkVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("rejeita ciclo de dependencias", () => {
    const cyclic = structuredClone(framework);
    cyclic.requirements[0]!.dependsOn = [cyclic.requirements[1]!.id];
    cyclic.requirements[1]!.dependsOn = [cyclic.requirements[0]!.id];
    expect(() => buildGraph(cyclic)).toThrow(FrameworkGraphError);
  });
});
