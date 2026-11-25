import { type CompiledArtifact, type CompileOptions, serializeArtifact } from "./artifact.ts";
import type { DilDocument } from "./types.ts";

export type { CompiledArtifact, CompileOptions };

/**
 * Compile a DIL document into the reference artifact: the closed JavaScript program,
 * its constant table, the degraded Markdown projection, and the host-component manifest.
 * Every document compiles to the same shape, static and dynamic alike; where the program
 * is evaluated (a server build, the page's main thread, or an isolated sandbox) is the
 * host's decision, not the compiler's.
 */
export function compileDil(document: DilDocument, options: CompileOptions = {}): CompiledArtifact {
  return serializeArtifact(document, options);
}
