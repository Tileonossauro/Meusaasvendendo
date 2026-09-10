import type { CategoryBlock } from "../../../src/dashboard/view-model.js";
import { Disclosure, TechRow } from "./Disclosure";

/** As 12 áreas do projeto. Progresso de preenchimento, não Readiness Score. */
const SOURCE_LABEL: Record<CategoryBlock["evidenceSource"], { text: string; className: string }> = {
  declared: {
    text: "estado declarado",
    className: "bg-amber-500/10 text-amber-300/90 ring-amber-500/25",
  },
  decision_record: {
    text: "decisão registrada",
    className: "bg-violet-500/10 text-violet-300/90 ring-violet-500/25",
  },
  mixed: {
    text: "parte verificada por scanner",
    className: "bg-sky-500/10 text-sky-300/90 ring-sky-500/25",
  },
  verified: {
    text: "verificado por scanner",
    className: "bg-emerald-500/10 text-emerald-300/90 ring-emerald-500/25",
  },
};

export function ProjectMap({ blocks }: { blocks: CategoryBlock[] }) {
  const anyDeclared = blocks.some((b) => b.evidenceSource !== "verified");

  return (
    <>
      {anyDeclared && (
        <p className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-200/90">
          <strong className="font-semibold">Estas barras não são auditoria.</strong> Elas mostram
          o <strong>estado declarado</strong> de cada área — o que registramos à mão, ou o que um
          documento de decisão afirma. Só o selo <em>verificado por scanner</em> significa que o
          sistema conferiu por conta própria. Prontidão verificada aparece nos três Readiness
          Scores, no topo.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {blocks.map((block) => (
        <div key={block.category.id} className="rounded-xl border border-ink-line bg-ink-soft p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium text-slate-100">{block.category.name}</h3>
            <span className="text-xs tabular-nums text-slate-400">
              {block.completed}/{block.total}
            </span>
          </div>

          <span
            className={`mt-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide ring-1 ${SOURCE_LABEL[block.evidenceSource].className}`}
          >
            {SOURCE_LABEL[block.evidenceSource].text}
          </span>

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
            <TechRow label="verificados por scanner" value={block.verifiedCount} />
            <TechRow label="vindos de decisão registrada" value={block.decisionRecordCount} />
            <TechRow label="declarados à mão" value={block.declaredCount} />
            <TechRow
              label="natureza da barra"
              value={`${block.percent}% de estado ${block.evidenceSource === "verified" ? "verificado por scanner" : "declarado"} — não é readiness`}
            />
          </Disclosure>
        </div>
      ))}
      </div>
    </>
  );
}
