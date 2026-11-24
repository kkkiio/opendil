import type { DilHandler, DilProgram, DilViewState, ResolvedNode } from "@kkkiio/dil-core";
import { readTree, readViewState } from "@kkkiio/dil-core";
import type { DilHost } from "./runtime.ts";
import { createProgram } from "./sandbox-worker.cjs";

/** What a synchronous evaluation produced: the resolved tree plus its error tally. */
export interface DirectSnapshot {
  readonly tree: readonly ResolvedNode[];
  readonly errors: number;
}

/**
 * Synchronous, in-context executor for trusted DIL programs.
 *
 * `DilSandbox` runs the program inside a hidden iframe because model output is untrusted.
 * Hosts that ship their own DIL — a blog, docs, test fixtures — may prefer this engine:
 * the program runs wherever the component renders, in the browser tab or in Node during a
 * static build, with no iframe boot and no messaging latency. `evaluate()` is a pure
 * synchronous call, so a server-side renderer can bake the resolved tree straight into
 * its HTML output.
 *
 * The public methods mirror `DilSandbox` — including the view-state seed and the
 * interaction-driven change report — so a renderer can swap the two without touching any
 * other code. What is deliberately absent: the watchdog and process isolation. A program
 * that loops forever will hang the thread that runs it, and a program that misbehaves can
 * affect its host — acceptable only for authored content.
 */
export class DirectRuntime {
  private impl: ReturnType<typeof createProgram>;
  private program?: DilProgram;
  private snapshot?: DirectSnapshot;
  private state: Record<string, unknown>;

  // Node's strip-only loader runs the worker engine directly in tests, so no TypeScript
  // parameter properties here (they need the transform mode, not the strip mode).
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
    this.impl = createProgram(this.state);
  }

  /**
   * Run the program once, synchronously, and return the snapshot. `undefined` means this
   * revision could not run (the caller renders its fallback); the previous snapshot, if
   * any, stays in place until a later revision succeeds. Re-evaluating the same program
   * reference returns the cached result without touching the runner.
   */
  evaluate(program: DilProgram): DirectSnapshot | undefined {
    if (program === this.program) return this.snapshot;
    try {
      const result = this.impl.load(program);
      this.program = program;
      this.snapshot = { tree: readTree(result.tree, program.data), errors: result.errors };
      this.state = readViewState(result.state);
      this.probeIntents(program, result.state, result.buttons);
      return this.snapshot;
    } catch {
      return undefined;
    }
  }

  update(program: DilProgram | undefined): void {
    if (!program || program === this.program) return;
    const snapshot = this.evaluate(program);
    if (snapshot !== undefined) this.onTree(snapshot.tree, snapshot.errors);
  }

  invoke(handler: DilHandler, args: unknown[] = [], onSend?: () => void): Promise<void> {
    const program = this.program;
    if (!program) return Promise.resolve();
    const result = this.impl.trigger(handler.id, args);
    if (!result) return Promise.resolve();
    this.snapshot = { tree: readTree(result.tree, program.data), errors: result.errors };
    const nextState = readViewState(result.state);
    // Only user interactions report state changes — streaming re-loads never do, so a
    // host persisting snapshots is not rewritten on every token.
    if (this.onViewStateChange && JSON.stringify(this.state) !== JSON.stringify(nextState)) {
      this.state = nextState;
      this.onViewStateChange({ root: nextState });
    } else {
      this.state = nextState;
    }
    this.onTree(this.snapshot.tree, this.snapshot.errors);
    this.probeIntents(program, result.state, result.buttons);
    // An effect (GenUI.issueNewTurn) without a live host is silently dropped: a static
    // blog has no conversation to continue, and a busy host could not accept it anyway.
    const prompt = typeof result.effects[0] === "string" ? result.effects[0].trim() : "";
    const host = prompt ? this.getHost() : null;
    if (!host || host.busy) return Promise.resolve();
    onSend?.();
    return Promise.resolve(host.issueNewTurn(prompt));
  }

  /** There is nothing to boot or pause: evaluation is synchronous and cheap. */
  setVisible(_visible: boolean): void {}

  stop(): void {}

  /**
   * Mirror the sandbox's intent probe: which buttons would issue a new turn if clicked.
   * Each candidate runs against a throwaway copy of the runner so the live state is
   * never touched by the probe.
   */
  private probeIntents(program: DilProgram, state: Record<string, unknown>, buttons: readonly string[]): void {
    this.onIntents(
      new Set(
        buttons.filter((id) => {
          try {
            const specimen = createProgram(structuredClone(readViewState(state)));
            specimen.load(program);
            return specimen.probe(id);
          } catch {
            return false;
          }
        }),
      ),
    );
  }
}
