import assert from "node:assert/strict";
import test from "node:test";
import { compileDil, type DilHandler, parseDocument, type ResolvedNode, readDilViewState } from "@kkkiio/dil-core";
import { DirectRuntime } from "./direct-runtime.ts";

const counter = [
  "{@body const [count, setCount] = DIL.useState(0)}",
  "<button onClick={() => setCount(count + 1)}>{count}</button>",
].join("\n");

function engine(viewState?: ReturnType<typeof readDilViewState>) {
  const trees: { tree: readonly ResolvedNode[]; errors: number }[] = [];
  const intents: ReadonlySet<string>[] = [];
  const viewStates: unknown[] = [];
  const runtime = new DirectRuntime(
    (tree, errors) => trees.push({ tree, errors }),
    (sends) => intents.push(sends),
    () => null,
    viewState,
    (next) => viewStates.push(next),
  );
  return { runtime, trees, intents, viewStates };
}

function programOf(source: string) {
  return compileDil(parseDocument(source, { isStreaming: false }));
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
  const snapshot = runtime.evaluate(programOf("{#each ['写代码', '跑测试'] as task}<text>{task}</text>{/each}"));
  assert.ok(snapshot);
  assert.equal(textOf(snapshot.tree), "写代码跑测试");
});

test("evaluate counts broken expressions and rejects syntactically broken statements", () => {
  const { runtime } = engine();
  const runtimeOnly = runtime.evaluate(programOf("<text>{undefinedFunction()}</text>"));
  assert.ok(runtimeOnly);
  assert.equal(runtimeOnly.errors, 1); // the expression threw at render time
  const syntax = runtime.evaluate(programOf("{@body const = broken}<text>still renders</text>"));
  assert.equal(syntax, undefined);
});

test("evaluate caches the snapshot for the same program reference", () => {
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
  assert.equal(textOf(trees[1]?.tree ?? []), "ab");
});

test("a program that throws yields undefined and keeps the previous tree", () => {
  const { runtime, trees } = engine();
  runtime.update(programOf("<text>好</text>"));
  assert.equal(runtime.evaluate(programOf("{@body throw new Error('boom')}<text>坏</text>")), undefined);
  assert.equal(trees.length, 1); // the failed revision never replaces the live one
});

test("invoke runs a handler, publishes the updated tree, and reports the state change", async () => {
  const { runtime, trees, viewStates } = engine();
  runtime.update(programOf(counter));
  const button = find(trees[0]?.tree ?? [], "button");
  assert.ok(button?.kind === "element");
  const handler = button.props.onClick as DilHandler;
  assert.ok(handler?.id);
  await runtime.invoke(handler);
  assert.equal(trees.length, 2);
  assert.equal(textOf(trees[1]?.tree ?? []), "1");
  assert.deepEqual(viewStates, [{ root: { count: 1 } }]);
});

test("state slots survive re-compiled revisions (streaming never reports view state)", () => {
  const { runtime, trees, viewStates } = engine();
  runtime.update(programOf(counter));
  const button = find(trees[0]?.tree ?? [], "button");
  assert.ok(button?.kind === "element");
  void runtime.invoke(button.props.onClick as DilHandler);
  // Stream the next revision of the same document: the count must persist, and a
  // re-load that does not change state must not fire the view-state reporter.
  runtime.update(programOf([counter, "<text>tail</text>"].join("\n")));
  assert.equal(textOf(trees.at(-1)?.tree ?? []), "1tail");
  assert.equal(viewStates.length, 1);
});

test("a seeded snapshot restores state before the first evaluation", () => {
  const { runtime } = engine(readDilViewState({ root: { count: 7 } }));
  runtime.update(programOf(counter));
  const trees = runtime.evaluate(programOf(counter));
  // Same reference as the update: cached snapshot, count restored from the seed.
  assert.ok(trees);
  assert.equal(textOf(trees.tree), "7");
});

test("GenUI buttons are flagged as send intents and dropped without a host", async () => {
  const { runtime, intents, trees } = engine();
  const source = "<button onClick={() => GenUI.issueNewTurn('继续')}>继续</button>";
  runtime.update(programOf(source));
  const button = find(trees[0]?.tree ?? [], "button");
  assert.ok(button?.kind === "element");
  const handler = button.props.onClick as DilHandler;
  assert.ok(handler?.id);
  assert.ok(intents.at(-1)?.has(handler.id), "the GenUI button must be flagged as a send intent");
  await runtime.invoke(handler); // no host: silently dropped, not thrown
});

test("form onSubmit survives the wire format and runs as a handler", async () => {
  const { runtime, trees } = engine(readDilViewState({ root: { count: 0 } }));
  const source = [
    "{@body const [count, setCount] = DIL.useState(0)}",
    "<form gap={2} onSubmit={() => setCount(count + 1)}>",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: the placeholder is DIL source, not this file.
    "<input value={`第 ${count} 次`} onChange={() => undefined}/>",
    "</form>",
  ].join("\n");
  runtime.update(programOf(source));
  const form = find(trees[0]?.tree ?? [], "form");
  assert.ok(form?.kind === "element");
  const handler = form.props.onSubmit as DilHandler;
  assert.ok(handler?.id, "onSubmit must resolve as a handler object");
  await runtime.invoke(handler);
  const view = runtime.evaluate(programOf(source));
  assert.ok(view);
  const input = find(view.tree, "input");
  assert.ok(input?.kind === "element");
  assert.equal(input.props.value, "第 1 次");
});
