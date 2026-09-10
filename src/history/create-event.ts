import { historyEventSchema, type HistoryEvent, type ProjectHistory } from "./schema.js";
import { systemClock, type Clock } from "./clock.js";

/**
 * SERVICO UNICO DE CRIACAO DE EVENTOS.
 *
 * Nenhum outro lugar do sistema monta um HistoryEvent a mao. Isto existe para
 * que o timestamp venha SEMPRE do relogio, nunca da cabeca de um agente, e para
 * que id e ordem cronologica sejam garantidos num lugar so.
 */

/** Tolerancia para desvio de relogio. Alem disso, o evento e recusado. */
export const FUTURE_TOLERANCE_MS = 60_000;

export class HistoryIntegrityError extends Error {}

/** Tudo do evento MENOS o que o servico controla: id e timestamp. */
export type HistoryEventDraft = Omit<HistoryEvent, "id" | "at" | "atSource">;

/** Proximo id livre, derivado do MAIOR id existente — nunca do tamanho da lista. */
export function nextEventId(history: ProjectHistory): string {
  const max = history.events.reduce((acc, event) => {
    const n = Number.parseInt(event.id.replace(/\D/g, ""), 10);
    return Number.isNaN(n) ? acc : Math.max(acc, n);
  }, 0);
  return `evt-${String(max + 1).padStart(4, "0")}`;
}

/**
 * Cria um evento com timestamp do relogio e id garantidamente livre.
 * Nao escreve nada: quem persiste e o chamador.
 */
export function createHistoryEvent(
  history: ProjectHistory,
  draft: HistoryEventDraft,
  clock: Clock = systemClock,
): HistoryEvent {
  const event = historyEventSchema.parse({
    ...draft,
    id: nextEventId(history),
    at: clock.now().toISOString(),
    atSource: "runtime_clock",
  });

  assertEventIsValid(event, history, clock);
  return event;
}

/** Anexa o evento e devolve o historico — mantendo as garantias de integridade. */
export function appendHistoryEvent(
  history: ProjectHistory,
  draft: HistoryEventDraft,
  clock: Clock = systemClock,
): { history: ProjectHistory; event: HistoryEvent } {
  const event = createHistoryEvent(history, draft, clock);
  history.events.push(event);
  return { history, event };
}

function assertEventIsValid(event: HistoryEvent, history: ProjectHistory, clock: Clock): void {
  // Defensiva: nextEventId deriva do maior id existente, entao esta colisao nao
  // acontece pelo caminho normal. Fica como rede para chamadores diretos.
  if (history.events.some((existing) => existing.id === event.id)) {
    throw new HistoryIntegrityError(`Id de evento duplicado: ${event.id}`);
  }

  const at = new Date(event.at).getTime();
  if (Number.isNaN(at)) {
    throw new HistoryIntegrityError(`Timestamp invalido no evento ${event.id}: ${event.at}`);
  }
  if (at > clock.now().getTime() + FUTURE_TOLERANCE_MS) {
    throw new HistoryIntegrityError(
      `Evento ${event.id} tem timestamp no futuro (${event.at}). Timestamps vem do relogio, nao da mao.`,
    );
  }
}

export interface HistoryIntegrityIssue {
  eventId: string;
  problem: "duplicate_id" | "invalid_timestamp" | "future_timestamp" | "out_of_order";
  detail: string;
}

/**
 * Audita um historico inteiro. Usado pelos quality gates e pelos testes:
 * ids unicos, timestamps validos, nenhum no futuro, ordem cronologica coerente.
 */
export function auditHistoryIntegrity(
  history: ProjectHistory,
  clock: Clock = systemClock,
): HistoryIntegrityIssue[] {
  const issues: HistoryIntegrityIssue[] = [];
  const seen = new Set<string>();
  const limit = clock.now().getTime() + FUTURE_TOLERANCE_MS;
  let previous = Number.NEGATIVE_INFINITY;

  for (const event of history.events) {
    if (seen.has(event.id)) {
      issues.push({ eventId: event.id, problem: "duplicate_id", detail: `Id repetido: ${event.id}` });
    }
    seen.add(event.id);

    const at = new Date(event.at).getTime();
    if (Number.isNaN(at)) {
      issues.push({ eventId: event.id, problem: "invalid_timestamp", detail: event.at });
      continue;
    }
    if (at > limit) {
      issues.push({
        eventId: event.id,
        problem: "future_timestamp",
        detail: `${event.at} esta no futuro.`,
      });
    }
    // A lista e cronologica por construcao: um evento novo nunca antecede o anterior.
    if (at < previous) {
      issues.push({
        eventId: event.id,
        problem: "out_of_order",
        detail: `${event.at} antecede o evento anterior.`,
      });
    }
    previous = at;
  }

  return issues;
}
