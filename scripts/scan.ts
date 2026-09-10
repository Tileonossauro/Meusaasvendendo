/**
 * Scanner deterministico local do proprio repositorio.
 *
 * Uso:
 *   npm run scan                # mostra o que o scanner conseguiu provar
 *   npm run scan -- --apply     # aplica ao estado e registra o historico
 *   npm run scan -- --no-commands  # so leitura de arquivos, sem executar nada
 *
 * Sem LLM. Apenas leitura de arquivos e execucao de comandos.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadFramework } from "../src/framework/index.js";
import { parseProjectState } from "../src/state/index.js";
import { parseProjectHistory } from "../src/history/schema.js";
import { appendHistoryEvent } from "../src/history/create-event.js";
import { systemClock } from "../src/history/clock.js";
import { computeNextBestAction } from "../src/navigator/next-best-action.js";
import { computeScoreReport, DIMENSIONS } from "../src/scoring/score.js";
import { scanRepository } from "../src/collectors/repo-scanner.js";
import { proposalChangesState } from "../src/collectors/types.js";
import type { HistoryEvent } from "../src/history/schema.js";
import type { ProjectState } from "../src/framework/schema.js";

const apply = process.argv.includes("--apply");
const runCommands = !process.argv.includes("--no-commands");
const projectId = "readiness-os";
const clock = systemClock;
const now = clock.now().toISOString();

const dir = path.join(process.cwd(), "data", "projects", projectId);
const statePath = path.join(dir, "state.json");
const historyPath = path.join(dir, "history.json");

const framework = loadFramework();
const state: ProjectState = parseProjectState(JSON.parse(readFileSync(statePath, "utf8")));
const history = parseProjectHistory(JSON.parse(readFileSync(historyPath, "utf8")));

const before = {
  action: computeNextBestAction(framework, state).nextBestAction,
  scores: computeScoreReport(framework, state),
};

console.log(`\nScanner deterministico — projeto ${projectId} · framework v${framework.frameworkVersion}`);
console.log(`Execucao de comandos: ${runCommands ? "ligada" : "desligada"}\n`);

const proposals = scanRepository({ runCommands });
const stateById = new Map(state.states.map((s) => [s.requirementId, s]));
const changes = proposals.filter((p) => proposalChangesState(p, stateById.get(p.requirementId)));

const byStatus = proposals.reduce<Record<string, number>>((acc, p) => {
  acc[p.status] = (acc[p.status] ?? 0) + 1;
  return acc;
}, {});

console.log(`O scanner conseguiu se pronunciar sobre ${proposals.length} requisito(s):`);
for (const [status, count] of Object.entries(byStatus).sort()) {
  console.log(`  ${status}: ${count}`);
}
console.log(`\n${changes.length} alteram o estado atual.\n`);

for (const proposal of proposals) {
  const requirement = framework.requirements.find((r) => r.id === proposal.requirementId)!;
  const current = stateById.get(proposal.requirementId);
  const willChange = changes.includes(proposal);
  console.log(`  ${willChange ? "*" : " "} ${requirement.name}`);
  console.log(`      ${proposal.requirementId}: ${current?.status ?? "sem estado"} -> ${proposal.status}`);
  console.log(`      proveniencia: ${proposal.provenance} · confianca: ${proposal.confidence}`);
  for (const evidence of proposal.evidence) {
    console.log(`      evidencia: ${evidence.locator} — ${evidence.note}`);
  }
  console.log(`      motivo: ${proposal.reason}`);
  console.log(`      em linguagem simples: ${proposal.simpleReason}\n`);
}

if (!apply) {
  console.log("Nada foi escrito. Rode com --apply para aplicar.\n");
  process.exit(0);
}


const newEvents: HistoryEvent[] = [];

for (const proposal of changes) {
  const current = stateById.get(proposal.requirementId);
  const previousStatus = current?.status ?? "sem estado";
  const requirement = framework.requirements.find((r) => r.id === proposal.requirementId)!;

  const next = {
    requirementId: proposal.requirementId,
    status: proposal.status,
    confidence: proposal.confidence,
    evidence: proposal.evidence,
    provenance: proposal.provenance,
    collectionMethod: proposal.collectionMethod,
    detectionOutcome: proposal.detectionOutcome,
    observationScope: proposal.observationScope,
    updatedAt: now,
    note: proposal.reason,
  };

  if (current) Object.assign(current, next);
  else state.states.push(next);

  const { event } = appendHistoryEvent(history, {
    type: proposal.status === "completed" ? "requirement_completed" : "requirement_changed",
    title: `${requirement.name}: verificado pelo scanner`,
    detail:
      `${proposal.simpleReason} O estado passou de "${previousStatus}" para "${proposal.status}", ` +
      `com evidência em ${proposal.evidence[0]?.locator ?? "—"}. ` +
      `Verificação independente: o sistema conferiu o repositório por conta própria.`,
    requirementId: proposal.requirementId,
    frameworkVersion: framework.frameworkVersion,
  }, clock);
  newEvents.push(event);
}

state.updatedAt = now;

const after = {
  action: computeNextBestAction(framework, state).nextBestAction,
  scores: computeScoreReport(framework, state),
};

if (before.action?.requirement.id !== after.action?.requirement.id) {
  const { event } = appendHistoryEvent(history, {
    type: "dependency_unblocked",
    title: `A recomendação mudou: agora é "${after.action?.requirement.name ?? "nenhuma"}"`,
    detail: `Antes era "${before.action?.requirement.name ?? "nenhuma"}". O Navigator recalculou após a varredura.`,
    requirementId: after.action?.requirement.id,
    frameworkVersion: framework.frameworkVersion,
  }, clock);
  newEvents.push(event);
}
writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
writeFileSync(historyPath, JSON.stringify(history, null, 2) + "\n");

console.log(`Aplicado. ${changes.length} requisito(s) atualizados, ${newEvents.length} evento(s) registrados.\n`);
console.log("Cobertura por scanner independente:");
for (const dimension of DIMENSIONS) {
  const b = Math.round(before.scores.dimensions[dimension].independentCoverage * 100);
  const a = Math.round(after.scores.dimensions[dimension].independentCoverage * 100);
  const measured = after.scores.dimensions[dimension].measured;
  console.log(`  ${dimension.padEnd(12)} ${b}% -> ${a}%  ${measured ? "(MEDIDO)" : "(ainda nao medido)"}`);
}
console.log(`\nNext Best Action: "${before.action?.requirement.name}" -> "${after.action?.requirement.name}"\n`);
