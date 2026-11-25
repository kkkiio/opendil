/**
 * `createCompileSession` — compiling one streaming message several times.
 *
 * A one-shot `compileDil` sees a finished document and says nothing about how it arrived.
 * A conversation delivers the same message over and over: the model writes tokens, the
 * host recompiles the accumulated source, and blocks that have stopped growing are settled
 * into the batch they arrived in. The compiled program records those batches as
 * `__dil.jsx(__dil.Fragment,null,…)` groups.
 *
 * The session is the only stateful API here; `compileDil` stays the one-shot path and is
 * byte-identical to a session that was only ever compiled once.
 */

import { type CompiledArtifact, type CompileOptions, serializeArtifact } from "./artifact.ts";
import { parseDocument } from "./document.ts";
import { normalizeSource } from "./parser.ts";
import type { DilNode } from "./types.ts";

/**
 * One streaming message's compiler memory.
 *
 * A session owns exactly one growing source. Feed it every revision; it returns the
 * program for that revision.
 */
export interface DilCompileSession {
  /**
   * Compile the source as it currently stands.
   *
   * @param source The whole message so far, not a delta. The first call establishes batch
   *   0 from everything it can see; each later call settles the top-level blocks that
   *   appeared since the previous compile and have stopped growing into a new batch, so the
   *   returned program gains a `Fragment` per batch after the first.
   * @returns The artifact for this revision. Calling it twice with the same source returns
   *   the same shape — the batches that were already settled do not split again.
   * @throws Nothing for malformed input: like `parseDocument`, a truncated or broken
   *   source compiles to a program with recovery diagnostics instead.
   *
   * A source that does not extend the previous one is treated as a new message: the batch
   * ledger resets rather than inventing batches for content the session never streamed.
   * Batches already settled inside the retained prefix keep their place.
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
 * Create a compiler for one streaming message.
 *
 * @param options Platform facts, exactly as `compileDil` takes them: the internal widget
 *   tag name, the id factory, and the DIL block's position in the message. They apply to
 *   every revision this session compiles.
 * @returns A session whose first `compile` equals `compileDil` on the same source.
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
