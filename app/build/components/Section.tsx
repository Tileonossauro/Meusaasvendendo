export function Section({
  title,
  hint,
  count,
  children,
}: {
  title: string;
  hint?: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          {title}
        </h2>
        {typeof count === "number" && (
          <span className="rounded-full bg-ink-soft px-2 py-0.5 text-xs text-slate-500">
            {count}
          </span>
        )}
      </div>
      {hint && <p className="mb-4 -mt-2 text-sm text-slate-500">{hint}</p>}
      {children}
    </section>
  );
}

export function OwnerBadge({ owner }: { owner: string }) {
  const map: Record<string, { label: string; className: string }> = {
    founder: { label: "VOCÊ", className: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
    ai: { label: "IA", className: "bg-sky-500/15 text-sky-300 ring-sky-500/30" },
    integration: { label: "SERVIÇO EXTERNO", className: "bg-violet-500/15 text-violet-300 ring-violet-500/30" },
    founder_and_ai: { label: "VOCÊ + IA", className: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
  };
  const it = map[owner] ?? { label: owner, className: "bg-slate-700 text-slate-300 ring-slate-600" };
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide ring-1 ${it.className}`}>
      {it.label}
    </span>
  );
}

export function SeverityBadge({ severity, launchBlocking }: { severity: string; launchBlocking: boolean }) {
  if (launchBlocking) {
    return (
      <span className="rounded bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-rose-300 ring-1 ring-rose-500/30">
        BLOQUEIA LANÇAMENTO
      </span>
    );
  }
  const map: Record<string, string> = {
    blocker: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
    high: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
    medium: "bg-yellow-500/10 text-yellow-300 ring-yellow-500/25",
    low: "bg-slate-700/40 text-slate-400 ring-slate-600/40",
  };
  const labels: Record<string, string> = { blocker: "CRÍTICO", high: "ALTO", medium: "MÉDIO", low: "BAIXO" };
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide ring-1 ${map[severity] ?? map.low}`}>
      {labels[severity] ?? severity}
    </span>
  );
}
