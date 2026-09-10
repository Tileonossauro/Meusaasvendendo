/**
 * Quality gate do nosso ativo principal.
 * Roda no `npm run gates` e na CI. Framework invalido = build vermelho.
 */
import { loadFramework } from "../src/framework/index.js";
import { buildGraph } from "../src/graph/graph.js";

try {
  const framework = loadFramework();
  buildGraph(framework); // valida referencias e ausencia de ciclos

  const ids = framework.requirements.map((r) => r.id);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicates.length > 0) {
    throw new Error(`Ids duplicados no framework: ${[...new Set(duplicates)].join(", ")}`);
  }

  const declared = new Set(framework.categories.map((c) => c.id));
  const orphanCategories = [...new Set(framework.requirements.map((r) => r.category))].filter(
    (c) => !declared.has(c),
  );
  if (orphanCategories.length > 0) {
    throw new Error(`Requisitos em categorias nao declaradas: ${orphanCategories.join(", ")}`);
  }

  console.log(
    `Framework v${framework.frameworkVersion} valido: ` +
      `${framework.requirements.length} requisitos em ${framework.categories.length} categorias.`,
  );
} catch (error) {
  console.error("Framework INVALIDO:", error instanceof Error ? error.message : error);
  process.exit(1);
}
