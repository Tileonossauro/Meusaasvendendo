import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseProjectHistory } from "../src/history/schema.js";
import {
  appendHistoryEvent,
  auditHistoryIntegrity,
  createHistoryEvent,
  nextEventId,
  FUTURE_TOLERANCE_MS,
} from "../src/history/create-event.js";
import { fixedClock, systemClock } from "../src/history/clock.js";

const real = parseProjectHistory(
  JSON.parse(readFileSync("data/projects/readiness-os/history.json", "utf8")),
);

const draft = {
  type: "requirement_completed" as const,
  title: "Evento de teste",
  frameworkVersion: "0.2.0",
};

describe("timestamps vem do relogio, nunca da mao do agente", () => {
  it("createHistoryEvent carimba a hora do relogio injetado", () => {
    const clock = fixedClock("2026-03-01T10:00:00.000Z");
    const event = createHistoryEvent(parseProjectHistory({ projectId: "t", events: [] }), draft, clock);
    expect(event.at).toBe("2026-03-01T10:00:00.000Z");
    expect(event.atSource).toBe("runtime_clock");
  });

  it("o draft nao consegue definir timestamp: o tipo nao expoe o campo", () => {
    const clock = fixedClock("2026-03-01T10:00:00.000Z");
    // Mesmo passando `at`, o servico sobrescreve com o relogio.
    const event = createHistoryEvent(
      parseProjectHistory({ projectId: "t", events: [] }),
      { ...draft, at: "2030-01-01T00:00:00.000Z" } as unknown as typeof draft,
      clock,
    );
    expect(event.at).toBe("2026-03-01T10:00:00.000Z");
  });

  it("e deterministico com relogio fixo", () => {
    const clock = fixedClock("2026-03-01T10:00:00.000Z");
    const a = createHistoryEvent(parseProjectHistory({ projectId: "t", events: [] }), draft, clock);
    const b = createHistoryEvent(parseProjectHistory({ projectId: "t", events: [] }), draft, clock);
    expect(a).toEqual(b);
  });
});

describe("guardas de integridade", () => {
  it("recusa evento no futuro alem da tolerancia", () => {
    const history = {
      projectId: "t",
      events: [
        {
          id: "evt-0001",
          type: "score_changed" as const,
          at: new Date(Date.now() + FUTURE_TOLERANCE_MS * 10).toISOString(),
          atSource: "runtime_clock" as const,
          title: "Evento do futuro",
          frameworkVersion: "0.2.0",
        },
      ],
    };
    const issues = auditHistoryIntegrity(history, systemClock);
    expect(issues.some((i) => i.problem === "future_timestamp")).toBe(true);
  });

  it("detecta id duplicado", () => {
    const event = {
      id: "evt-0001",
      type: "score_changed" as const,
      at: "2026-01-01T00:00:00.000Z",
      atSource: "runtime_clock" as const,
      title: "Duplicado",
      frameworkVersion: "0.2.0",
    };
    const issues = auditHistoryIntegrity({ projectId: "t", events: [event, { ...event }] });
    expect(issues.some((i) => i.problem === "duplicate_id")).toBe(true);
  });

  it("detecta ordem cronologica invertida", () => {
    const issues = auditHistoryIntegrity({
      projectId: "t",
      events: [
        { id: "evt-0001", type: "score_changed", at: "2026-02-01T00:00:00.000Z", atSource: "runtime_clock", title: "Depois", frameworkVersion: "0.2.0" },
        { id: "evt-0002", type: "score_changed", at: "2026-01-01T00:00:00.000Z", atSource: "runtime_clock", title: "Antes", frameworkVersion: "0.2.0" },
      ],
    });
    expect(issues.some((i) => i.problem === "out_of_order")).toBe(true);
  });

  it("o id nunca colide, mesmo com buracos na numeracao", () => {
    const clock = fixedClock("2026-03-01T10:00:00.000Z");
    const history = parseProjectHistory({
      projectId: "t",
      events: [
        { id: "evt-0001", type: "score_changed", at: "2026-01-01T00:00:00.000Z", atSource: "runtime_clock", title: "Primeiro evento", frameworkVersion: "0.2.0" },
        { id: "evt-0009", type: "score_changed", at: "2026-01-02T00:00:00.000Z", atSource: "runtime_clock", title: "Nono evento", frameworkVersion: "0.2.0" },
      ],
    });
    // Derivado do MAIOR id, nao do tamanho da lista: evt-0003 colidiria.
    expect(nextEventId(history)).toBe("evt-0010");
    const event = createHistoryEvent(history, draft, clock);
    expect(history.events.some((e) => e.id === event.id)).toBe(false);
  });

  it("appendHistoryEvent acrescenta sem quebrar a integridade", () => {
    const clock = fixedClock("2026-03-01T10:00:00.000Z");
    const history = parseProjectHistory({ projectId: "t", events: [] });
    appendHistoryEvent(history, draft, clock);
    appendHistoryEvent(history, { ...draft, title: "Segundo evento" }, clock);
    expect(history.events.map((e) => e.id)).toEqual(["evt-0001", "evt-0002"]);
    expect(auditHistoryIntegrity(history, clock)).toEqual([]);
  });
});

describe("o historico real do projeto e integro", () => {
  it("nao tem id duplicado, timestamp invalido, evento futuro nem ordem quebrada", () => {
    expect(auditHistoryIntegrity(real)).toEqual([]);
  });

  it("todo evento declara a origem do seu timestamp", () => {
    for (const event of real.events) {
      expect(["runtime_clock", "commit_reconstructed"]).toContain(event.atSource);
    }
  });

  it("os eventos corrigidos estao marcados como reconstruidos, nao como reais", () => {
    // Correcao de 2026-09-10: timestamps escritos a mao por agentes, alguns no
    // futuro, recuperados da data do commit que os introduziu. Ver ADR 0008.
    const reconstructed = real.events.filter((e) => e.atSource === "commit_reconstructed");
    expect(reconstructed.length).toBeGreaterThan(0);
  });
});
