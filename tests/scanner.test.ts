import { describe, expect, it } from "vitest";
import { scanRepository } from "../src/collectors/repo-scanner.js";
import { proposalChangesState } from "../src/collectors/types.js";
import { loadFramework } from "../src/framework/index.js";
import { isIndependentlyVerified } from "../src/framework/schema.js";

const framework = loadFramework();
// runCommands desligado: rodar `npm test` de dentro do proprio teste recursaria.
const proposals = scanRepository({ runCommands: false });
const byId = new Map(proposals.map((p) => [p.requirementId, p]));

describe("scanner: contrato de saida", () => {
  it("so propoe requisitos que existem no framework", () => {
    const known = new Set(framework.requirements.map((r) => r.id));
    for (const p of proposals) {
      expect(known.has(p.requirementId), `requisito desconhecido: ${p.requirementId}`).toBe(true);
    }
  });

  it("toda proposta carrega evidencia com localizador", () => {
    for (const p of proposals) {
      expect(p.evidence.length, `${p.requirementId} sem evidencia`).toBeGreaterThan(0);
      for (const e of p.evidence) {
        expect(e.locator, `${p.requirementId} com evidencia sem localizador`).toBeTruthy();
      }
    }
  });

  it("toda proposta tem motivo tecnico E explicacao de leigo, distintos", () => {
    for (const p of proposals) {
      expect(p.reason.length).toBeGreaterThan(10);
      expect(p.simpleReason.length).toBeGreaterThan(10);
      expect(p.simpleReason).not.toBe(p.reason);
    }
  });

  it("toda proveniencia do scanner e independente ou explicitamente incerta", () => {
    for (const p of proposals) {
      if (p.status === "uncertain") continue;
      expect(
        isIndependentlyVerified(p.provenance),
        `${p.requirementId} usa proveniencia nao independente: ${p.provenance}`,
      ).toBe(true);
    }
  });

  it("nunca usa LLM", () => {
    for (const p of proposals) {
      expect(p.collectionMethod).toBe("deterministic");
      expect(p.provenance).not.toBe("llm_inference");
    }
  });

  it("e deterministico: mesma entrada, mesma saida", () => {
    const a = scanRepository({ runCommands: false });
    const b = scanRepository({ runCommands: false });
    expect(a).toEqual(b);
  });

  it("e idempotente: aplicar duas vezes nao muda nada na segunda", () => {
    const applied = proposals.map((p) => ({
      requirementId: p.requirementId,
      status: p.status,
      confidence: p.confidence,
      evidence: p.evidence,
      provenance: p.provenance,
      collectionMethod: p.collectionMethod,
      updatedAt: "x",
    }));
    const stateById = new Map(applied.map((s) => [s.requirementId, s]));
    for (const p of proposals) {
      expect(proposalChangesState(p, stateById.get(p.requirementId))).toBe(false);
    }
  });

  it("confianca sempre entre 0 e 1", () => {
    for (const p of proposals) {
      expect(p.confidence).toBeGreaterThan(0);
      expect(p.confidence).toBeLessThanOrEqual(1);
    }
  });
});

describe("scanner: dependencia presente != funcionalidade pronta", () => {
  it("nao marca comando como aprovado sem te-lo executado", () => {
    // Com runCommands desligado, os gates viram `uncertain` — nunca `completed`.
    for (const id of ["foundation.typecheck-gate", "foundation.test-gate", "ai.quality-gates-runnable"]) {
      const p = byId.get(id)!;
      expect(p.status, `${id} foi dado como pronto sem execucao`).toBe("uncertain");
      expect(p.confidence).toBeLessThan(0.7); // abaixo da porta de confianca
    }
  });

  it(".env ignorado nao basta: sem .env.example fica parcial", () => {
    const p = byId.get("foundation.env-example")!;
    expect(p.status).toBe("partial");
    expect(p.reason).toContain(".env.example");
  });

  it("schema existir nao prova que cobre o fluxo principal", () => {
    const p = byId.get("data.schema-defined")!;
    expect(p.status).toBe("partial");
    expect(p.status).not.toBe("completed");
  });

  it("varredura de segredos sem historico do git nunca vira completed", () => {
    const p = byId.get("security.no-secrets-in-repo")!;
    expect(p.status).toBe("partial");
    expect(p.reason.toUpperCase()).toContain("HISTORICO");
  });

  it("workflow de CI existir nao prova que bloqueia o merge", () => {
    const p = byId.get("deploy.ci-pipeline")!;
    expect(p.status).toBe("partial");
    expect(p.reason).toContain("branch protection");
  });

  it("nao se pronuncia sobre requisito operacional, que exige o sistema no ar", () => {
    const operacionais = framework.requirements.filter((r) => r.kind === "operational");
    for (const requirement of operacionais) {
      const p = byId.get(requirement.id);
      // Se um dia se pronunciar, jamais podera ser `completed` por leitura estatica.
      if (p) expect(p.status).not.toBe("completed");
    }
  });

  it("nunca marca completed um requisito de implementacao sem executar comando", () => {
    for (const p of proposals) {
      if (p.status !== "completed") continue;
      const requirement = framework.requirements.find((r) => r.id === p.requirementId)!;
      if (requirement.kind !== "implementation") continue;
      expect(
        p.provenance,
        `${p.requirementId} dado como pronto so por leitura estatica`,
      ).toBe("command_execution");
    }
  });
});

describe("scanner: ausencia confirmada tambem e evidencia", () => {
  it("registra ausencia da fronteira de confianca como missing verificado", () => {
    const p = byId.get("security.untrusted-content-boundary")!;
    expect(p.status).toBe("missing");
    expect(p.reason).toContain("Ausencia confirmada");
    expect(p.evidence[0]!.locator).toContain("tests/");
  });
});

describe("REGRESSAO DE SEGURANCA: comandos de terceiro nunca rodam no host", () => {
  it("recusa executar comandos quando o repositorio nao e confiavel", async () => {
    const { UntrustedExecutionError } = await import("../src/collectors/repo-scanner.js");
    expect(() => scanRepository({ runCommands: true, trust: "external" })).toThrow(
      UntrustedExecutionError,
    );
  });

  it("a mensagem aponta a regra arquitetural, para o proximo agente entender", () => {
    expect(() => scanRepository({ runCommands: true, trust: "external" })).toThrow(/ADR 0007/);
  });

  it("leitura estatica de repositorio externo continua permitida", () => {
    expect(() => scanRepository({ runCommands: false, trust: "external" })).not.toThrow();
  });

  it("o padrao e trust self, para nao quebrar o dogfooding", () => {
    expect(() => scanRepository({ runCommands: false })).not.toThrow();
  });
});

describe("REGRESSAO: os sete casos de falso positivo", () => {
  it("existencia de pacote != funcionalidade", () => {
    // Nenhuma proposta se apoia apenas em dependencia declarada.
    for (const p of proposals) {
      expect(p.reason).not.toMatch(/dependencia .*(instalada|presente).*(portanto|logo)/i);
    }
  });

  it("existencia de arquivo != funcionamento", () => {
    const gates = ["foundation.typecheck-gate", "foundation.test-gate", "ai.quality-gates-runnable"];
    for (const id of gates) {
      const p = byId.get(id)!;
      if (p.status === "completed") expect(p.provenance).toBe("command_execution");
    }
  });

  it("teste generico passando != fluxo critico coberto", () => {
    // O scanner nao se pronuncia sobre core.primary-flow-tested so porque os
    // testes passam. Ele nao sabe o que os testes cobrem.
    expect(byId.get("core.primary-flow-tested")).toBeUndefined();
  });

  it("ADR != implementacao", () => {
    for (const p of proposals) {
      expect(p.provenance).not.toBe("decision_record");
    }
  });

  it("analise estatica != runtime", () => {
    const p = byId.get("deploy.production-deploy-works");
    expect(p).toBeUndefined(); // exige runtime; o scanner se cala
  });

  it("ausencia de segredo nos arquivos != ausencia no historico", () => {
    const p = byId.get("security.no-secrets-in-repo")!;
    expect(p.status).toBe("partial");
  });

  it("CI existente != branch realmente protegida", () => {
    const p = byId.get("deploy.ci-pipeline")!;
    expect(p.status).toBe("partial");
  });
});
