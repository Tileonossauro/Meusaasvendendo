import type { Cycle } from "../../../src/history/cycle.js";
import { Disclosure, TechRow } from "./Disclosure";

const DIMENSION_LABEL: Record<string, string> = {
  mvp: "MVP",
  production: "Production",
  aiBuild: "AI Build",
};

/**
 * "Por que meu projeto avancou?" — cada ciclo do Navigator, com a CAUSA.
 * Nem todo ciclo aumenta numero, e isso tambem e informacao.
 */
export function Cycles({ cycles }: { cycles: Cycle[] }) {
  if (cycles.length === 0) {
    return <p className="text-sm text-slate-500">Nenhum ciclo registrado ainda.</p>;
  }

  return (
    <ul className="space-y-4">
      {cycles.map((cycle) => (
        <li key={cycle.id} className="rounded-xl border border-ink-line bg-ink-soft p-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="font-mono text-slate-400">{cycle.id}</span>
            <span>
              {new Date(cycle.at).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </span>
            <span>framework v{cycle.frameworkVersion}</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded bg-ink-line px-2 py-1 text-slate-400">
              {cycle.navigatorBefore.requirementName}
            </span>
            <span className="text-slate-600">→</span>
            <span className="rounded bg-sky-500/15 px-2 py-1 text-sky-300">
              {cycle.navigatorAfter.requirementName}
            </span>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-slate-300">{cycle.actionTaken}</p>

          <p className="mt-3 rounded-lg border border-ink-line bg-black/25 p-3 text-sm leading-relaxed text-slate-400">
            <span className="text-xs uppercase tracking-wide text-slate-600">Resultado: </span>
            {cycle.outcome}
          </p>

          <Disclosure label="Ver evidência e números do ciclo">
            <TechRow label="ação técnica" value={cycle.actionTechnical} />
            {cycle.evidenceProduced.map((evidence, i) => (
              <TechRow key={i} label={`evidência ${i + 1}`} value={evidence} />
            ))}
            {cycle.requirementsChanged.map((change) => (
              <TechRow
                key={change.requirementId}
                label={change.requirementId}
                value={`${change.from} → ${change.to}`}
              />
            ))}
            <TechRow
              label="destravava agora (antes)"
              value={cycle.navigatorBefore.unlocksNow.join(", ") || "—"}
            />
            <TechRow
              label="impacto futuro (antes)"
              value={cycle.navigatorBefore.downstreamImpact.join(", ") || "—"}
            />
            <div className="mt-2 border-t border-ink-line pt-2">
              <p className="mb-1 text-slate-500">Cobertura ponderada, antes → depois:</p>
              {cycle.sufficiencyBefore.map((before) => {
                const after = cycle.sufficiencyAfter.find((a) => a.dimension === before.dimension);
                return (
                  <TechRow
                    key={before.dimension}
                    label={DIMENSION_LABEL[before.dimension] ?? before.dimension}
                    value={`${Math.round(before.weightedCoverage * 100)}% → ${Math.round((after?.weightedCoverage ?? 0) * 100)}% · publicável: ${after?.sufficient ? "sim" : "não"}`}
                  />
                );
              })}
            </div>
          </Disclosure>
        </li>
      ))}
    </ul>
  );
}
