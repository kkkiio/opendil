import type { CompiledArtifact, DilHandler, DilViewState, ResolvedNode } from "@kkkiio/dil-core";
import { readViewState } from "@kkkiio/dil-core";
import type { DilHost } from "./runtime.ts";
import { createExecutor } from "./sandbox-worker.cjs";

export interface DirectSnapshot {
  readonly tree: readonly ResolvedNode[];
  readonly errors: number;
}

export class DirectRuntime {
  private impl: ReturnType<typeof createExecutor>;
  private artifact?: CompiledArtifact;
  private snapshot?: DirectSnapshot;
  private state: Record<string, unknown>;
  private readonly onTree: (tree: readonly ResolvedNode[], errors: number) => void;
  private readonly onIntents: (sends: ReadonlySet<string>) => void;
  private readonly getHost: () => DilHost | null;
  private readonly onViewStateChange?: (viewState: DilViewState) => void;

  constructor(
    onTree: (tree: readonly ResolvedNode[], errors: number) => void,
    onIntents: (sends: ReadonlySet<string>) => void,
    getHost: () => DilHost | null,
    viewState?: DilViewState,
    onViewStateChange?: (viewState: DilViewState) => void,
  ) {
    this.onTree = onTree;
    this.onIntents = onIntents;
    this.getHost = getHost;
    this.onViewStateChange = onViewStateChange;
    this.state = readViewState(viewState?.root ?? {});
    this.impl = createExecutor(this.state);
  }

  evaluate(artifact: CompiledArtifact): DirectSnapshot | undefined {
    if (artifact === this.artifact) return this.snapshot;
    try {
      const result = this.impl.load(artifact);
      this.artifact = artifact;
      this.snapshot = { tree: result.tree, errors: result.errors };
      this.state = readViewState(result.state);
      this.probeIntents(artifact, result.state, result.buttons);
      return this.snapshot;
    } catch {
      return undefined;
    }
  }

  update(artifact: CompiledArtifact | undefined): void {
    if (!artifact || artifact === this.artifact) return;
    const snapshot = this.evaluate(artifact);
    if (snapshot !== undefined) this.onTree(snapshot.tree, snapshot.errors);
  }

  invoke(handler: DilHandler, args: unknown[] = [], onSend?: () => void): Promise<void> {
    const artifact = this.artifact;
    if (!artifact) return Promise.resolve();
    const result = this.impl.trigger(handler.id, args);
    if (!result) return Promise.resolve();
    this.snapshot = { tree: result.tree, errors: result.errors };
    const nextState = readViewState(result.state);
    if (this.onViewStateChange && JSON.stringify(this.state) !== JSON.stringify(nextState)) {
      this.state = nextState;
      this.onViewStateChange({ root: nextState });
    } else this.state = nextState;
    this.onTree(this.snapshot.tree, this.snapshot.errors);
    this.probeIntents(artifact, result.state, result.buttons);
    const prompt = typeof result.effects[0] === "string" ? result.effects[0].trim() : "";
    const host = prompt ? this.getHost() : null;
    if (!host || host.busy) return Promise.resolve();
    onSend?.();
    return Promise.resolve(host.issueNewTurn(prompt));
  }

  setVisible(_visible: boolean): void {}
  stop(): void {}

  private probeIntents(artifact: CompiledArtifact, state: Record<string, unknown>, buttons: readonly string[]): void {
    this.onIntents(
      new Set(
        buttons.filter((id) => {
          try {
            const specimen = createExecutor(structuredClone(readViewState(state)));
            specimen.load(artifact);
            return specimen.probe(id);
          } catch {
            return false;
          }
        }),
      ),
    );
  }
}
