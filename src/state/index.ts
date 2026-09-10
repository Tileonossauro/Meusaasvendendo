import { projectStateSchema, type ProjectState } from "../framework/schema.js";

/**
 * Estado por projeto. Multi-projeto desde o inicio: nada aqui assume que
 * existe um unico projeto por usuario. O Readiness OS e apenas o primeiro.
 */
export function parseProjectState(raw: unknown): ProjectState {
  return projectStateSchema.parse(raw);
}
