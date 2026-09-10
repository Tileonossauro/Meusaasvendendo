/**
 * Reconcilia decisoes formais (ADRs) com o estado dos requisitos.
 *
 * Uso:
 *   npm run reconcile            # mostra o que mudaria, sem escrever
 *   npm run reconcile -- --apply # aplica e registra os eventos no historico
 *
 * Deterministico e idempotente: rodar duas vezes seguidas nao produz mudanca
 * na segunda vez.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadFramework } from "../src/framework/index.js";
import { parseProjectState } from "../src/state/index.js";
import { parseProjectHistory } from "../src/history/schema.js";
import { computeNextBestAction } from "../src/navigator/next-best-action.js";
import { reconcileDecisions } from "../src/collectors/adr-reconciler.js";
import { proposalChangesState } from "../src/collectors/types.js";
import type { HistoryEvent } from "../src/history/schema.js";
import type { ProjectState } from "../src/framework/schema.js";

const projectId = process.argv.find((a) => !a.startsWith("--") && a !== process.argv[0] && a !== process.argv[1]) ?? "readiness-os";
const apply = process.argv.includes("--apply");
const now = new Date().toISOString();

const dir = path.join(process.cwd(), "data", "projects", projectId);
const statePath = path.join(dir, "state.json");
const historyPath = path.join(dir, "history.json");

const framework = loadFramework();
const state: ProjectState = parseProjectState(JSON.parse(readFileSync(statePath, "utf8")));
const history = parseProjectHistory(JSON.parse(readFileSync(historyPath, "utf8")));

const before = computeNextBestAction(framework, state).nextBestAction;
const proposals = reconcileDecisions(framework);
const stateById = new Map(state.states.map((s) => [s.requirementId, s]));

const changes = proposals.filter((p) => proposalChangesState(p, stateById.get(p.requirementId)));

console.log(`\nReconciliacao de decisoes — projeto ${projectId} · framework v${framework.frameworkVersion}`);
console.log(`ADRs analisados produziram ${proposals.length} proposta(s); ${changes.length} alteram o estado atual.\n`);

if (changes.length === 0) {
  console.log("Nada a reconciliar: o estado ja acompanha as decisoes registradas.\n");
  process.exit(0);
}

for (const change of changes) {
  const current = stateById.get(change.requirementId);
  const requirement = framework.requirements.find((r) => r.id === change.requirementId)!;
  console.log(`  ${requirement.name}`);
  console.log(`    ${change.requirementId}: ${current?.status ?? "sem estado"} -> ${change.status}`);
  console.log(`    motivo: ${change.reason}`);
  console.log(`    evidencia: ${change.evidence[0]?.locator}`);
  console.log(
    `    proveniencia: ${change.provenance} · coleta: ${change.collectionMethod}` +
      ` (confianca ${change.confidence})\n`,
  );
}

if (!apply) {
  console.log("Nada foi escrito. Rode com --apply para aplicar.\n");
  process.exit(0);
}

// Ids derivados do maior id existente, nunca do tamanho da lista: remover um
// evento antigo nao pode fazer o proximo id colidir com um ja usado.
let eventCounter = history.events.reduce((max, e) => {
  const n = Number.parseInt(e.id.replace(/\D/g, ""), 10);
  return Number.isNaN(n) ? max : Math.max(max, n);
}, 0);
const newEvents: HistoryEvent[] = [];

for (const change of changes) {
  const current = stateById.get(change.requirementId);
  const requirement = framework.requirements.find((r) => r.id === change.requirementId)!;

  // Captura o status ANTES de mutar: senao o historico registra o valor novo
  // como se fosse o antigo.
  const previousStatus = current?.status ?? "sem estado";

  const next = {
    requirementId: change.requirementId,
    status: change.status,
    confidence: change.confidence,
    evidence: change.evidence,
    provenance: change.provenance,
    collectionMethod: change.collectionMethod,
    updatedAt: now,
    note: change.reason,
  };

  if (current) {
    Object.assign(current, next);
  } else {
    state.states.push(next);
  }

  eventCounter += 1;
  newEvents.push({
    id: `evt-${String(eventCounter).padStart(4, "0")}`,
    type: change.status === "completed" ? "requirement_completed" : "requirement_changed",
    at: now,
    title: `${requirement.name}: reconciliado com uma decisão já registrada`,
    detail:
      `${change.reason} O estado dizia "${previousStatus}" enquanto a decisão já existia na ` +
      `documentação. Decisão reconciliada automaticamente a partir de um ADR aceito — a leitura ` +
      `foi automática, mas o ADR e sua ligação com o requisito foram declarados por uma pessoa.`,
    requirementId: change.requirementId,
    frameworkVersion: framework.frameworkVersion,
  });
}

state.updatedAt = now;

const after = computeNextBestAction(framework, state).nextBestAction;
if (before?.requirement.id !== after?.requirement.id) {
  eventCounter += 1;
  newEvents.push({
    id: `evt-${String(eventCounter).padStart(4, "0")}`,
    type: "dependency_unblocked",
    at: now,
    title: `A recomendação mudou: agora é "${after?.requirement.name ?? "nenhuma"}"`,
    detail: `Antes era "${before?.requirement.name ?? "nenhuma"}". O Navigator recalculou após a reconciliação.`,
    requirementId: after?.requirement.id,
    frameworkVersion: framework.frameworkVersion,
  });
}

history.events.push(...newEvents);

writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
writeFileSync(historyPath, JSON.stringify(history, null, 2) + "\n");

console.log(`Aplicado. ${changes.length} requisito(s) atualizados, ${newEvents.length} evento(s) registrados.`);
console.log(`Next Best Action: "${before?.requirement.name ?? "nenhuma"}" -> "${after?.requirement.name ?? "nenhuma"}"\n`);
