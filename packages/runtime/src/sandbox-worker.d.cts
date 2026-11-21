import type { DilData, DilProgram, WireNode } from "@opendil/core";

export interface DilArtifact {
  readonly code: string;
  readonly data: DilData;
}

export function assembleProgram(program: DilProgram): DilArtifact;

export interface DilResult {
  readonly tree: WireNode[];
  readonly buttons: readonly string[];
  readonly state: Record<string, unknown>;
  readonly effects: readonly string[];
}

export interface DilProgramRunner {
  load(program: DilProgram): DilResult;
  probe(id: string): boolean;
  trigger(id: string, args?: readonly unknown[]): DilResult | null;
}

export function createProgram(initialState?: Record<string, unknown>): DilProgramRunner;
