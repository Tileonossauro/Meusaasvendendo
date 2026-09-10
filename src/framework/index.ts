// Sem atributo de import: mantem compatibilidade entre tsx, vitest e o bundler do Next.
import rawFramework from "./framework.v0.json";
import { frameworkSchema, type Framework, type Requirement } from "./schema.js";

/** Carrega e VALIDA o framework. Framework invalido derruba o processo de proposito. */
export function loadFramework(): Framework {
  return frameworkSchema.parse(rawFramework);
}

export function requirementById(framework: Framework): Map<string, Requirement> {
  return new Map(framework.requirements.map((r) => [r.id, r]));
}

export * from "./schema.js";
