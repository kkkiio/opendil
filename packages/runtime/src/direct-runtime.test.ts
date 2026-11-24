import assert from "node:assert/strict";
import test from "node:test";
import { compileDil, type DilHandler, parseDocument, type ResolvedNode } from "@opendil/core";
import { DirectRuntime } from "./direct-runtime.ts";

const counter = [
  "{@body const [count, setCount] = DIL.useState(0)}",
  "<button onClick={() => setCount(count + 1)}>{count}</button>",
].join("\n");

function engine() {
  const trees: (readonly ResolvedNode[] | undefined)[] = [];
  const intents: ReadonlySet<string>[] = [];
  const runtime = new DirectRuntime(
    (tree) => trees.push(tree),
    (sends) => intents.push(sends),
    () => null,
  );
  return { runtime, trees, intents };
}

function programOf(source: string) {
  return compileDil(parseDocument(source, { isStreaming: false })).program;
}

function textOf(nodes: readonly ResolvedNode[]): string {
  return nodes.map((node) => (node.kind === "text" ? node.value : textOf(node.children))).join("");
}

function find(nodes: readonly ResolvedNode[], name: string): ResolvedNode | undefined {
  for (const node of nodes) {
    if (node.kind !== "element") continue;
    if (node.name === name) return node;
    const nested = find(node.children, name);
    if (nested) return nested;
  }
  return undefined;
}

test("evaluate resolves dynamic content synchronously", () => {
  const { runtime } = engine();
  const tree = runtime.evaluate(programOf("{#each ['写代码', '跑测试'] as task}<text>{task}</text>{/each}"));
  assert.ok(tree);
  assert.equal(textOf(tree), "写代码跑测试");
});

test("evaluate caches the tree for the same program reference", () => {
  const { runtime } = engine();
  const program = programOf("<text>{1 + 1}</text>");
  assert.equal(runtime.evaluate(program), runtime.evaluate(program));
});

test("update emits the new tree and skips already-evaluated revisions", () => {
  const { runtime, trees } = engine();
  const first = programOf("{#each ['a'] as x}<text>{x}</text>{/each}");
  runtime.update(first);
  assert.equal(trees.length, 1);
  runtime.update(first); // same reference: no second evaluation
  assert.equal(trees.length, 1);
  runtime.update(programOf("{#each ['a', 'b'] as x}<text>{x}</text>{/each}"));
  assert.equal(trees.length, 2);
  assert.equal(textOf(trees[1] ?? []), "ab");
});

test("a program that throws yields undefined and keeps the previous tree", () => {
  const { runtime, trees } = engine();
  runtime.update(programOf("<text>好</text>"));
  assert.equal(runtime.evaluate(programOf("{@body throw new Error('boom')}<text>坏</text>")), undefined);
  assert.equal(trees.length, 1); // the failed revision never replaces the live one
});

test("invoke runs a handler and publishes the updated tree", () => {
  const { runtime, trees } = engine();
  runtime.update(programOf(counter));
  const button = find(trees[0] ?? [], "button");
  assert.ok(button?.kind === "element");
  const handler = button.props.onClick as DilHandler;
  assert.ok(handler?.id);
  void runtime.invoke(handler);
  assert.equal(trees.length, 2);
  assert.equal(textOf(trees[1] ?? []), "1");
});

test("state slots survive re-compiled revisions (streaming)", () => {
  const { runtime, trees } = engine();
  runtime.update(programOf(counter));
  const button = find(trees[0] ?? [], "button");
  assert.ok(button?.kind === "element");
  void runtime.invoke(button.props.onClick as DilHandler);
  // Stream the next revision of the same document: the count must persist.
  runtime.update(programOf([counter, "<text>tail</text>"].join("\n")));
  assert.equal(textOf(trees.at(-1) ?? []), "1tail");
});

test("GenUI buttons are flagged as send intents and dropped without a host", async () => {
  const { runtime, intents, trees } = engine();
  const source = "<button onClick={() => GenUI.issueNewTurn('继续')}>继续</button>";
  runtime.update(programOf(source));
  const button = find(trees[0] ?? [], "button");
  assert.ok(button?.kind === "element");
  const handler = button.props.onClick as DilHandler;
  assert.ok(handler?.id);
  assert.ok(intents.at(-1)?.has(handler.id), "the GenUI button must be flagged as a send intent");
  await runtime.invoke(handler); // no host: silently dropped, not thrown
});
