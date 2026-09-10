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
      expect(["declared", "verified", "mixed"]).toContain(block.evidenceSource);
      expect(block.verifiedCount + block.declaredCount).toBe(block.total);
    }
  });

  it("categoria sem nenhuma verificacao automatica e marcada como declarada", () => {
    for (const block of vm.categories) {
      if (block.verifiedCount === 0) {
        expect(block.evidenceSource).toBe("declared");
      }
    }
  });

  it("categoria que ganhou verificacao deterministica deixa de ser so declarada", () => {
    // Dados e Deploy receberam estado vindo de ADR (verificacao deterministica).
    const dados = vm.categories.find((c) => c.category.id === "data")!;
    expect(dados.verifiedCount).toBeGreaterThan(0);
    expect(dados.evidenceSource).not.toBe("declared");
  });

  it("a barra da categoria nunca e apresentada como Readiness Score", () => {
    // Enquanto houver estado declarado, nenhuma dimensao pode estar medida.
    const algumDeclarado = vm.categories.some((c) => c.declaredCount > 0);
    if (algumDeclarado) {
      expect(vm.readiness.every((r) => r.percent === null)).toBe(true);
    }
  });
});

describe("o texto do cartao acompanha a cobertura real", () => {
  it("nao afirma 'nenhum verificado' quando ja existe verificacao automatica", () => {
    // Guarda contra copy que envelhece: hoje a cobertura ja e maior que zero.
    for (const card of vm.readiness) {
      if (card.measuredCoverage > 0) {
        expect(card.measured).toBe(false); // ainda abaixo do limiar
        expect(card.percent).toBeNull();
      }
    }
    expect(vm.readiness.every((c) => c.measuredCoverage > 0)).toBe(true);
  });
})
