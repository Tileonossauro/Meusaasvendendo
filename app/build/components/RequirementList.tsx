import type { RequirementCardView, BlockerView } from "../../../src/dashboard/view-model.js";
import { Disclosure, TechRow } from "./Disclosure";
import { OwnerBadge, SeverityBadge } from "./Section";

const STATUS_LABEL: Record<string, string> = {
  completed: "Concluído",
  partial: "Parcial",
  missing: "Falta fazer",
  blocked: "Bloqueado",
  uncertain: "Incerto",
  not_applicable: "Não se aplica",
};

export function RequirementList({ items }: { items: RequirementCardView[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">Nada aqui no momento.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const r = item.requirement;
        return (
          <li key={r.id} className="rounded-xl border border-ink-line bg-ink-soft p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-slate-100">{r.name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  {r.simpleExplanation}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <OwnerBadge owner={r.owner} />
                <SeverityBadge severity={r.severity} launchBlocking={r.launchBlocking} />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>Status: {STATUS_LABEL[item.status] ?? item.status}</span>
              {item.unlocksNow > 0 && (
                <span>
                  Destrava {item.unlocksNow} agora
                  {item.downstreamImpact > 0 && ` · abre caminho para ${item.downstreamImpact}`}
                </span>
              )}
              {item.unlocksNow === 0 && item.downstreamImpact > 0 && (
                <span>Abre caminho para {item.downstreamImpact} requisito(s)</span>
              )}
              <span>
                {r.aiCanHandle ? "A IA consegue resolver" : "Precisa de uma pessoa"}
              </span>
            </div>

            <Disclosure>
              <TechRow label="id" value={r.id} />
              <TechRow label="requisito técnico" value={r.technicalExplanation} />
              <TechRow label="por que importa" value={r.whyItMatters} />
              <TechRow label="impacto" value={r.impactSummary} />
              <TechRow label="ação recomendada" value={r.recommendedAction} />
              <TechRow label="verificação" value={r.verification} />
              {item.state && (
                <>
                  <TechRow label="confiança" value={item.state.confidence} />
                  <TechRow label="proveniência" value={item.state.provenance} />
                  <TechRow label="método de coleta" value={item.state.collectionMethod} />
                  {item.state.evidence.map((e, i) => (
                    <TechRow
                      key={i}
                      label={`evidência ${i + 1}`}
                      value={`${e.source}${e.locator ? ` · ${e.locator}` : ""} — ${e.note}`}
                    />
                  ))}
                </>
              )}
            </Disclosure>
          </li>
        );
      })}
    </ul>
  );
}

export function BlockerList({ items }: { items: BlockerView[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">Nenhum bloqueador no momento.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const r = item.requirement;
        return (
          <li
            key={r.id}
            className={`rounded-xl border bg-ink-soft p-4 ${
              item.launchBlocking ? "border-rose-500/30" : "border-ink-line"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-slate-100">{r.name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  {r.simpleExplanation}
                </p>
              </div>
              <SeverityBadge severity={r.severity} launchBlocking={r.launchBlocking} />
            </div>

            <p className="mt-3 text-sm text-slate-400">
              <span className="text-slate-500">Esperando por: </span>
              {item.waitingOn.map((w) => w.name).join(" · ")}
            </p>

            <Disclosure>
              <TechRow label="id" value={r.id} />
              <TechRow label="depende de" value={item.waitingOn.map((w) => w.id).join(", ")} />
              <TechRow label="requisito técnico" value={r.technicalExplanation} />
            </Disclosure>
          </li>
        );
      })}
    </ul>
  );
}
