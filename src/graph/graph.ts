import type { Framework, Requirement } from "../framework/schema.js";

/**
 * Grafo de dependencias entre requisitos.
 *
 * Requisitos NAO sao uma checklist plana: destravar "decidir preco" destrava
 * seis tarefas de IA abaixo dele. O grafo e o que permite responder
 * "qual acao disponivel agora destrava mais progresso".
 */
export interface RequirementGraph {
  /** id -> ids dos quais ele depende (pais) */
  dependsOn: Map<string, string[]>;
  /** id -> ids que dependem dele (filhos diretos) */
  dependents: Map<string, string[]>;
  /** id -> ids que dependem dele direta ou indiretamente */
  transitiveDependents: Map<string, string[]>;
}

export class FrameworkGraphError extends Error {}

export function buildGraph(framework: Framework): RequirementGraph {
  const ids = new Set(framework.requirements.map((r) => r.id));
  const dependsOn = new Map<string, string[]>();
  const dependents = new Map<string, string[]>();

  for (const r of framework.requirements) {
    dependsOn.set(r.id, r.dependsOn);
    if (!dependents.has(r.id)) dependents.set(r.id, []);
  }

  for (const r of framework.requirements) {
    for (const dep of r.dependsOn) {
      if (!ids.has(dep)) {
        throw new FrameworkGraphError(
          `Requisito "${r.id}" depende de "${dep}", que nao existe no framework.`,
        );
      }
      dependents.get(dep)!.push(r.id);
    }
  }

  detectCycles(framework.requirements, dependsOn);

  const transitiveDependents = new Map<string, string[]>();
  for (const id of ids) {
    transitiveDependents.set(id, collectTransitive(id, dependents));
  }

  return { dependsOn, dependents, transitiveDependents };
}

function collectTransitive(start: string, dependents: Map<string, string[]>): string[] {
  const seen = new Set<string>();
  const stack = [...(dependents.get(start) ?? [])];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);
    stack.push(...(dependents.get(current) ?? []));
  }
  // Ordenacao estavel: o resultado alimenta o Next Best Action, que precisa ser deterministico.
  return [...seen].sort();
}

function detectCycles(requirements: Requirement[], dependsOn: Map<string, string[]>): void {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>(requirements.map((r) => [r.id, WHITE]));

  const visit = (id: string, path: string[]): void => {
    color.set(id, GRAY);
    for (const dep of dependsOn.get(id) ?? []) {
      const c = color.get(dep);
      if (c === GRAY) {
        throw new FrameworkGraphError(
          `Ciclo de dependencias detectado: ${[...path, id, dep].join(" -> ")}`,
        );
      }
      if (c === WHITE) visit(dep, [...path, id]);
    }
    color.set(id, BLACK);
  };

  for (const r of requirements) {
    if (color.get(r.id) === WHITE) visit(r.id, []);
  }
}
