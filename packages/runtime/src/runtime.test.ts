import assert from "node:assert/strict";
import test from "node:test";
import { compileDil, type DilHandler, parseDocument, type ResolvedNode } from "@kkkiio/dil-core";
import { createExecutor } from "./sandbox-worker.cjs";

const card = [
  '{@body const [choice, setChoice] = DIL.useState("A", { key: "option" })}',
  "{@body const [count, setCount] = DIL.useState(0)}",
  '{@body const [details, setDetails] = DIL.useState("")}',
  '<radio-group value={choice} onChange={setChoice}><radio value="A">A</radio></radio-group>',
  "<textarea value={details} onChange={setDetails}/>",
  "<button onClick={() => setCount(previous => previous + 1)}>{count}</button>",
  '<button onClick={() => GenUI.issueNewTurn(choice + ": " + details)}>Send</button>',
].join("\n");

type Executor = ReturnType<typeof createExecutor>;

function artifactOf(source: string) {
  return compileDil(parseDocument(source));
}

function find(nodes: readonly ResolvedNode[], name: string): ResolvedNode[] {
  const out: ResolvedNode[] = [];
  for (const node of nodes) {
    if (node.kind !== "element") continue;
    if (node.name === name) out.push(node);
    out.push(...find(node.children, name));
  }
  return out;
}

function load(source: string, executor: Executor = createExecutor()) {
  let result = executor.load(artifactOf(source));
  return {
    get result() {
      return result;
    },
    fire(tag: string, event: "onClick" | "onChange", args: unknown[] = [], index = 0) {
      const control = find(result.tree, tag)[index];
      assert.ok(control?.kind === "element");
      const handler = control.props[event] as DilHandler;
      assert.ok(handler?.id);
      const next = executor.trigger(handler.id, args);
      assert.ok(next);
      result = next;
      return next;
    },
  };
}

test("state initializers, explicit keys, and functional updates match the card", () => {
  const session = load(card);
  assert.deepEqual(session.result.state, { option: "A", count: 0, details: "" });
  session.fire("button", "onClick");
  session.fire("button", "onClick");
  assert.equal(session.result.state.count, 2);
});

test("ordered form events submit exactly the latest value", () => {
  const session = load(card);
  session.fire("radio-group", "onChange", ["B"]);
  session.fire("textarea", "onChange", ["detail"]);
  session.fire("textarea", "onChange", ["latest detail"]);
  assert.deepEqual(session.fire("button", "onClick", [], 1).effects, ["B: latest detail"]);
});

test("streaming and recreating the runner preserve state while a fresh page starts over", () => {
  const executor = createExecutor();
  const session = load(card, executor);
  session.fire("radio-group", "onChange", ["B"]);
  session.fire("textarea", "onChange", ["typed"]);
  const updated = load(`${card}\n<text>{choice}</text>`, executor);
  assert.deepEqual(updated.result.state, { option: "B", count: 0, details: "typed" });
  const restored = load(card, createExecutor(updated.result.state));
  assert.deepEqual(restored.fire("button", "onClick", [], 1).effects, ["B: typed"]);
  assert.equal(load(card).result.state.option, "A");
});

test("a streamed state declaration only initializes its slot when it is complete", () => {
  assert.throws(() => load("{@body const [n, setN] = DIL.useState( }<text>{n}</text>").result);
  assert.deepEqual(load("{@body const [n, setN] = DIL.useState(5)}<text>{n}</text>").result.state, { n: 5 });
});

test("rendering never starts a user turn or applies a setter", () => {
  const session = load(
    [
      "{@body const [n, setN] = DIL.useState(0)}",
      '<text>{GenUI.issueNewTurn("unexpected")}</text>',
      "<text>{setN(99)}</text>",
      "<button onClick={() => setN(1)}>Local</button>",
      '<button onClick={() => GenUI.issueNewTurn("explicit click")}>Send</button>',
    ].join("\n"),
  );
  assert.deepEqual(session.result.effects, []);
  assert.equal(session.result.state.n, 0);
  const local = session.fire("button", "onClick");
  assert.deepEqual(local.effects, []);
  assert.equal(local.state.n, 1);
  assert.deepEqual(session.fire("button", "onClick", [], 1).effects, ["explicit click"]);
});

test("button intent follows the current state and calls through aliases", () => {
  const source = [
    "{@body const [revealed, setRevealed] = DIL.useState(false)}",
    '{@body const send = () => GenUI.issueNewTurn("continue")}',
    "<button onClick={() => revealed ? send() : setRevealed(true)}>Continue</button>",
  ].join("\n");
  const artifact = artifactOf(source);
  const active = load(source);
  const preview = createExecutor(active.result.state);
  const before = preview.load(artifact);
  assert.equal(preview.probe(before.buttons[0]), false);
  assert.deepEqual(active.result.state, { revealed: false });

  assert.deepEqual(active.fire("button", "onClick").effects, []);
  const after = createExecutor(active.result.state);
  const ready = after.load(artifact);
  assert.equal(after.probe(ready.buttons[0]), true);
  assert.deepEqual(active.result.effects, []);
  assert.deepEqual(active.fire("button", "onClick").effects, ["continue"]);
});

test("the visible button still works when a new revision fails to load", () => {
  const executor = createExecutor();
  const session = load(card, executor);
  const artifact = artifactOf(card);
  for (const code of ["const broken =", 'throw new Error("broken revision")']) {
    assert.throws(() => executor.load({ ...artifact, code, constants: {} }));
    session.fire("button", "onClick");
  }
  assert.equal(session.result.state.count, 2);
});

test("a failed interaction leaves the visible controls available", () => {
  const executor = createExecutor();
  const session = load(
    [
      "{@body const [broken, setBroken] = DIL.useState(false)}",
      '{@body if (broken) throw new Error("broken render")}',
      "<button onClick={() => setBroken(true)}>Try again</button>",
      '<button onClick={() => GenUI.issueNewTurn("continue")}>Continue</button>',
    ].join("\n"),
    executor,
  );
  assert.equal(executor.trigger(session.result.buttons[0]), null);
  assert.deepEqual(session.fire("button", "onClick", [], 1).effects, ["continue"]);
});
