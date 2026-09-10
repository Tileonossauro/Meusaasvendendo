import type { CategoryBlock } from "../../../src/dashboard/view-model.js";
import { Disclosure, TechRow } from "./Disclosure";

/** As 12 áreas do projeto. Progresso de preenchimento, não Readiness Score. */
export function ProjectMap({ blocks }: { blocks: CategoryBlock[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {blocks.map((block) => (
        <div key={block.category.id} className="rounded-xl border border-ink-line bg-ink-soft p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium text-slate-100">{block.category.name}</h3>
            <span className="text-xs tabular-nums text-slate-400">
              {block.completed}/{block.total}
            </span>
          </div>

          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {block.category.simple}
          </p>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-line">
            <div
              className={`h-full rounded-full ${
                block.percent === 100
                  ? "bg-emerald-400"
                  : block.percent > 0
                    ? "bg-sky-400"
                    : "bg-slate-700"
              }`}
              style={{ width: `${block.percent}%` }}
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
            {block.partial > 0 && <span>{block.partial} parcial</span>}
            {block.missing > 0 && <span>{block.missing} falta</span>}
            {block.notApplicable > 0 && <span>{block.notApplicable} não se aplica</span>}
          </div>

          <Disclosure label="Ver contagem">
            <TechRow label="id" value={block.category.id} />
            <TechRow label="aplicáveis" value={block.total} />
            <TechRow label="concluídos" value={block.completed} />
            <TechRow label="parciais" value={block.partial} />
            <TechRow label="faltando" value={block.missing} />
            <TechRow label="não aplicáveis" value={block.notApplicable} />
          </Disclosure>
        </div>
      ))}
    </div>
  );
}
