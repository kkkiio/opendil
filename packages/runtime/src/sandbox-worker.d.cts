import type { DilData, DilProgram, WireNode } from "@kkkiio/dil-core";

export interface DilArtifact {
  readonly code: string;
  readonly data: DilData;
  /** Dynamic parts whose native syntax check failed and fell back. */
  readonly errors: number;
}

export function assembleProgram(program: DilProgram): DilArtifact;

export interface DilResult {
  readonly tree: WireNode[];
  readonly buttons: readonly string[];
  readonly state: Record<string, unknown>;
  readonly effects: readonly string[];
  /** Syntax-failed parts (load only) plus expressions that threw during this render. */
  readonly errors: number;
}

export interface DilProgramRunner {
  load(program: DilProgram): DilResult;
  probe(id: string): boolean;
  trigger(id: string, args?: readonly unknown[]): DilResult | null;
}

export function createProgram(initialState?: Record<string, unknown>): DilProgramRunner;
