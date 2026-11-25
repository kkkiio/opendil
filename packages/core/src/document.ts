/**
 * `source → DilDocument`: parse, lower Markdown to the render tree, and prune the
 * containers a still-arriving stream has not filled yet.
 */

import { lowerMarkdown } from "./markdown.ts";
import { normalizeSource, parse } from "./parser.ts";
import { pruneEmptyIncomplete } from "./prune.ts";
import type { DilDocument } from "./types.ts";

/**
 * Parse DIL source into the structural AST and the render tree.
 *
 * @param source DIL + Markdown source, exactly as the model wrote it; any prefix of a
 *   streaming message is accepted.
 * @param options.isStreaming Default `true`. Marks the fragment that owns the end of the
 *   source as still growing, so half-arrived constructs are closed for display instead of
 *   reported as errors. Pass `false` for a finished document.
 * @returns The document, plus the recovery diagnostics found on the way. Never throws:
 *   malformed or truncated input yields a usable tree and a diagnostic summary.
 */
export function parseDocument(source: string, { isStreaming = true } = {}): DilDocument {
  const result = parse(source);
  const tree = pruneEmptyIncomplete(
    lowerMarkdown(result.nodes, {
      document: true,
      sourceLength: isStreaming ? normalizeSource(source).length : undefined,
    }),
  );
  return {
    raw: result.nodes,
    tree,
    diagnostics: result.diagnostics,
    diagnosticSummary: result.diagnosticSummary,
  };
}
