import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { isIndependentlyVerified, type Evidence, type Framework, type RequirementState } from "../framework/schema.js";

/**
 * RECONCILIACAO DE DECISOES — primeiro coletor deterministico do projeto.
 *
 * Por que existe: no bootstrap, o estado de cada requisito foi escrito a mao.
 * Nada relia a documentacao. Quando uma decisao formal era registrada num ADR,
 * o estado do requisito continuava "missing" — e o Navigator seguia pedindo ao
 * fundador uma decisao que ele JA tinha tomado.
 *
 * A correcao nao e mexer num requisito especifico: e criar o elo que faltava
 * entre documentacao e estado. Um ADR declara, em front-matter legivel por
 * maquina, quais requisitos ele decide. Este coletor le esses arquivos e
 * produz propostas de estado com evidencia `arquivo:linha`.
 *
 * Deterministico: mesmo conteudo de ADR produz sempre a mesma proposta.
 * Nenhum LLM participa.
 */

export interface AdrFrontMatter {
  adr: string;
  status: string;
  date?: string;
  /** Requisitos que este ADR decide POR COMPLETO. */
  decides: string[];
  /** Requisitos que este ADR decide apenas em parte (falta item da DoD). */
  decidesPartially: string[];
  note?: string;
}

export interface AdrDocument {
  file: string;
  frontMatter: AdrFrontMatter;
  title: string;
  /** Linha (1-indexed) onde o front-matter declara a ligacao. Vira evidencia. */
  decidesLine: number;
}

export interface StateProposal {
  requirementId: string;
  status: "completed" | "partial";
  confidence: number;
  evidence: Evidence[];
  /**
   * SEMPRE `decision_record`. Um ADR e declaracao humana lida por maquina:
   * prova que a decisao foi registrada, nunca que a implementacao existe.
   */
  provenance: "decision_record";
  /** A LEITURA foi deterministica — eixo independente da proveniencia. */
  collectionMethod: "deterministic";
  reason: string;
}

export class ReconcilerError extends Error {}

/** ADRs cujo status conta como decisao valida. `proposto`/`rejeitado` nao contam. */
const ACCEPTED_STATUSES = new Set(["aceito", "accepted"]);

/**
 * Parser minimo de front-matter. Suporta apenas o que precisamos: escalares e
 * listas com hifen. Sem dependencia de YAML — o formato e nosso e e restrito.
 */
export function parseFrontMatter(content: string, file: string): {
  frontMatter: AdrFrontMatter;
  decidesLine: number;
} | null {
  const lines = content.split("\n");
  if (lines[0]?.trim() !== "---") return null;

  const end = lines.indexOf("---", 1);
  if (end === -1) {
    throw new ReconcilerError(`${file}: front-matter aberto e nunca fechado.`);
  }

  const scalars: Record<string, string> = {};
  const lists: Record<string, string[]> = {};
  let currentList: string | null = null;
  let decidesLine = 0;

  for (let i = 1; i < end; i += 1) {
    const raw = lines[i]!;
    const trimmed = raw.trim();
    if (trimmed === "") continue;

    const itemMatch = /^-\s+(.+)$/.exec(trimmed);
    if (itemMatch && currentList) {
      lists[currentList]!.push(stripQuotes(itemMatch[1]!));
      continue;
    }

    const keyMatch = /^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/.exec(trimmed);
    if (!keyMatch) {
      throw new ReconcilerError(`${file}:${i + 1}: linha de front-matter invalida: "${trimmed}"`);
    }

    const [, key, value] = keyMatch as unknown as [string, string, string];
    if (value === "") {
      currentList = key;
      lists[key] = [];
      if (key === "decides" || key === "decidesPartially") decidesLine = i + 1;
    } else {
      currentList = null;
      scalars[key] = stripQuotes(value);
    }
  }

  if (!scalars.adr || !scalars.status) {
    throw new ReconcilerError(`${file}: front-matter precisa de "adr" e "status".`);
  }

  return {
    frontMatter: {
      adr: scalars.adr,
      status: scalars.status,
      date: scalars.date,
      decides: lists.decides ?? [],
      decidesPartially: lists.decidesPartially ?? [],
      note: scalars.note,
    },
    decidesLine,
  };
}

function stripQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "").trim();
}

export function loadAdrDocuments(dir = path.join(process.cwd(), "docs", "adr")): AdrDocument[] {
  // Ordem estavel por nome de arquivo: o resultado precisa ser reproduzivel.
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const documents: AdrDocument[] = [];
  for (const file of files) {
    const content = readFileSync(path.join(dir, file), "utf8");
    const parsed = parseFrontMatter(content, file);
    if (!parsed) continue;

    const titleLine = content.split("\n").find((l) => l.startsWith("# "));
    documents.push({
      file,
      frontMatter: parsed.frontMatter,
      title: titleLine ? titleLine.replace(/^#\s*/, "") : file,
      decidesLine: parsed.decidesLine,
    });
  }
  return documents;
}

/**
 * Compara os ADRs aceitos com o framework e devolve as propostas de estado.
 * NAO escreve nada: quem aplica e o script de reconciliacao.
 */
export function reconcileDecisions(
  framework: Framework,
  documents: AdrDocument[] = loadAdrDocuments(),
): StateProposal[] {
  const proposals: StateProposal[] = [];

  for (const doc of documents) {
    if (!ACCEPTED_STATUSES.has(doc.frontMatter.status.toLowerCase())) continue;

    const entries: { id: string; status: "completed" | "partial" }[] = [
      ...doc.frontMatter.decides.map((id) => ({ id, status: "completed" as const })),
      ...doc.frontMatter.decidesPartially.map((id) => ({ id, status: "partial" as const })),
    ];

    for (const entry of entries) {
      const requirement = framework.requirements.find((r) => r.id === entry.id);
      if (!requirement) {
        throw new ReconcilerError(
          `${doc.file}: declara decidir "${entry.id}", que nao existe no framework.`,
        );
      }

      // GUARDA ESTRUTURAL: um ADR so pode satisfazer requisito cuja Definition
      // of Done E uma decisao documentada. Declarar num ADR que o rate limiting
      // esta pronto jamais pode valer o mesmo que um scanner detecta-lo.
      if (requirement.kind !== "decision") {
        throw new ReconcilerError(
          `${doc.file}: declara decidir "${entry.id}", que e do tipo "${requirement.kind}". ` +
            `Um registro de decisao so satisfaz requisitos do tipo "decision" — ` +
            `requisitos de implementacao ou operacao exigem verificacao independente.`,
        );
      }

      const locator = `docs/adr/${doc.file}:${doc.decidesLine}`;
      const evidence: Evidence[] = [
        {
          source: "file",
          provenance: "decision_record",
          locator,
          note:
            entry.status === "completed"
              ? `Decisão formal registrada em "${doc.title}" (status: ${doc.frontMatter.status}).`
              : `Decisão parcial em "${doc.title}": ${doc.frontMatter.note ?? "parte da Definition of Done ainda em aberto."}`,
        },
      ];

      proposals.push({
        requirementId: entry.id,
        status: entry.status,
        // Alta, mas nao maxima: o ADR prova que a decisao foi tomada e
        // registrada, nao que ela foi implementada.
        confidence: entry.status === "completed" ? 0.9 : 0.7,
        evidence,
        provenance: "decision_record",
        collectionMethod: "deterministic",
        reason:
          entry.status === "completed"
            ? `ADR ${doc.frontMatter.adr} decide este requisito.`
            : `ADR ${doc.frontMatter.adr} decide este requisito em parte.`,
      });
    }
  }

  // Ordem estavel para diffs previsiveis.
  return proposals.sort((a, b) => a.requirementId.localeCompare(b.requirementId));
}

/** Uma proposta so vira mudanca se realmente alterar o estado atual. */
export function proposalChangesState(
  proposal: StateProposal,
  current: RequirementState | undefined,
): boolean {
  if (!current) return true;
  // Estado ja verificado de forma INDEPENDENTE nao e rebaixado por um ADR:
  // o scanner tem mais autoridade que uma declaracao.
  if (isIndependentlyVerified(current.provenance)) return false;
  return (
    current.status !== proposal.status ||
    current.provenance !== proposal.provenance ||
    current.evidence.length === 0
  );
}
