import { type CompiledArtifact, type CompileOptions, serializeArtifact } from "./artifact.ts";
import { parseDocument } from "./document.ts";
import { normalizeSource } from "./parser.ts";
import type { DilNode } from "./types.ts";

/** A compiler that follows the revisions of one streaming message. */
export interface DilCompileSession {
  /**
   * Compile the full message received so far and return its executable artifact.
   * A source replacement starts a fresh stream. Partial markup is recovered while the
   * message is arriving.
   */
  compile(source: string): CompiledArtifact;
}

/** The number of leading top-level blocks that have stopped growing: every block but the
 * one still owning the end of the source. */
function settledBlocks(tree: readonly DilNode[]): number {
  let children = 0;
  for (const node of tree) if (node.type !== "stmt") children++;
  return Math.max(0, children - 1);
}

/**
 * Create a compiler for one growing message with the supplied compilation options.
 * Pass the accumulated source on each update, including the final revision.
 */
export function createCompileSession(options: CompileOptions = {}): DilCompileSession {
  let source = "";
  let accounted = 0;
  let batches: number[] = [];
  let first = true;
  return {
    compile(next: string): CompiledArtifact {
      const normalized = normalizeSource(next);
      if (!normalized.startsWith(source)) {
        accounted = 0;
        batches = [];
        first = true;
      }
      const document = parseDocument(normalized, { isStreaming: true });
      const settled = settledBlocks(document.tree);
      if (settled < accounted) {
        accounted = settled;
        batches = batches.filter((start) => start < settled);
      }
      if (first) {
        accounted = settled;
        first = false;
      } else if (settled > accounted) {
        batches.push(accounted);
        accounted = settled;
      }
      source = normalized;
      return serializeArtifact(document, { ...options, batchStarts: batches });
    },
  };
}
