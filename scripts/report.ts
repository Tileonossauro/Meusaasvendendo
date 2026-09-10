/**
 * Relatorio de terminal do estado atual de um projeto.
 * Antecessor do Self-Build Dashboard: mesmos dados, sem interface.
 */
import { readFileSync } from "node:fs";
import { loadFramework } from "../src/framework/index.js";
import { parseProjectState } from "../src/state/index.js";
import { computeScoreReport, DIMENSIONS } from "../src/scoring/score.js";
import { computeNextBestAction } from "../src/navigator/next-best-action.js";

const projectId = process.argv[2] ?? "readiness-os";
const framework = loadFramework();
const state = parseProjectState(
  JSON.parse(readFileSync(`data/projects/${projectId}/state.json`, "utf8")),
);

const LABELS = { mvp: "MVP Score", production: "Production Score", aiBuild: "AI Build Readiness" };

const report = computeScoreReport(framework, state);
console.log(`\n${state.projectName}  ·  framework v${framework.frameworkVersion}\n`);

for (const dimension of DIMENSIONS) {
  const d = report.dimensions[dimension];
  const value = d.measured
    ? `${d.score}%${d.cappedByLaunchBlockers ? ` (limitado por ${d.openLaunchBlockers.length} bloqueador(es) de lancamento)` : ""}`
    : `Bootstrap / ainda nao medido (calculo provisorio: ${d.score}%)`;
  console.log(`${LABELS[dimension].padEnd(20)} ${value}`);
  console.log(
    `${" ".repeat(20)} ${d.applicableCount} requisitos aplicaveis · cobertura verificada ${Math.round(d.measuredCoverage * 100)}%`,
  );
}

const navigator = computeNextBestAction(framework, state);
console.log("\nPROXIMO PASSO RECOMENDADO");
if (navigator.nextBestAction) {
  const { requirement, unlocks, unlockedAiTasks, reason, priority } = navigator.nextBestAction;
  console.log(`  ${requirement.name}`);
  console.log(`  ${requirement.simpleExplanation}`);
  console.log(`  Responsavel: ${requirement.owner} · Destrava: ${unlocks.length} (${unlockedAiTasks} para a IA) · Prioridade: ${priority}`);
  console.log(`  Por que: ${reason}`);
} else {
  console.log("  Nada disponivel: tudo concluido ou tudo bloqueado por dependencia.");
}

const founder = navigator.candidates.filter((c) => c.requirement.owner === "founder" || c.requirement.owner === "founder_and_ai");
const ai = navigator.candidates.filter((c) => c.requirement.aiCanHandle);
console.log(`\nDEPENDE DE VOCE: ${founder.length}   ·   IA PODE FAZER: ${ai.length}   ·   BLOQUEADOS: ${navigator.blocked.length}\n`);
