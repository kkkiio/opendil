import type { CompiledArtifact, ResolvedNode } from "@kkkiio/dil-core";

export interface DilExecutorResult {
  readonly tree: readonly ResolvedNode[];
  readonly buttons: readonly string[];
  readonly state: Record<string, unknown>;
  readonly effects: readonly string[];
  readonly errors: number;
}

export interface DilExecutor {
  load(artifact: CompiledArtifact & { appData?: unknown }): DilExecutorResult;
  trigger(id: string, args?: readonly unknown[]): DilExecutorResult | null;
  probe(id: string): boolean;
}

export function createExecutor(initialState?: Record<string, unknown>): DilExecutor;
