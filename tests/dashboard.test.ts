import { describe, expect, it } from "vitest";
import { buildDashboardViewModel } from "../src/dashboard/view-model.js";
import { loadFramework } from "../src/framework/index.js";

const vm = buildDashboardViewModel("readiness-os");

describe("dashboard: honestidade dos numeros", () => {
  it("NUNCA expoe percentual de readiness enquanto a dimensao nao for medida", () => {
    for (const card of vm.readiness) {
      if (!card.measured) {
        expect(card.percent).toBeNull();
      }
    }
  });

  it("hoje as tres dimensoes estao em bootstrap, sem medicao por evidencia", () => {
    expect(vm.readiness).toHaveLength(3);
    for (const card of vm.readiness) {
      expect(card.measured).toBe(false);
      expect(card.percent).toBeNull();
    }
  });

  it("separa Build Progress dos tres Readiness Scores", () => {
    // Build Progress TEM percentual: mede o plano de construcao, nao o produto.
    expect(vm.buildProgress.label).toBe("Build Progress");
    expect(typeof vm.buildProgress.percent).toBe("number");
    expect(vm.buildProgress.meaning).toContain("não a prontidão do produto");

    const readinessLabels = vm.readiness.map((r) => r.label);
    expect(readinessLabels).toEqual([
      "MVP Readiness",
      "Production Readiness",
      "AI Build Readiness",
    ]);
    expect(readinessLabels).not.toContain("Build Progress");
  });

  it("expoe o calculo provisorio apenas como detalhe, nunca como prontidao", () => {
    for (const card of vm.readiness) {
      expect(typeof card.provisionalPercent).toBe("number");
      expect(card.percent).not.toBe(card.provisionalPercent);
    }
  });
});

describe("dashboard: conteudo exigido pelo criterio de conclusao", () => {
  it("responde as perguntas que Leonardo precisa responder sem ler codigo", () => {
    expect(vm.buildProgress.percent).toBeGreaterThan(0); // quanto da construcao
    expect(vm.nowBuilding).not.toBeNull(); // o que estamos fazendo agora
    expect(vm.recentlyCompleted.length).toBeGreaterThan(0); // o que ja foi concluido
    expect(vm.dependsOnFounder.length).toBeGreaterThan(0); // o que depende do fundador
    expect(vm.aiCanDo.length).toBeGreaterThan(0); // o que a IA pode executar
    expect(vm.blockers.length).toBeGreaterThan(0); // bloqueadores
    expect(vm.nextBestAction).not.toBeNull(); // proximo passo
    expect(vm.nextBestAction!.reason.length).toBeGreaterThan(0); // por que
    expect(vm.categories).toHaveLength(12); // areas do projeto
  });

  it("a secao AGORA sempre tem o que dizer, mesmo sem marco em andamento", () => {
    expect(vm.nowBuilding).not.toBeNull();
    expect(["in_progress", "awaiting_review"]).toContain(vm.nowBuilding!.state);
    expect(vm.nowBuilding!.milestone.outcome.length).toBeGreaterThan(0);
  });

  it("toda analise registra a versao do framework que a produziu", () => {
    const framework = loadFramework();
    expect(vm.frameworkVersion).toBe(framework.frameworkVersion);
    for (const event of vm.recentlyCompleted) {
      expect(event.frameworkVersion).toBeTruthy();
    }
  });

  it("separa 'depende de voce' de 'IA pode fazer' sem sobreposicao", () => {
    const founderIds = new Set(vm.dependsOnFounder.map((c) => c.requirement.id));
    for (const item of vm.aiCanDo) {
      expect(founderIds.has(item.requirement.id)).toBe(false);
    }
  });

  it("mostra bloqueadores que impedem lancamento antes dos demais", () => {
    const flags = vm.blockers.map((b) => b.launchBlocking);
    const firstFalse = flags.indexOf(false);
    if (firstFalse !== -1) {
      expect(flags.slice(firstFalse).every((f) => !f)).toBe(true);
    }
  });

  it("e multi-projeto: a montagem recebe o projeto como parametro", () => {
    expect(vm.projectId).toBe("readiness-os");
    expect(() => buildDashboardViewModel("projeto-que-nao-existe")).toThrow();
  });
});

describe("mapa das areas: barra declarada nao pode passar por auditoria", () => {
  it("toda categoria declara a origem do seu preenchimento", () => {
    for (const block of vm.categories) {
      expect(["declared", "decision_record", "mixed", "verified"]).toContain(
        block.evidenceSource,
      );
      expect(block.verifiedCount + block.decisionRecordCount + block.declaredCount).toBe(
        block.total,
      );
    }
  });

  it("categoria sem verificacao independente nunca e rotulada como verificada", () => {
    for (const block of vm.categories) {
      if (block.verifiedCount === 0) {
        expect(block.evidenceSource).not.toBe("verified");
        expect(block.evidenceSource).not.toBe("mixed");
      }
    }
  });

  it("categoria com estado vindo de ADR e rotulada como decisao registrada, nao verificada", () => {
    // Dados recebeu estado do ADR 0004. Isso NAO e verificacao independente.
    const dados = vm.categories.find((c) => c.category.id === "data")!;
    expect(dados.decisionRecordCount).toBeGreaterThan(0);
    expect(dados.verifiedCount).toBe(0);
    expect(dados.evidenceSource).toBe("decision_record");
  });

  it("a barra da categoria nunca e apresentada como Readiness Score", () => {
    // Enquanto houver estado declarado, nenhuma dimensao pode estar medida.
    const algumDeclarado = vm.categories.some((c) => c.declaredCount > 0);
    if (algumDeclarado) {
      expect(vm.readiness.every((r) => r.percent === null)).toBe(true);
    }
  });
});

describe("cobertura por evidencia nao e cobertura por scanner independente", () => {
  it("as duas coberturas sao expostas separadamente", () => {
    for (const card of vm.readiness) {
      expect(typeof card.evidenceCoverage).toBe("number");
      expect(typeof card.independentCoverage).toBe("number");
      // Independente e sempre subconjunto de "tem alguma evidencia".
      expect(card.independentCoverage).toBeLessThanOrEqual(card.evidenceCoverage);
    }
  });

  it("estado vindo de ADR conta como evidencia, mas NAO como scanner independente", () => {
    // Hoje so existe reconciliacao de ADR: alguma evidencia, zero scanner.
    expect(vm.readiness.some((c) => c.evidenceCoverage > 0)).toBe(true);
  });

  it("so a cobertura independente pode liberar o score", () => {
    for (const card of vm.readiness) {
      if (card.independentCoverage < 0.6) {
        expect(card.measured).toBe(false);
        expect(card.percent).toBeNull();
      }
    }
  });

  it("requisito critico sem verificacao independente impede a dimensao de ser medida", () => {
    for (const card of vm.readiness) {
      if (card.criticalWithoutIndependentEvidence.length > 0) {
        expect(card.measured).toBe(false);
      }
    }
  });
})
