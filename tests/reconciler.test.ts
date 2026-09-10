import { describe, expect, it } from "vitest";
import { loadFramework } from "../src/framework/index.js";
import {
  loadAdrDocuments,
  parseFrontMatter,
  reconcileDecisions,
  ReconcilerError,
} from "../src/collectors/adr-reconciler.js";
import { proposalChangesState } from "../src/collectors/types.js";
import { parseProjectState } from "../src/state/index.js";
import { isIndependentlyVerified } from "../src/framework/schema.js";
import { readFileSync } from "node:fs";
import { computeNextBestAction } from "../src/navigator/next-best-action.js";

const framework = loadFramework();
const state = parseProjectState(
  JSON.parse(readFileSync("data/projects/readiness-os/state.json", "utf8")),
);

describe("reconciliador de decisoes: o mecanismo", () => {
  it("le o front-matter dos ADRs", () => {
    const parsed = parseFrontMatter(
      ['---', 'adr: "0004"', "status: aceito", "decides:", "  - data.persistence-chosen", "---", "", "# Titulo"].join("\n"),
      "teste.md",
    );
    expect(parsed?.frontMatter.adr).toBe("0004");
    expect(parsed?.frontMatter.decides).toEqual(["data.persistence-chosen"]);
  });

  it("ignora ADR que nao declara ligacao com requisito", () => {
    const documents = loadAdrDocuments();
    const semLigacao = documents.filter(
      (d) => d.frontMatter.decides.length === 0 && d.frontMatter.decidesPartially.length === 0,
    );
    expect(semLigacao.length).toBeGreaterThan(0); // ADRs internos nao viram requisito
  });

  it("nao aceita ADR que decide requisito inexistente", () => {
    expect(() =>
      reconcileDecisions(framework, [
        {
          file: "9999-fantasma.md",
          title: "ADR fantasma",
          decidesLine: 5,
          frontMatter: {
            adr: "9999",
            status: "aceito",
            decides: ["requisito.que.nao.existe"],
            decidesPartially: [],
          },
        },
      ]),
    ).toThrow(ReconcilerError);
  });

  it("so reconcilia ADR aceito — proposto ou rejeitado nao conta", () => {
    const proposals = reconcileDecisions(framework, [
      {
        file: "0099-rascunho.md",
        title: "Ainda em discussao",
        decidesLine: 5,
        frontMatter: {
          adr: "0099",
          status: "proposto",
          decides: ["data.persistence-chosen"],
          decidesPartially: [],
        },
      },
    ]);
    expect(proposals).toHaveLength(0);
  });

  it("produz evidencia com arquivo:linha e verificacao deterministica", () => {
    const proposals = reconcileDecisions(framework);
    const persistencia = proposals.find((p) => p.requirementId === "data.persistence-chosen");
    expect(persistencia).toBeDefined();
    expect(persistencia!.provenance).toBe("decision_record");
    expect(persistencia!.collectionMethod).toBe("deterministic");
    expect(persistencia!.evidence[0]!.locator).toMatch(/^docs\/adr\/.+\.md:\d+$/);
  });

  it("distingue decisao completa de decisao parcial", () => {
    const proposals = reconcileDecisions(framework);
    const completa = proposals.find((p) => p.requirementId === "data.persistence-chosen");
    const parcial = proposals.find((p) => p.requirementId === "deploy.hosting-decided");
    expect(completa!.status).toBe("completed");
    expect(parcial!.status).toBe("partial");
    // Decisao parcial merece menos confianca que decisao completa.
    expect(parcial!.confidence).toBeLessThan(completa!.confidence);
  });

  it("e deterministico e idempotente", () => {
    expect(reconcileDecisions(framework)).toEqual(reconcileDecisions(framework));

    const stateById = new Map(state.states.map((s) => [s.requirementId, s]));
    const pendentes = reconcileDecisions(framework).filter((p) =>
      proposalChangesState(p, stateById.get(p.requirementId)),
    );
    // Depois de aplicado, rodar de novo nao muda mais nada.
    expect(pendentes).toHaveLength(0);
  });
});

describe("guarda P0: decisao registrada nunca aparece como pendente", () => {
  const proposals = reconcileDecisions(framework);

  it("todo requisito decidido por ADR aceito tem estado compativel", () => {
    const stateById = new Map(state.states.map((s) => [s.requirementId, s]));

    for (const proposal of proposals) {
      const current = stateById.get(proposal.requirementId);
      expect(current, `sem estado para ${proposal.requirementId}`).toBeDefined();
      expect(
        current!.status,
        `${proposal.requirementId} tem decisao formal em ADR mas continua "${current!.status}"`,
      ).not.toBe("missing");
      expect(current!.evidence.length).toBeGreaterThan(0);
    }
  });

  it("o Navigator nunca pede uma decisao ja tomada", () => {
    const { candidates } = computeNextBestAction(framework, state);
    const decididos = new Set(
      proposals.filter((p) => p.status === "completed").map((p) => p.requirementId),
    );

    for (const candidate of candidates) {
      expect(
        decididos.has(candidate.requirement.id),
        `Navigator recomenda "${candidate.requirement.id}", que ja foi decidido em ADR`,
      ).toBe(false);
    }
  });

  it("estado vindo de ADR conta como verificacao automatica, nao manual", () => {
    const stateById = new Map(state.states.map((s) => [s.requirementId, s]));
    for (const proposal of proposals) {
      expect(stateById.get(proposal.requirementId)!.provenance).toBe("decision_record");
    }
  });
});

describe("guarda estrutural: ADR nao satisfaz requisito de implementacao", () => {
  it("recusa ADR que declara decidir um requisito de implementacao", () => {
    // O caso extremo que precisamos impedir: um ADR afirmando que o rate
    // limiting esta pronto jamais pode valer o que um scanner detecta.
    const rateLimiting = framework.requirements.find((r) => r.id === "security.rate-limiting")!;
    expect(rateLimiting.kind).toBe("implementation");

    expect(() =>
      reconcileDecisions(framework, [
        {
          file: "0099-rate-limiting.md",
          title: "ADR que se declara pronto",
          decidesLine: 5,
          frontMatter: {
            adr: "0099",
            status: "aceito",
            decides: ["security.rate-limiting"],
            decidesPartially: [],
          },
        },
      ]),
    ).toThrow(/tipo "implementation"/);
  });

  it("recusa ADR sobre requisito operacional", () => {
    expect(() =>
      reconcileDecisions(framework, [
        {
          file: "0098-deploy.md",
          title: "ADR operacional",
          decidesLine: 5,
          frontMatter: {
            adr: "0098",
            status: "aceito",
            decides: ["deploy.production-deploy-works"],
            decidesPartially: [],
          },
        },
      ]),
    ).toThrow(/tipo "operational"/);
  });

  it("aceita ADR sobre requisito cuja DoD e uma decisao documentada", () => {
    const persistencia = framework.requirements.find((r) => r.id === "data.persistence-chosen")!;
    expect(persistencia.kind).toBe("decision");
    expect(() => reconcileDecisions(framework)).not.toThrow();
  });

  it("todo requisito ligado a um ADR real e do tipo decision", () => {
    for (const doc of loadAdrDocuments()) {
      for (const id of [...doc.frontMatter.decides, ...doc.frontMatter.decidesPartially]) {
        const requirement = framework.requirements.find((r) => r.id === id)!;
        expect(requirement.kind, `${doc.file} liga "${id}", que e ${requirement.kind}`).toBe(
          "decision",
        );
      }
    }
  });

  it("proposta de ADR nunca tem proveniencia independente", () => {
    for (const proposal of reconcileDecisions(framework)) {
      expect(proposal.provenance).toBe("decision_record");
      expect(isIndependentlyVerified(proposal.provenance)).toBe(false);
    }
  });
});
