import type { CompiledArtifact, ResolvedNode } from "@kkkiio/dil-core";

export interface DilExecutorResult {
  readonly renderId: number;
  readonly tree: readonly ResolvedNode[];
  readonly buttons: readonly string[];
  readonly state: Record<string, unknown>;
  readonly effects: readonly string[];
  readonly errors: number;
}

export interface DilExecutor {
  load(artifact: CompiledArtifact & { appData?: unknown }, renderId?: number): DilExecutorResult;
  trigger(id: string, args?: readonly unknown[], renderId?: number): DilExecutorResult | null;
  probe(id: string): boolean;
}

export function createExecutor(initialState?: Record<string, unknown>): DilExecutor;
