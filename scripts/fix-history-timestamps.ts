/**
 * Correcao unica: timestamps escritos a mao por agentes.
 *
 * Alguns eventos foram registrados com horarios que ainda estavam no FUTURO no
 * momento em que foram escritos — um agente digitando "13:00" quando o relogio
 * marcava 11:02. Isso corrompe a integridade do historico.
 *
 * Fonte legitima de recuperacao: a data do commit que introduziu cada evento.
 * Um evento nao pode ter acontecido DEPOIS do commit que o contem. Onde o
 * timestamp registrado e posterior ao commit, ele e substituido pela data do
 * commit e marcado com `atSource: "commit_reconstructed"`.
 *
 * Nao inventamos precisao: a data do commit e a melhor informacao legitima
 * disponivel, e o campo `atSource` deixa a correcao auditavel.
 *
 * Uso: npx tsx scripts/fix-history-timestamps.ts [--apply]
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const HISTORY = "data/projects/readiness-os/history.json";
const apply = process.argv.includes("--apply");

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}

// Commits que tocaram o historico, do mais antigo para o mais novo.
const commits = git(["log", "--reverse", "--format=%H %aI", "--", HISTORY])
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [hash, date] = line.split(" ");
    return { hash: hash!, date: date! };
  });

/** Primeira aparicao de cada id de evento, e a data do commit correspondente. */
const firstSeen = new Map<string, string>();
for (const commit of commits) {
  let content: string;
  try {
    content = git(["show", `${commit.hash}:${HISTORY}`]);
  } catch {
    continue;
  }
  const parsed = JSON.parse(content) as { events: { id: string }[] };
  for (const event of parsed.events) {
    if (!firstSeen.has(event.id)) firstSeen.set(event.id, commit.date);
  }
}

const history = JSON.parse(readFileSync(HISTORY, "utf8")) as {
  events: { id: string; at: string; atSource?: string; title: string }[];
};

const corrections: { id: string; from: string; to: string; title: string }[] = [];

for (const event of history.events) {
  const commitDate = firstSeen.get(event.id);
  if (!commitDate) continue; // ainda nao commitado: timestamp veio do relogio agora
  const recorded = new Date(event.at).getTime();
  const introduced = new Date(commitDate).getTime();
  if (recorded <= introduced) continue; // coerente: registrado antes de ser commitado

  corrections.push({ id: event.id, from: event.at, to: commitDate, title: event.title });
  if (apply) {
    event.at = new Date(commitDate).toISOString();
    event.atSource = "commit_reconstructed";
  }
}

console.log(`\nEventos analisados: ${history.events.length}`);
console.log(`Timestamps incoerentes (posteriores ao commit que os introduziu): ${corrections.length}\n`);
for (const c of corrections) {
  console.log(`  ${c.id}  ${c.from}  ->  ${new Date(c.to).toISOString()}`);
  console.log(`      ${c.title}`);
}

if (!apply) {
  console.log("\nNada foi escrito. Rode com --apply para corrigir.\n");
} else {
  writeFileSync(HISTORY, JSON.stringify(history, null, 2) + "\n");
  console.log(`\nCorrigido. ${corrections.length} evento(s) marcados como commit_reconstructed.\n`);
}
