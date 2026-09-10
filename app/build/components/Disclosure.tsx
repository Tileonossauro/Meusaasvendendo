/**
 * Progressive disclosure.
 *
 * "Simple first, technical on demand": o resumo em linguagem de leigo fica
 * sempre visivel; o detalhe tecnico so aparece se a pessoa pedir.
 * Usa <details> nativo — sem JavaScript de cliente para uma coisa que o
 * navegador ja faz.
 */
export function Disclosure({
  label = "Ver detalhes técnicos",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group mt-3">
      <summary className="cursor-pointer list-none text-xs text-slate-500 transition-colors hover:text-slate-300">
        <span className="inline-block transition-transform group-open:rotate-90">›</span>{" "}
        {label}
      </summary>
      <div className="mt-3 space-y-2 rounded-lg border border-ink-line bg-black/30 p-3 text-xs leading-relaxed text-slate-400">
        {children}
      </div>
    </details>
  );
}

export function TechRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 text-slate-500">{label}:</span>
      <span className="min-w-0 break-words font-mono text-slate-300">{value}</span>
    </div>
  );
}
