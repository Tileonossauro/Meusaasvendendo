import type { BuildProgress } from "../../../src/progress/build-progress.js";
import type { ReadinessCard } from "../../../src/dashboard/view-model.js";
import { Disclosure, TechRow } from "./Disclosure";

/**
 * Build Progress e os tres Readiness Scores sao apresentados como coisas
 * DIFERENTES, de proposito e visualmente separados:
 *
 * - Build Progress tem porcentagem, porque mede o nosso plano de construcao.
 * - Readiness so tem porcentagem quando medido por evidencia real.
 */

export function BuildProgressCard({ progress }: { progress: BuildProgress }) {
  return (
    <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-transparent p-6">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Build Progress
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Quanto do nosso plano de construção já foi construído.
          </p>
        </div>
        <span className="text-5xl font-semibold tabular-nums text-emerald-300">
          {progress.percent}%
        </span>
      </div>

      <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-ink-line">
        <div
          className="h-full rounded-full bg-emerald-400 transition-all"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-200/90">
        <strong className="font-semibold">Atenção:</strong> isto NÃO é prontidão do produto.
        Mede apenas o progresso do plano de construção. A prontidão real aparece nos três
        cartões abaixo, e só quando o scanner medir evidência de verdade.
      </p>

      <p className="mt-3 text-xs text-slate-500">
        {progress.done} de {progress.total} marcos concluídos
        {progress.current ? ` · em andamento: ${progress.current.name}` : ""}
      </p>
    </div>
  );
}

export function ReadinessCards({ cards }: { cards: ReadinessCard[] }) {
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <div key={card.dimension} className="rounded-2xl border border-ink-line bg-ink-soft p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            {card.label}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{card.question}</p>

          <div className="mt-4">
            {card.percent === null ? (
              <>
                <p className="text-lg font-semibold leading-tight text-slate-300">
                  Bootstrap
                </p>
                <p className="text-sm text-slate-500">ainda não medido</p>
              </>
            ) : (
              <p className="text-4xl font-semibold tabular-nums text-slate-100">
                {card.percent}%
              </p>
            )}
          </div>

          {card.percent === null && (
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Nenhum requisito foi verificado por evidência automática ainda. Mostrar um
              número aqui seria inventar prontidão.
            </p>
          )}

          <Disclosure label="Ver detalhes técnicos">
            <TechRow label="measured" value={String(card.measured)} />
            <TechRow
              label="measuredCoverage"
              value={`${Math.round(card.measuredCoverage * 100)}% (limiar: 60%)`}
            />
            <TechRow label="requisitos aplicáveis" value={card.applicableCount} />
            <TechRow
              label="cálculo provisório"
              value={`${card.provisionalPercent}% — NÃO é prontidão`}
            />
            <TechRow label="teto por bloqueio" value={String(card.cappedByLaunchBlockers)} />
            {card.openLaunchBlockers.length > 0 && (
              <TechRow
                label="bloqueadores abertos"
                value={card.openLaunchBlockers.join(", ")}
              />
            )}
          </Disclosure>
        </div>
      ))}
    </div>
  );
}
