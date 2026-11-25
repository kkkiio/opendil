/**
 * `src/core/dil` — DIL + Markdown parser.
 *
 * Pure TypeScript with no React or DOM dependency, so the pipeline can be unit-tested
 * in Node against real corpus fixtures:
 *
 *   source ── parse ──────► structural AST + recovery diagnostics   (parser.ts)
 *          ── stream repair ─► close the constructs the tail left open (stream-repair.ts)
 *          ── lowerMarkdown ─► prose → title / text / list / table … (markdown.ts)
 *          ── pruneEmptyIncomplete ─► drop half-streamed containers  (prune.ts)
 *          ── toFallbackMarkdown ─► Markdown projection for copy      (fallback.ts)
 *
 * `parse` never throws: every prefix of a streaming document yields a usable AST plus
 * diagnostics, which is what keeps the transcript stable while tokens arrive.
 */

import { splitStatements } from "./statements.ts";
import type { DilNode } from "./types.ts";

/** `{@body}` directives may appear anywhere; hoist them regardless of nesting. */
export function collectStatements(nodes: readonly DilNode[], out: string[] = []): string[] {
  for (const node of nodes) {
    switch (node.type) {
      case "stmt":
        out.push(...splitStatements(node.code));
        break;
      case "element":
        collectStatements(node.children, out);
        break;
      case "if":
        for (const branch of node.branches) collectStatements(branch.body, out);
        break;
      case "each":
        collectStatements(node.body, out);
        break;
      default:
        break;
    }
  }
  return out;
}

export type { DilCompileSession } from "./compile-session.ts";
export { createCompileSession } from "./compile-session.ts";
export type { CompiledArtifact, CompileOptions } from "./compiler.ts";
export { compileDil } from "./compiler.ts";
export { hasDilElements } from "./detect.ts";
export { parseDocument } from "./document.ts";
export { tidyFallback, toFallbackMarkdown } from "./fallback.ts";
export { fenceToElement, isHttpsImageUrl, lowerInline, lowerMarkdown } from "./markdown.ts";
export { normalizeSource, parse, RAW_TEXT_TAGS } from "./parser.ts";
export { CONTAINER_TAGS, pruneEmptyIncomplete } from "./prune.ts";
export type {
  DilData,
  DilHandler,
  DilSite,
  DilViewState,
  ResolvedNode,
  ResolvedProps,
  WireNode,
} from "./render-tree.ts";
export { MAX_DIL_DEPTH, MAX_DIL_NODES, readDilViewState, readTree, readViewState } from "./render-tree.ts";
export { findTopLevel, LineIndex, readBalanced, splitEachClause, topLevelIndex } from "./scanner.ts";
export { splitStatements, stateStatement } from "./statements.ts";
export type { PropForm, StylePropEntry, StylePropsOfTag } from "./style-props.ts";
export { STYLE_PROPS } from "./style-props.ts";
export type {
  DilAttribute,
  DilAttributeKind,
  DilDiagnostic,
  DilDiagnosticCode,
  DilDocument,
  DilEachNode,
  DilElementNode,
  DilExprNode,
  DilFenceNode,
  DilIfBranch,
  DilIfNode,
  DilNode,
  DilParseResult,
  DilRecoveryAction,
  DilStmtNode,
  DilTextNode,
} from "./types.ts";
export type { DilTagName, TagEntry, TagKind, TagSupport } from "./vocabulary.ts";
export { DIL_VOCABULARY, INLINE_TAGS, isInlineTag, isKnownTag, KNOWN_TAGS, tagEntry } from "./vocabulary.ts";
