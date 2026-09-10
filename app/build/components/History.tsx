import type { HistoryEvent } from "../../../src/history/schema.js";
import type { Milestone } from "../../../src/progress/build-progress.js";
import type { NowBuilding as NowBuildingState } from "../../../src/dashboard/view-model.js";

const EVENT_ICON: Record<string, string> = {
  requirement_completed: "✓",
  requirement_changed: "±",
  founder_decision: "★",
  dependency_unblocked: "→",
  score_changed: "%",
  milestone_completed: "◆",
};

export function RecentlyCompleted({ events }: { events: HistoryEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-500">Nenhum evento registrado ainda.</p>;
  }

  return (
    <ul className="space-y-2">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3 rounded-xl border border-ink-line bg-ink-soft p-4">
          <span className="mt-0.5 shrink-0 text-sm text-emerald-400">
            {EVENT_ICON[event.type] ?? "•"}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-slate-200">{event.title}</p>
            {event.detail && (
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{event.detail}</p>
            )}
            <p className="mt-1.5 text-[11px] text-slate-600">
              {new Date(event.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              {" · framework v"}
              {event.frameworkVersion}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A seção "AGORA": o que está sendo construído neste momento. */
export function NowBuilding({
  now,
  milestones,
}: {
  now: NowBuildingState | null;
  milestones: Milestone[];
}) {
  const current = now?.state === "in_progress" ? now.milestone : null;
  const nextPlanned = now?.state === "awaiting_review" ? now.milestone : null;

  return (
    <div className="rounded-2xl border border-ink-line bg-ink-soft p-5">
      {current ? (
        <>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-400" />
            </span>
            <h3 className="font-medium text-slate-100">{current.name}</h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{current.outcome}</p>
        </>
      ) : nextPlanned ? (
        <>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <h3 className="font-medium text-slate-100">
              Aguardando sua revisão para começar: {nextPlanned.name}
            </h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{nextPlanned.outcome}</p>
        </>
      ) : (
        <p className="text-sm text-slate-400">Todos os marcos do plano foram concluídos.</p>
      )}

      <ol className="mt-5 space-y-2 border-t border-ink-line pt-4">
        {milestones.map((m) => (
          <li key={m.id} className="flex items-start gap-3 text-sm">
            <span
              className={
                m.status === "done"
                  ? "text-emerald-400"
                  : m.status === "in_progress"
                    ? "text-sky-400"
                    : "text-slate-600"
              }
            >
              {m.status === "done" ? "✓" : m.status === "in_progress" ? "◐" : "○"}
            </span>
            <span className={m.status === "planned" ? "text-slate-600" : "text-slate-300"}>
              {m.name}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
