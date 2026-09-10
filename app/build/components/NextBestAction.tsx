import type { RequirementCardView } from "../../../src/dashboard/view-model.js";
import { Disclosure, TechRow } from "./Disclosure";
import { OwnerBadge, SeverityBadge } from "./Section";

/** O elemento de maior destaque depois dos scores. O Navigator é o produto. */
export function NextBestAction({ action }: { action: RequirementCardView | null }) {
  if (!action) {
    return (
      <div className="mt-6 rounded-2xl border border-ink-line bg-ink-soft p-6 text-slate-400">
        Nenhuma ação disponível: tudo concluído ou tudo esperando dependência.
      </div>
    );
  }

  const { requirement: r } = action;

  return (
    <div className="mt-6 rounded-2xl border-2 border-sky-500/40 bg-gradient-to-br from-sky-500/10 to-transparent p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
        Próximo passo recomendado
      </p>

      <h2 className="mt-3 text-2xl font-semibold text-slate-50 md:text-3xl">{r.name}</h2>
      <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-300">
        {r.simpleExplanation}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Fact label="Responsável" value={<OwnerBadge owner={r.owner} />} />
        <Fact
          label="Impacto"
          value={<SeverityBadge severity={r.severity} launchBlocking={r.launchBlocking} />}
        />
        <Fact
          label="Desbloqueia"
          value={
            <span className="text-sm text-slate-200">
              {action.unlocks} requisito{action.unlocks === 1 ? "" : "s"}
              {action.unlockedAiTasks > 0 && (
                <span className="text-slate-400"> ({action.unlockedAiTasks} para a IA)</span>
              )}
            </span>
          }
        />
      </div>

      <div className="mt-6 rounded-xl border border-ink-line bg-black/25 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Por que este é o próximo passo
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{action.reason}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{r.whyItMatters}</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950">
          {r.userActionRequired ? "Tomar decisão" : "Deixar a IA executar"}
        </span>
        <span className="text-xs text-slate-500">{r.recommendedAction}</span>
      </div>

      <Disclosure label="Ver detalhes técnicos e como a prioridade foi calculada">
        <TechRow label="id" value={r.id} />
        <TechRow label="requisito técnico" value={r.technicalExplanation} />
        <TechRow label="impacto" value={r.impactSummary} />
        <TechRow label="verificação" value={r.verification} />
        <TechRow label="status atual" value={action.status} />
        <TechRow
          label="pesos (MVP/Prod/AI)"
          value={`${r.weights.mvp}/${r.weights.production}/${r.weights.aiBuild}`}
        />
        <TechRow label="prioridade" value={action.priority} />
        <div className="mt-2 border-t border-ink-line pt-2">
          <p className="mb-1 text-slate-500">Decomposição da prioridade:</p>
          {Object.entries(action.breakdown).map(([key, value]) => (
            <TechRow key={key} label={key} value={`+${value}`} />
          ))}
        </div>
        <div className="mt-2 border-t border-ink-line pt-2">
          <p className="mb-1 text-slate-500">Definition of Done:</p>
          <ul className="list-disc pl-4 text-slate-300">
            {r.definitionOfDone.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      </Disclosure>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-line bg-black/25 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-2">{value}</div>
    </div>
  );
}
