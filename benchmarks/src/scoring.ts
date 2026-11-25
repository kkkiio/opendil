/**
 * Deterministic scoring for DIL benchmarks.
 *
 * Uses `@kkkiio/dil-core` (`parseDocument`, `compileDil`) and `@kkkiio/dil-runtime/worker`
 * (`createExecutor`) so a case passes only when the emitted DIL genuinely parses,
 * compiles, and executes without runtime errors.
 */

import {
  collectStatements,
  compileDil,
  type DilAttribute,
  type DilDocument,
  type DilNode,
  parseDocument,
} from "@kkkiio/dil-core";
import { createExecutor } from "@kkkiio/dil-runtime/worker";
import type { BenchmarkTrack } from "./runners/types.ts";

export interface CaseCheck {
  readonly id: string;
  readonly label: string;
  readonly test: (context: CaseContext) => boolean;
}

export interface DilCase {
  readonly id: string;
  readonly track: BenchmarkTrack | "both";
  readonly category: string;
  readonly prompt: string;
  /** Why Markdown alone is the wrong shape for this prompt. */
  readonly why: string;
  /** Optional target repository (`<git-url>@<ref>`); runs the case in an isolated container checkout. */
  readonly projectRepo?: string;
  readonly checks: readonly CaseCheck[];
}

export interface CaseContext {
  readonly text: string;
  /** Structural AST before prose lowering, so source tags/attrs are visible. */
  readonly raw: readonly DilNode[];
  readonly parse: DilDocument;
  readonly elements: readonly DilNode[];
  readonly words: number;
}

export interface CaseResult {
  readonly id: string;
  readonly track: BenchmarkTrack | "both";
  readonly category: string;
  readonly text: string;
  readonly checks: readonly { readonly id: string; readonly label: string; readonly pass: boolean }[];
  readonly score: number;
  readonly passed: number;
  readonly total: number;
  readonly diagnostics: string;
  readonly dilNodes: number;
  readonly toolCallCount?: number;
  readonly toolNames?: readonly string[];
  readonly assistantTurns?: number;
  readonly trajectoryFile?: string;
}

export interface CaseTrace {
  readonly toolCallCount?: number;
  readonly toolNames?: readonly string[];
  readonly assistantTurns?: number;
  readonly trajectoryFile?: string;
}

const DIL_TAGS = new Set([
  "box",
  "row",
  "col",
  "grid",
  "grid-item",
  "divider",
  "title",
  "text",
  "caption",
  "badge",
  "icon",
  "bold",
  "italic",
  "code",
  "list",
  "list-item",
  "table",
  "table-row",
  "table-cell",
  "blockquote",
  "math",
  "code-block",
  "Link",
  "svg",
  "button",
  "radio-group",
  "radio",
  "textarea",
  "label",
]);

/** DIL elements the model actually wrote (Markdown lowers share the same names). */
export function dilElements(nodes: readonly DilNode[], out: DilNode[] = []): DilNode[] {
  for (const node of nodes) {
    if (node.type === "element") {
      if (!node.synthetic && DIL_TAGS.has(node.name)) out.push(node);
      dilElements(node.children, out);
    } else if (node.type === "if") {
      out.push(node);
      for (const branch of node.branches) dilElements(branch.body, out);
    } else if (node.type === "each") {
      out.push(node);
      dilElements(node.body, out);
    } else if (node.type === "fence") {
      out.push(node);
    }
  }
  return out;
}

export function contextOf(text: string): CaseContext {
  const parse = parseDocument(text, { isStreaming: false });
  const elements = dilElements(parse.raw);
  return {
    text,
    raw: parse.raw,
    parse,
    elements,
    words: countWords(text),
  };
}

function countWords(text: string): number {
  const prose = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[{}\\/|*_~`#>=-]/g, " ");
  const latin = prose.match(/[A-Za-z0-9][\w'’-]*/g)?.length ?? 0;
  const cjk = prose.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  return latin + cjk;
}

function elementName(node: DilNode): string | null {
  return node.type === "element" ? node.name : node.type === "each" ? "each" : node.type === "if" ? "if" : null;
}

function attrsOf(node: DilNode): readonly DilAttribute[] {
  return node.type === "element" ? node.attrs : [];
}

function attrText(attribute: DilAttribute): string {
  return typeof attribute.value === "string" ? attribute.value : String(attribute.value);
}

function childrenOf(node: DilNode): readonly DilNode[] {
  if (node.type === "element") return node.children;
  if (node.type === "each") return node.body;
  if (node.type === "if") return node.branches.flatMap((branch) => branch.body);
  return [];
}

function allElements(nodes: readonly DilNode[], out: { name: string }[] = []): { name: string }[] {
  for (const node of nodes) {
    if (node.type === "element") {
      out.push(node);
      allElements(node.children, out);
    } else if (node.type === "if") {
      for (const branch of node.branches) allElements(branch.body, out);
    } else if (node.type === "each") {
      allElements(node.body, out);
    }
  }
  return out;
}

function contains(nodes: readonly DilNode[], name: string): boolean {
  return nodes.some((node) => elementName(node) === name || contains(childrenOf(node), name));
}

// ---------------------------------------------------------------------------
// Check builders
// ---------------------------------------------------------------------------

/** Source tags *and* Markdown lowers (a `<code>` written as backticks still counts). */
export function hasAnyTag(name: string, options: { atLeast?: number; label?: string } = {}): CaseCheck {
  const atLeast = options.atLeast ?? 1;
  return {
    id: `anyTag:${name}`,
    label: options.label ?? `出现 ${name} ×${atLeast}`,
    test: (context) => allElements(context.parse.tree).filter((node) => node.name === name).length >= atLeast,
  };
}

export function anyTag(names: readonly string[], options: { atLeast?: number; label?: string } = {}): CaseCheck {
  const atLeast = options.atLeast ?? 1;
  return {
    id: `anyTag:${names.join("|")}`,
    label: options.label ?? `出现 ${names.join(" 或 ")} ×${atLeast}`,
    test: (context) => context.elements.filter((node) => names.includes(elementName(node) ?? "")).length >= atLeast,
  };
}

export function either(checks: readonly CaseCheck[], label: string): CaseCheck {
  return {
    id: `either:${checks.map((check) => check.id).join("|")}`,
    label,
    test: (context) => checks.some((check) => check.test(context)),
  };
}

export function hasTag(name: string, options: { atLeast?: number; label?: string } = {}): CaseCheck {
  const atLeast = options.atLeast ?? 1;
  return {
    id: `tag:${name}`,
    label: options.label ?? `出现 <${name}> ×${atLeast}`,
    test: (context) => context.elements.filter((node) => elementName(node) === name).length >= atLeast,
  };
}

export function nested(outer: string, inner: string, label: string): CaseCheck {
  return {
    id: `nested:${outer}>${inner}`,
    label,
    test: (context) => {
      const walk = (nodes: readonly DilNode[]): boolean =>
        nodes.some((node) =>
          elementName(node) === outer
            ? contains(childrenOf(node), inner) || walk(childrenOf(node))
            : walk(childrenOf(node)),
        );
      return walk(context.raw);
    },
  };
}

export function hasIf(label: string): CaseCheck {
  return {
    id: "if",
    label,
    test: (context) => context.elements.some((node) => node.type === "if"),
  };
}

export function hasEach(label: string): CaseCheck {
  return {
    id: "each",
    label,
    test: (context) => context.elements.some((node) => node.type === "each"),
  };
}

export function hasStateDeclaration(label: string): CaseCheck {
  return {
    id: "state-decl",
    label,
    test: (context) => collectStatements(context.raw).some((stmt) => stmt.includes("DIL.useState")),
  };
}

export function attributeContains(name: string, attr: string, containsStr: string, label: string): CaseCheck {
  return {
    id: `attr:${name}.${attr}`,
    label,
    test: (context) =>
      context.elements.some(
        (node) =>
          elementName(node) === name &&
          attrsOf(node).some((attribute) => attribute.name === attr && attrText(attribute).includes(containsStr)),
      ),
  };
}

/** Avoids heavy layout chrome (`<grid>`, nested `<box>`, `<svg>`) while allowing light `<icon>`/`<badge>`. */
export function noHeavyLayout(label: string): CaseCheck {
  return {
    id: "no-heavy-layout",
    label,
    test: (context) =>
      !hasTag("grid").test(context) && !hasTag("svg").test(context) && !nested("box", "box", "").test(context),
  };
}

export function cleanDiagnostics(label: string): CaseCheck {
  return {
    id: "diagnostics",
    label,
    test: (context) => context.parse.diagnostics.length === 0,
  };
}

/** Verifies `compileDil` succeeds and the program loads cleanly in `@kkkiio/dil-runtime/worker`. */
export function compilesAndRuns(label: string): CaseCheck {
  return {
    id: "compile-and-run",
    label,
    test: (context) => {
      const artifact = compileDil(context.parse);
      const executor = createExecutor();
      let result: ReturnType<typeof executor.load>;
      try {
        result = executor.load(artifact);
      } catch {
        return false;
      }
      return Array.isArray(result.tree) && result.tree.length > 0;
    },
  };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export function scoreCase(dilCase: DilCase, text: string, trace?: CaseTrace): CaseResult {
  const context = contextOf(text);
  const checks = dilCase.checks.map((check) => ({ id: check.id, label: check.label, pass: safeTest(check, context) }));
  const passed = checks.filter((check) => check.pass).length;
  return {
    id: dilCase.id,
    track: dilCase.track,
    category: dilCase.category,
    text,
    checks,
    passed,
    total: checks.length,
    score: checks.length === 0 ? 0 : Math.round((passed / checks.length) * 100),
    diagnostics: context.parse.diagnosticSummary,
    dilNodes: context.elements.filter((node) => node.type === "element").length,
    ...(trace?.toolCallCount !== undefined ? { toolCallCount: trace.toolCallCount } : {}),
    ...(trace?.toolNames !== undefined ? { toolNames: trace.toolNames } : {}),
    ...(trace?.assistantTurns !== undefined ? { assistantTurns: trace.assistantTurns } : {}),
    ...(trace?.trajectoryFile ? { trajectoryFile: trace.trajectoryFile } : {}),
  };
}

function safeTest(check: CaseCheck, context: CaseContext): boolean {
  try {
    return check.test(context);
  } catch {
    return false;
  }
}

export interface BenchmarkSummary {
  readonly variant: string;
  readonly cases: readonly CaseResult[];
  readonly score: number;
  readonly passed: number;
  readonly total: number;
}

export function summarize(variant: string, cases: readonly CaseResult[]): BenchmarkSummary {
  const passed = cases.reduce((sum, result) => sum + result.passed, 0);
  const total = cases.reduce((sum, result) => sum + result.total, 0);
  return { variant, cases, passed, total, score: total === 0 ? 0 : Math.round((passed / total) * 100) };
}
