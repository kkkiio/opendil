/**
 * The executor's binding conventions.
 *
 * A compiled DIL program is ordinary JavaScript: `const [choice, setChoice] =
 * DIL.useState(...)` creates a real `const` of the render pass, and a handler is a
 * closure over that binding. Two consequences follow from the language, not from us, and
 * the executor must honor both:
 *
 *   - a handler that writes a slot then reads it in the same call sees the *old* value;
 *   - the same holds inside an `{#each}` body — every iteration closes over the same
 *     render-pass binding.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { compileDil, type DilHandler, parseDocument, type ResolvedNode } from "@kkkiio/dil-core";
import { createExecutor } from "./sandbox-worker.cjs";

function trigger(source: string, tag: string, index = 0) {
  const executor = createExecutor();
  const result = executor.load(compileDil(parseDocument(source)));
  const control = collect(result.tree, tag)[index];
  assert.ok(control?.kind === "element", `no <${tag}> at index ${index}`);
  const handler = control.props.onClick as DilHandler | undefined;
  assert.ok(handler?.id, `the control has no onClick handler`);
  const next = executor.trigger(handler.id);
  assert.ok(next, "triggering the handler re-ran the program");
  return { effects: next.effects, state: next.state };
}

function collect(nodes: readonly ResolvedNode[], name: string): ResolvedNode[] {
  const out: ResolvedNode[] = [];
  for (const node of nodes) {
    if (node.kind !== "element") continue;
    if (node.name === name) out.push(node);
    out.push(...collect(node.children, name));
  }
  return out;
}

test("a handler that writes then reads inside one click sees the old value", () => {
  const source = [
    '{@body const [choice, setChoice] = DIL.useState("B", { key: "choice" })}',
    '<button onClick={() => { setChoice("C"); GenUI.issueNewTurn(choice) }}>send</button>',
  ].join("\n");
  const { effects, state } = trigger(source, "button");
  assert.deepEqual(effects, ["B"], "the handler closed over the value of its render pass");
  assert.deepEqual(state, { choice: "C" }, "the write still landed");
});

test("the same binding convention holds inside an {#each} body", () => {
  const source = [
    '{@body const [choice, setChoice] = DIL.useState("B", { key: "choice" })}',
    "{#each [1, 2] as i}",
    '<button onClick={() => { setChoice("C"); GenUI.issueNewTurn(choice) }}>send</button>',
    "{/each}",
  ].join("\n");
  for (const index of [0, 1]) {
    const { effects, state } = trigger(source, "button", index);
    assert.deepEqual(effects, ["B"], `iteration ${index} closed over the render-pass binding`);
    assert.deepEqual(state, { choice: "C" });
  }
});
