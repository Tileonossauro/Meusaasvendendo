import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { Evidence } from "../framework/schema.js";
import type { StateProposal } from "./types.js";

/**
 * SCANNER DETERMINISTICO LOCAL.
 *
 * Le o proprio repositorio e produz evidencia INDEPENDENTE — o sistema
 * observando o projeto por conta propria, em vez de acreditar em algo que
 * alguem declarou.
 *
 * REGRA PRINCIPAL: dependencia presente != funcionalidade pronta.
 * Nada e marcado como `completed` por existir um pacote, um arquivo ou um nome
 * parecido. Cada verificacao persegue a Definition of Done do requisito; o que
 * nao for provavel estaticamente vira `partial` com o motivo explicito, ou
 * `uncertain` — nunca um "pronto" otimista.
 *
 * Sem LLM: apenas leitura de arquivos e execucao de comandos.
 *
 * ---------------------------------------------------------------------------
 * FRONTEIRA DE SEGURANCA — LEIA ANTES DE REUSAR ESTE MODULO
 * ---------------------------------------------------------------------------
 * Este scanner EXECUTA comandos do projeto analisado (`npm run ...`) no HOST.
 * Isso e seguro hoje por um unico motivo: o unico projeto analisado e o proprio
 * Readiness OS, que e codigo confiavel e nosso.
 *
 * Um `package.json` de terceiro pode conter QUALQUER comando. Executa-lo aqui
 * daria a um repositorio desconhecido execucao arbitraria de codigo na nossa
 * maquina, com nossas variaveis de ambiente e nossa rede.
 *
 * REGRA ARQUITETURAL OBRIGATORIA (ADR 0007): repositorio de terceiro NUNCA tem
 * seus comandos executados no host. Antes do scanner externo existir, a
 * execucao precisa acontecer em ambiente isolado e descartavel, sem segredos
 * internos, com limite de recursos, timeout e politica de rede.
 *
 * O parametro `trust` abaixo existe para impedir que alguem reuse este executor
 * para um repositorio externo por engano.
 * ---------------------------------------------------------------------------
 */

/**
 * Nivel de confianca do repositorio analisado.
 * - `self`: o proprio Readiness OS. Unico caso em que comandos podem rodar no host.
 * - `external`: repositorio de terceiro. Execucao de comando PROIBIDA ate existir sandbox.
 */
export type RepoTrust = "self" | "external";

export class UntrustedExecutionError extends Error {}

export interface ScanOptions {
  root?: string;
  /**
   * Executar comandos de verdade (typecheck, testes, gates).
   * Desligado nos testes automatizados para nao haver recursao.
   */
  runCommands?: boolean;
  /** Padrao `self`. Ver a fronteira de seguranca acima. */
  trust?: RepoTrust;
}

interface Ctx {
  root: string;
  runCommands: boolean;
  trust: RepoTrust;
}

// ---------------------------------------------------------------- utilidades

function abs(ctx: Ctx, rel: string): string {
  return path.join(ctx.root, rel);
}

function fileExists(ctx: Ctx, rel: string): boolean {
  const full = abs(ctx, rel);
  return existsSync(full) && statSync(full).isFile();
}

function read(ctx: Ctx, rel: string): string | null {
  return fileExists(ctx, rel) ? readFileSync(abs(ctx, rel), "utf8") : null;
}

/** Localiza um trecho e devolve `arquivo:linha` — a evidencia precisa apontar. */
function findLine(content: string, needle: RegExp | string): number | null {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    const hit = typeof needle === "string" ? line.includes(needle) : needle.test(line);
    if (hit) return i + 1;
  }
  return null;
}

function fileEvidence(rel: string, line: number | null, note: string): Evidence {
  return {
    source: "file",
    provenance: "static_analysis",
    locator: line === null ? rel : `${rel}:${line}`,
    note,
  };
}

function commandEvidence(command: string, note: string): Evidence {
  return { source: "command", provenance: "command_execution", locator: command, note };
}

interface CommandResult {
  ok: boolean;
  skipped: boolean;
  detail: string;
}

function runNpmScript(ctx: Ctx, script: string): CommandResult {
  // Sem execucao nao ha risco: leitura estatica de repositorio externo continua
  // permitida, e o requisito vira `uncertain` por nao ter sido executado.
  if (!ctx.runCommands) {
    return { ok: false, skipped: true, detail: "execucao desligada nesta chamada" };
  }

  // Guarda de ultima instancia, no ponto exato onde o comando rodaria.
  // A checagem principal esta em scanRepository(); esta existe para que nenhum
  // caminho futuro chegue a execucao contornando a fronteira.
  if (ctx.trust !== "self") {
    throw new UntrustedExecutionError(
      "Execucao de comando bloqueada: repositorio nao confiavel. " +
        "Comandos de terceiros exigem sandbox descartavel (ADR 0007).",
    );
  }
  try {
    execFileSync("npm", ["run", script], {
      cwd: ctx.root,
      stdio: "pipe",
      timeout: 180_000,
      encoding: "utf8",
    });
    return { ok: true, skipped: false, detail: "exit code 0" };
  } catch (error) {
    const message = error instanceof Error ? error.message.split("\n")[0] ?? "" : String(error);
    return { ok: false, skipped: false, detail: message };
  }
}

function readPackageJson(ctx: Ctx): { raw: string; parsed: Record<string, unknown> } | null {
  const raw = read(ctx, "package.json");
  if (!raw) return null;
  try {
    return { raw, parsed: JSON.parse(raw) as Record<string, unknown> };
  } catch {
    return null;
  }
}

function scripts(ctx: Ctx): Record<string, string> {
  const pkg = readPackageJson(ctx);
  return (pkg?.parsed.scripts as Record<string, string> | undefined) ?? {};
}

/** Lista arquivos recursivamente, ignorando diretorios que nao sao codigo do projeto. */
function listFiles(ctx: Ctx, rel: string, depth = 6): string[] {
  const IGNORE = new Set(["node_modules", ".git", ".next", "dist", "coverage"]);
  const out: string[] = [];
  const walk = (current: string, level: number): void => {
    if (level < 0) return;
    const full = abs(ctx, current);
    if (!existsSync(full)) return;
    for (const entry of readdirSync(full, { withFileTypes: true })) {
      if (IGNORE.has(entry.name)) continue;
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) walk(child, level - 1);
      else out.push(child);
    }
  };
  walk(rel, depth);
  return out.sort();
}

/** Uma secao de markdown com conteudo real — nao basta o titulo existir. */
function sectionWithContent(content: string, heading: RegExp): { line: number; chars: number } | null {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    if (!heading.test(lines[i]!)) continue;
    let chars = 0;
    for (let j = i + 1; j < lines.length && !/^#{1,3}\s/.test(lines[j]!); j += 1) {
      chars += lines[j]!.trim().length;
    }
    return { line: i + 1, chars };
  }
  return null;
}

// ------------------------------------------------------------- verificacoes

type Check = (ctx: Ctx) => StateProposal | null;

/** Documento com secao preenchida — usado pelos requisitos de decisao/artefato. */
function docSectionCheck(args: {
  requirementId: string;
  file: string;
  heading: RegExp;
  minChars: number;
  simpleWhenFound: string;
  simpleWhenMissing: string;
  noteFound: string;
}): Check {
  return (ctx) => {
    const content = read(ctx, args.file);
    if (content === null) {
      return {
        requirementId: args.requirementId,
        status: "missing",
        confidence: 0.95,
        evidence: [fileEvidence(args.file, null, `Arquivo nao encontrado: ${args.file}`)],
        provenance: "static_analysis",
        collectionMethod: "deterministic",
        // Caminho fixo e conhecido: se nao esta la, nao existe. Conclusivo.
        detectionOutcome: "confirmed_absent",
        observationScope: `caminho fixo ${args.file}`,
        reason: `${args.file} nao existe no repositorio (caminho fixo inspecionado).`,
        simpleReason: args.simpleWhenMissing,
      };
    }

    const section = sectionWithContent(content, args.heading);
    if (!section || section.chars < args.minChars) {
      return {
        requirementId: args.requirementId,
        status: "partial",
        confidence: 0.85,
        evidence: [
          fileEvidence(
            args.file,
            section?.line ?? null,
            section
              ? `Secao encontrada, mas com apenas ${section.chars} caracteres de conteudo (minimo ${args.minChars}).`
              : "Secao esperada nao encontrada no documento.",
          ),
        ],
        provenance: "static_analysis",
        collectionMethod: "deterministic",
        detectionOutcome: "confirmed_present",
        reason: `${args.file}: secao ausente ou vazia demais para contar como conteudo real.`,
        simpleReason: args.simpleWhenMissing,
      };
    }

    return {
      requirementId: args.requirementId,
      status: "completed",
      confidence: 0.85,
      evidence: [fileEvidence(args.file, section.line, `${args.noteFound} (${section.chars} caracteres).`)],
      provenance: "static_analysis",
      collectionMethod: "deterministic",
      detectionOutcome: "confirmed_present",
      reason: `${args.file}:${section.line} contem a secao exigida com conteudo real.`,
      simpleReason: args.simpleWhenFound,
    };
  };
}

/** Script do package.json que precisa EXISTIR e PASSAR. Existir nao basta. */
function commandGateCheck(args: {
  requirementId: string;
  script: string;
  simplePass: string;
  simpleFail: string;
  simpleMissing: string;
}): Check {
  return (ctx) => {
    const declared = scripts(ctx)[args.script];
    if (!declared) {
      return {
        requirementId: args.requirementId,
        status: "missing",
        confidence: 0.95,
        evidence: [fileEvidence("package.json", null, `Script "${args.script}" nao declarado.`)],
        provenance: "static_analysis",
        collectionMethod: "deterministic",
        // package.json.scripts e o espaco COMPLETO dos scripts npm. Conclusivo.
        detectionOutcome: "confirmed_absent",
        observationScope: "package.json > scripts (espaco completo dos scripts npm)",
        reason: `package.json nao declara o script "${args.script}".`,
        simpleReason: args.simpleMissing,
      };
    }

    const pkg = readPackageJson(ctx)!;
    const line = findLine(pkg.raw, `"${args.script}"`);
    const result = runNpmScript(ctx, args.script);

    if (result.skipped) {
      // Script declarado mas nao executado: NAO afirmamos que passa.
      return {
        requirementId: args.requirementId,
        status: "uncertain",
        confidence: 0.5,
        evidence: [
          fileEvidence("package.json", line, `Script "${args.script}" declarado: ${declared}`),
        ],
        provenance: "static_analysis",
        collectionMethod: "deterministic",
        detectionOutcome: "not_detected",
        reason: `Script "${args.script}" existe, mas nao foi executado nesta varredura. Declarar nao prova que passa.`,
        simpleReason: "O comando existe, mas não foi executado agora para confirmar que funciona.",
      };
    }

    if (!result.ok) {
      return {
        requirementId: args.requirementId,
        status: "partial",
        confidence: 0.9,
        evidence: [
          fileEvidence("package.json", line, `Script "${args.script}" declarado: ${declared}`),
          commandEvidence(`npm run ${args.script}`, `Falhou: ${result.detail}`),
        ],
        provenance: "command_execution",
        collectionMethod: "deterministic",
        detectionOutcome: "confirmed_present",
        reason: `"npm run ${args.script}" existe mas falhou.`,
        simpleReason: args.simpleFail,
      };
    }

    return {
      requirementId: args.requirementId,
      status: "completed",
      confidence: 0.95,
      evidence: [
        fileEvidence("package.json", line, `Script "${args.script}" declarado: ${declared}`),
        commandEvidence(`npm run ${args.script}`, "Executado nesta varredura, exit code 0."),
      ],
      provenance: "command_execution",
      collectionMethod: "deterministic",
      detectionOutcome: "confirmed_present",
      reason: `"npm run ${args.script}" executou e retornou exit code 0.`,
      simpleReason: args.simplePass,
    };
  };
}

const CHECKS: Check[] = [
  // ---- Produto e escopo (decisoes documentadas) ----
  docSectionCheck({
    requirementId: "product.promise-defined",
    file: "docs/PRODUCT.md",
    heading: /^##\s+Promessa/i,
    minChars: 80,
    noteFound: "Secao de promessa preenchida",
    simpleWhenFound: "A promessa do produto está escrita no PRODUCT.md.",
    simpleWhenMissing: "Ainda não existe uma promessa escrita no PRODUCT.md.",
  }),
  docSectionCheck({
    requirementId: "product.target-user-defined",
    file: "docs/PRODUCT.md",
    heading: /^##\s+Para quem/i,
    minChars: 80,
    noteFound: "Secao de publico-alvo preenchida",
    simpleWhenFound: "O público-alvo está descrito no PRODUCT.md.",
    simpleWhenMissing: "Ainda não existe descrição de público-alvo no PRODUCT.md.",
  }),
  docSectionCheck({
    requirementId: "product.core-flow-defined",
    file: "docs/PRODUCT.md",
    heading: /^##\s+Fluxo principal/i,
    minChars: 120,
    noteFound: "Fluxo principal descrito passo a passo",
    simpleWhenFound: "O passo a passo do fluxo principal está escrito no PRODUCT.md.",
    simpleWhenMissing: "O fluxo principal ainda não está descrito passo a passo.",
  }),
  docSectionCheck({
    requirementId: "product.constitution",
    file: "docs/CONSTITUTION.md",
    heading: /^##\s+Fora de escopo/i,
    minChars: 60,
    noteFound: "Constitution com escopo e fora de escopo explicitos",
    simpleWhenFound: "A Constitution do projeto existe e diz o que está fora do escopo.",
    simpleWhenMissing: "A Constitution não declara explicitamente o que está fora do escopo.",
  }),

  // ---- Fundacao ----
  (ctx) => {
    // Estrutura: diretorios com responsabilidade unica E documentados no CLAUDE.md.
    const expected = ["src", "app", "docs", "tests", "scripts", "data"];
    const present = expected.filter((d) => existsSync(abs(ctx, d)));
    const claude = read(ctx, "CLAUDE.md");
    const documented = claude ? sectionWithContent(claude, /^##\s+Estrutura/i) : null;

    if (present.length < expected.length || !documented) {
      return {
        requirementId: "foundation.repo-structure",
        status: "partial",
        confidence: 0.85,
        evidence: [
          fileEvidence(".", null, `Diretorios de topo presentes: ${present.join(", ")}`),
          fileEvidence("CLAUDE.md", documented?.line ?? null, documented ? "Estrutura documentada." : "Secao Estrutura ausente no CLAUDE.md."),
        ],
        provenance: "static_analysis",
        collectionMethod: "deterministic",
        detectionOutcome: "confirmed_present",
        reason: `Faltam diretorios (${expected.filter((d) => !present.includes(d)).join(", ") || "nenhum"}) ou documentacao da estrutura.`,
        simpleReason: "A organização de pastas existe, mas ainda não está toda documentada.",
      };
    }

    return {
      requirementId: "foundation.repo-structure",
      status: "completed",
      confidence: 0.85,
      evidence: [
        fileEvidence(".", null, `Diretorios de topo com responsabilidade unica: ${present.join(", ")}`),
        fileEvidence("CLAUDE.md", documented.line, "Estrutura documentada no CLAUDE.md."),
      ],
      provenance: "static_analysis",
      collectionMethod: "deterministic",
      detectionOutcome: "confirmed_present",
      reason: "Diretorios de topo presentes e estrutura documentada no CLAUDE.md.",
      simpleReason: "As pastas do projeto estão organizadas e explicadas no manual do projeto.",
    };
  },

  commandGateCheck({
    requirementId: "foundation.typecheck-gate",
    script: "typecheck",
    simplePass: "O verificador de erros de código rodou agora e passou.",
    simpleFail: "O verificador de erros existe, mas está acusando problemas.",
    simpleMissing: "Não existe comando para verificar erros de código.",
  }),
  commandGateCheck({
    requirementId: "foundation.test-gate",
    script: "test",
    simplePass: "Os testes automáticos rodaram agora e passaram.",
    simpleFail: "Existem testes, mas algum está falhando.",
    simpleMissing: "Não existe comando de testes automáticos.",
  }),

  (ctx) => {
    // .env ignorado nao basta: a DoD exige .env.example listando as variaveis.
    const gitignore = read(ctx, ".gitignore");
    const envIgnored = gitignore ? findLine(gitignore, /^\.env$/m) ?? findLine(gitignore, ".env") : null;
    const hasExample = fileExists(ctx, ".env.example");

    if (!hasExample) {
      return {
        requirementId: "foundation.env-example",
        status: "partial",
        confidence: 0.95,
        evidence: [
          fileEvidence(".gitignore", envIgnored, envIgnored ? ".env esta ignorado pelo git." : ".env NAO esta ignorado."),
          fileEvidence(".env.example", null, "Arquivo .env.example nao existe."),
        ],
        provenance: "static_analysis",
        collectionMethod: "deterministic",
        // A ausencia do .env.example e conclusiva: caminho fixo.
        detectionOutcome: "confirmed_absent",
        observationScope: "caminho fixo .env.example",
        reason: ".env esta ignorado, mas .env.example nao existe — a Definition of Done exige a lista de variaveis.",
        simpleReason:
          "As senhas estão protegidas de irem para o repositório, mas ainda falta a lista das configurações que o projeto precisa.",
      };
    }

    return {
      requirementId: "foundation.env-example",
      status: "completed",
      confidence: 0.9,
      evidence: [
        fileEvidence(".gitignore", envIgnored, ".env ignorado pelo git."),
        fileEvidence(".env.example", 1, "Lista de variaveis versionada."),
      ],
      provenance: "static_analysis",
      collectionMethod: "deterministic",
      detectionOutcome: "confirmed_present",
      reason: ".env ignorado e .env.example presente.",
      simpleReason: "A lista de configurações existe e as senhas estão protegidas.",
    };
  },

  // ---- Dados ----
  (ctx) => {
    // Schemas existem e SAO USADOS para validar. Mas nao da para provar
    // estaticamente que cobrem todas as entidades do fluxo principal.
    const schemaFiles = listFiles(ctx, "src").filter((f) => f.endsWith("schema.ts"));
    if (schemaFiles.length === 0) return null;

    const first = schemaFiles[0]!;
    const content = read(ctx, first) ?? "";
    const zodLine = findLine(content, "z.object");
    const usedForParsing = listFiles(ctx, "src").some((f) => (read(ctx, f) ?? "").includes(".parse("));

    return {
      requirementId: "data.schema-defined",
      status: "partial",
      confidence: 0.75,
      evidence: [
        fileEvidence(first, zodLine, `Schema declarado com validacao (${schemaFiles.length} arquivo(s) de schema).`),
        fileEvidence("src", null, usedForParsing ? "Schemas usados para validar entrada (.parse)." : "Schemas nao usados para validacao."),
      ],
      provenance: "static_analysis",
      collectionMethod: "deterministic",
      detectionOutcome: "confirmed_present",
      reason:
        "Schemas versionados e usados para validacao. NAO e possivel provar estaticamente que cobrem todas as entidades do fluxo principal — por isso partial, nao completed.",
      simpleReason:
        "O formato dos dados está definido e é conferido pelo sistema, mas não dá para provar sozinho que cobre tudo.",
    };
  },

  // ---- Seguranca ----
  (ctx) => {
    // Varredura de padroes de segredo nos arquivos versionados.
    // NAO cobre o historico do git — por isso nunca vira completed aqui.
    const SECRET_PATTERNS: { name: string; re: RegExp }[] = [
      { name: "chave AWS", re: /AKIA[0-9A-Z]{16}/ },
      { name: "chave Stripe ao vivo", re: /sk_live_[0-9a-zA-Z]{16,}/ },
      { name: "token GitHub", re: /ghp_[0-9a-zA-Z]{36}/ },
      { name: "chave privada", re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
    ];
    const files = [...listFiles(ctx, "src"), ...listFiles(ctx, "app"), ...listFiles(ctx, "scripts"), ...listFiles(ctx, "data")];
    const findings: string[] = [];
    for (const file of files) {
      const content = read(ctx, file);
      if (content === null) continue;
      for (const pattern of SECRET_PATTERNS) {
        const line = findLine(content, pattern.re);
        if (line !== null) findings.push(`${file}:${line} (${pattern.name})`);
      }
    }

    const gitignore = read(ctx, ".gitignore");
    const envIgnored = gitignore ? findLine(gitignore, ".env") : null;

    if (findings.length > 0) {
      return {
        requirementId: "security.no-secrets-in-repo",
        status: "missing",
        confidence: 0.9,
        evidence: findings.slice(0, 3).map((f) => fileEvidence(f.split(" ")[0]!, null, `Padrao de segredo encontrado: ${f}`)),
        provenance: "specialized_tool",
        collectionMethod: "deterministic",
        detectionOutcome: "confirmed_present",
        reason: `${findings.length} possivel(is) segredo(s) em arquivo versionado.`,
        simpleReason: "Encontramos o que parece ser uma senha ou chave dentro dos arquivos do projeto.",
      };
    }

    return {
      requirementId: "security.no-secrets-in-repo",
      status: "partial",
      confidence: 0.8,
      evidence: [
        commandEvidence(
          "varredura de padroes de segredo em src/, app/, scripts/, data/",
          `${files.length} arquivos varridos, nenhum padrao conhecido encontrado.`,
        ),
        fileEvidence(".gitignore", envIgnored, ".env ignorado pelo git."),
      ],
      provenance: "specialized_tool",
      collectionMethod: "deterministic",
      // Busca por PADROES: um segredo em formato desconhecido escapa. Nao conclusivo.
      detectionOutcome: "not_detected",
      reason:
        "Nenhum padrao conhecido de segredo nos arquivos versionados. O HISTORICO do git nao foi varrido e a DoD exige isso — por isso partial, nao completed.",
      simpleReason:
        "Não encontramos senhas nos arquivos atuais do projeto. Ainda falta conferir o histórico de alterações.",
    };
  },

  (ctx) => {
    // Ausencia confirmada tambem e evidencia — desde que dita como ausencia.
    // Detecao por NOME de arquivo, nao por conteudo: procurar a palavra
    // "injection" dentro dos testes daria falso positivo em qualquer teste que
    // apenas MENCIONE o assunto — inclusive os testes deste proprio scanner.
    const testFiles = listFiles(ctx, "tests");
    const boundaryTests = testFiles.filter((f) => /injection|untrusted|fronteira/i.test(path.basename(f)));
    if (boundaryTests.length > 0) {
      // Existe teste dedicado, mas provar que ele cobre a fronteira exige
      // analise mais fina do que este scanner faz. Nao afirmamos que esta pronto.
      return {
        requirementId: "security.untrusted-content-boundary",
        status: "uncertain",
        confidence: 0.5,
        evidence: [fileEvidence(boundaryTests[0]!, null, "Teste dedicado encontrado pelo nome do arquivo.")],
        provenance: "static_analysis",
        collectionMethod: "deterministic",
        detectionOutcome: "not_detected",
        reason:
          "Existe teste com nome relacionado a fronteira de confianca, mas este scanner nao consegue provar que ele exercita a protecao.",
        simpleReason: "Existe um teste sobre esse assunto, mas não dá para confirmar sozinho que ele protege de verdade.",
      };
    }

    // "Nao achei teste com esse nome" NAO prova que a protecao nao existe:
    // ela pode estar implementada e coberta por um teste com outro nome, ou por
    // um mecanismo que este scanner nao reconhece. Ausencia NAO conclusiva.
    return {
      requirementId: "security.untrusted-content-boundary",
      status: "uncertain",
      confidence: 0.5,
      evidence: [
        commandEvidence(
          "busca por teste de prompt injection em tests/",
          `${testFiles.length} arquivos de teste varridos; nenhum com nome referente a fronteira de confianca.`,
        ),
      ],
      provenance: "static_analysis",
      collectionMethod: "deterministic",
      detectionOutcome: "not_detected",
      reason:
        "Nenhum teste com nome referente a fronteira de confianca. NAO e ausencia conclusiva: " +
        "a protecao pode existir com outro nome ou em outra forma que este scanner nao reconhece.",
      simpleReason:
        "Não encontramos proteção testada contra um projeto analisado tentar dar ordens ao sistema — mas também não conseguimos garantir que ela não existe.",
    };
  },

  // ---- Deploy ----
  (ctx) => {
    const workflows = listFiles(ctx, ".github/workflows").filter((f) => /\.ya?ml$/.test(f));
    if (workflows.length === 0) {
      return {
        requirementId: "deploy.ci-pipeline",
        status: "missing",
        confidence: 0.95,
        evidence: [fileEvidence(".github/workflows", null, "Nenhum workflow de CI encontrado.")],
        provenance: "static_analysis",
        collectionMethod: "deterministic",
        detectionOutcome: "confirmed_absent",
        observationScope: "diretorio fixo .github/workflows",
        reason: "Nenhum workflow de CI versionado (diretorio fixo inspecionado).",
        simpleReason: "Não existe verificação automática a cada mudança.",
      };
    }

    const file = workflows[0]!;
    const content = read(ctx, file) ?? "";
    const runsGates = ["typecheck", "test", "validate:framework"].filter((g) => content.includes(g));
    const prLine = findLine(content, "pull_request");

    return {
      requirementId: "deploy.ci-pipeline",
      status: "partial",
      confidence: 0.85,
      evidence: [
        fileEvidence(file, prLine, `Workflow roda em pull request e executa: ${runsGates.join(", ")}.`),
      ],
      provenance: "static_analysis",
      collectionMethod: "deterministic",
      detectionOutcome: "confirmed_present",
      reason:
        `Workflow existe e executa ${runsGates.length} gate(s). NAO e possivel verificar localmente se a falha BLOQUEIA o merge ` +
        "(depende da configuracao de branch protection no GitHub) — por isso partial.",
      simpleReason:
        "A verificação automática roda a cada mudança, mas não dá para conferir daqui se ela realmente impede um merge com erro.",
    };
  },

  // ---- Prontidao para IA ----
  (ctx) => {
    const content = read(ctx, "CLAUDE.md");
    if (content === null) return null;
    const required = [/^##\s+Arquitetura|^##\s+Estrutura/im, /^##\s+Comandos/im, /^##\s+Proibido/im];
    const found = required.filter((re) => re.test(content));
    const proibido = findLine(content, /^##\s+Proibido/m);

    if (found.length < required.length) {
      return {
        requirementId: "ai.claude-md",
        status: "partial",
        confidence: 0.9,
        evidence: [fileEvidence("CLAUDE.md", 1, `${found.length} de ${required.length} secoes obrigatorias presentes.`)],
        provenance: "static_analysis",
        collectionMethod: "deterministic",
        detectionOutcome: "confirmed_present",
        reason: "CLAUDE.md existe mas falta secao obrigatoria (estrutura, comandos ou proibicoes).",
        simpleReason: "O manual para a IA existe, mas está incompleto.",
      };
    }

    return {
      requirementId: "ai.claude-md",
      status: "completed",
      confidence: 0.9,
      evidence: [fileEvidence("CLAUDE.md", proibido, "Estrutura, comandos e proibicoes documentados.")],
      provenance: "static_analysis",
      collectionMethod: "deterministic",
      detectionOutcome: "confirmed_present",
      reason: "CLAUDE.md contem estrutura, comandos e lista de proibicoes.",
      simpleReason: "O manual do projeto para a IA está completo.",
    };
  },

  (ctx) => {
    const content = read(ctx, "AGENTS.md");
    if (content === null) return null;
    const dod = sectionWithContent(content, /^##\s+Definition of Done/i);
    if (!dod || dod.chars < 100) {
      return {
        requirementId: "ai.agents-md",
        status: "partial",
        confidence: 0.9,
        evidence: [fileEvidence("AGENTS.md", dod?.line ?? null, "Definition of Done ausente ou muito curta.")],
        provenance: "static_analysis",
        collectionMethod: "deterministic",
        detectionOutcome: "confirmed_present",
        reason: "AGENTS.md sem Definition of Done com conteudo real.",
        simpleReason: "As regras para a IA existem, mas não definem quando uma tarefa está pronta.",
      };
    }
    return {
      requirementId: "ai.agents-md",
      status: "completed",
      confidence: 0.9,
      evidence: [fileEvidence("AGENTS.md", dod.line, `Definition of Done definida (${dod.chars} caracteres).`)],
      provenance: "static_analysis",
      collectionMethod: "deterministic",
      detectionOutcome: "confirmed_present",
      reason: "AGENTS.md define Definition of Done com conteudo real.",
      simpleReason: "As regras de trabalho para a IA estão escritas, incluindo quando algo está pronto.",
    };
  },

  commandGateCheck({
    requirementId: "ai.quality-gates-runnable",
    script: "gates",
    simplePass: "Um único comando confere tudo, e ele rodou agora com sucesso.",
    simpleFail: "O comando de verificação existe, mas está falhando.",
    simpleMissing: "Não existe um comando único que confira tudo.",
  }),
  commandGateCheck({
    requirementId: "ai.framework-validation",
    script: "validate:framework",
    simplePass: "A validação do framework rodou agora e passou.",
    simpleFail: "A validação do framework existe, mas está acusando problema.",
    simpleMissing: "O framework não é validado automaticamente.",
  }),

  (ctx) => {
    // ADRs precisam seguir o template — existir arquivo nao basta.
    const adrs = listFiles(ctx, "docs/adr").filter((f) => f.endsWith(".md"));
    const complete = adrs.filter((f) => {
      const content = read(ctx, f) ?? "";
      return /##\s+Contexto/i.test(content) && /##\s+Decisao|##\s+Decisão/i.test(content) && /##\s+Alternativas/i.test(content);
    });

    if (complete.length === 0) {
      return {
        requirementId: "ai.decision-log",
        status: adrs.length > 0 ? "partial" : "missing",
        confidence: 0.9,
        evidence: [fileEvidence("docs/adr", null, `${adrs.length} arquivo(s), ${complete.length} seguindo o template.`)],
        provenance: "static_analysis",
        collectionMethod: "deterministic",
        detectionOutcome: adrs.length > 0 ? "confirmed_present" : "confirmed_absent",
        observationScope: adrs.length > 0 ? undefined : "diretorio fixo docs/adr",
        reason: "Nenhum ADR contem contexto, decisao e alternativas.",
        simpleReason: "As decisões importantes ainda não estão registradas com o motivo.",
      };
    }

    const first = complete[0]!;
    return {
      requirementId: "ai.decision-log",
      status: "completed",
      confidence: 0.9,
      evidence: [
        fileEvidence(first, findLine(read(ctx, first) ?? "", /##\s+Alternativas/), `${complete.length} de ${adrs.length} ADRs com contexto, decisao e alternativas.`),
      ],
      provenance: "static_analysis",
      collectionMethod: "deterministic",
      detectionOutcome: "confirmed_present",
      reason: `${complete.length} ADR(s) seguem o template completo.`,
      simpleReason: "As decisões importantes estão registradas com contexto e alternativas.",
    };
  },
];

/**
 * Guarda estrutural contra conclusoes que este scanner nao pode sustentar.
 * Falha alto: um scanner que mente e pior que um scanner que se cala.
 */
function assertProposalsAreHonest(proposals: StateProposal[]): void {
  for (const p of proposals) {
    // Ausencia conclusiva exige declarar o espaco inspecionado.
    if (p.detectionOutcome === "confirmed_absent" && !p.observationScope) {
      throw new Error(
        `${p.requirementId}: ausencia declarada como conclusiva sem informar o espaco inspecionado.`,
      );
    }
    // `missing` so e legitimo com ausencia conclusiva OU deteccao positiva do
    // problema (ex.: encontramos um segredo). Nunca por "procurei e nao achei".
    if (p.status === "missing" && p.detectionOutcome === "not_detected") {
      throw new Error(
        `${p.requirementId}: status "missing" apoiado em "not_detected". ` +
          `"Nao encontrei" nao prova ausencia — use uncertain ou partial.`,
      );
    }
  }
}

/** Roda todas as verificacoes. Ordem estavel: mesma entrada, mesma saida. */
export function scanRepository(options: ScanOptions = {}): StateProposal[] {
  const trust = options.trust ?? "self";
  const runCommands = options.runCommands ?? false;

  // FRONTEIRA DE SEGURANCA: repositorio externo nunca tem comando executado
  // no host. Falha alto e cedo, em vez de degradar silenciosamente.
  if (runCommands && trust !== "self") {
    throw new UntrustedExecutionError(
      "runCommands so e permitido com trust: \"self\". Repositorio de terceiro exige " +
        "ambiente isolado e descartavel, sem segredos internos, com limite de recursos, " +
        "timeout e politica de rede. Ver ADR 0007 e docs/BACKLOG.md.",
    );
  }

  const ctx: Ctx = {
    root: options.root ?? process.cwd(),
    runCommands,
    trust,
  };

  const proposals: StateProposal[] = [];
  for (const check of CHECKS) {
    const proposal = check(ctx);
    if (proposal) proposals.push(proposal);
  }

  assertProposalsAreHonest(proposals);
  return proposals.sort((a, b) => a.requirementId.localeCompare(b.requirementId));
}
