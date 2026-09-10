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

  it("rejeita ciclo de dependencias", () => {
    const cyclic = structuredClone(framework);
    cyclic.requirements[0]!.dependsOn = [cyclic.requirements[1]!.id];
    cyclic.requirements[1]!.dependsOn = [cyclic.requirements[0]!.id];
    expect(() => buildGraph(cyclic)).toThrow(FrameworkGraphError);
  });
});
