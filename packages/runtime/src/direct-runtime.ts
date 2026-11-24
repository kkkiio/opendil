import type { DilHandler, DilProgram, ResolvedNode } from "@opendil/core";
import { readTree, readViewState } from "@opendil/core";
import type { DilHost } from "./runtime.ts";
import { createProgram } from "./sandbox-worker.cjs";

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
 * The four public methods mirror `DilSandbox`, so a renderer can swap the two without
 * touching any other code. What is deliberately absent: the watchdog and process
 * isolation. A program that loops forever will hang the thread that runs it, and a
 * program that misbehaves can affect its host — acceptable only for authored content.
 */
export class DirectRuntime {
  private impl = createProgram();
  private program?: DilProgram;
  private tree?: readonly ResolvedNode[];

  // Node's strip-only loader runs the worker engine directly in tests, so no TypeScript
  // parameter properties here (they need the transform mode, not the strip mode).
  private readonly onTree: (tree: readonly ResolvedNode[]) => void;
  private readonly onIntents: (sends: ReadonlySet<string>) => void;
  private readonly getHost: () => DilHost | null;

  constructor(
    onTree: (tree: readonly ResolvedNode[]) => void,
    onIntents: (sends: ReadonlySet<string>) => void,
    getHost: () => DilHost | null,
  ) {
    this.onTree = onTree;
    this.onIntents = onIntents;
    this.getHost = getHost;
  }

  /**
   * Run the program once, synchronously, and return the resolved tree. `undefined` means
   * this revision could not run (the caller renders its fallback); the previous tree, if
   * any, stays in place until a later revision succeeds. Re-evaluating the same program
   * reference returns the cached tree without touching the runner.
   */
  evaluate(program: DilProgram): readonly ResolvedNode[] | undefined {
    if (program === this.program) return this.tree;
    try {
      const result = this.impl.load(program);
      this.program = program;
      this.tree = readTree(result.tree, program.data);
      this.probeIntents(program, result.state, result.buttons);
      return this.tree;
    } catch {
      return undefined;
    }
  }

  update(program: DilProgram | undefined): void {
    if (!program || program === this.program) return;
    const tree = this.evaluate(program);
    if (tree !== undefined) this.onTree(tree);
  }

  invoke(handler: DilHandler, args: unknown[] = [], onSend?: () => void): Promise<void> {
    const program = this.program;
    if (!program) return Promise.resolve();
    const result = this.impl.trigger(handler.id, args);
    if (!result) return Promise.resolve();
    this.tree = readTree(result.tree, program.data);
    this.onTree(this.tree);
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
