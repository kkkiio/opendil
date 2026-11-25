import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compileDil, type DilHandler, parseDocument, type ResolvedNode } from "@kkkiio/dil-core";
import { createExecutor } from "../src/sandbox-worker.cjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const scenario = resolve(root, "conformance/scenarios/quiz-radio-reveal");
const source = readFileSync(resolve(scenario, "quiz-radio-reveal.dil.md"), "utf8");
const data = JSON.parse(readFileSync(resolve(scenario, "quiz-radio-reveal.data.json"), "utf8")) as {
  readonly constants: Readonly<Record<string, unknown>>;
};

const widgetIds = Object.entries(data.constants)
  .filter(([, value]) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(value))
  .sort(([a], [b]) => Number(a) - Number(b))
  .map(([, value]) => value as string);
assert.equal(widgetIds.length, 11, "the captured scenario allocates 11 widget ids");

let cursor = 0;
const artifact = compileDil(parseDocument(source, { isStreaming: false }), {
  clientWidgetTag: "__chatgptClientDefinedWidget",
  widgetIdFactory: () => widgetIds[cursor++],
  bodyIndex: 2,
});

const executor = createExecutor({});
let result = executor.load(artifact);
assert.deepEqual(result.state, { choice: "B", revealed: false });
assert.equal(cursor, 11, "every captured widget id was replayed");

function nodes(): readonly ResolvedNode[] {
  return result.tree;
}

function find(name: string): ResolvedNode & { kind: "element" } {
  const walk = (list: readonly ResolvedNode[]): (ResolvedNode & { kind: "element" }) | undefined => {
    for (const node of list) {
      if (node.kind !== "element") continue;
      if (node.name === name) return node;
      const nested = walk(node.children);
      if (nested) return nested;
    }
    return undefined;
  };
  const found = walk(nodes());
  assert.ok(found, `no <${name}> element in the rendered tree`);
  return found;
}

function text(list: readonly ResolvedNode[] = nodes()): string {
  return list.map((node) => (node.kind === "text" ? node.value : text(node.children))).join("");
}

const button = find("button");
const onClick = button.props.onClick as DilHandler;
assert.ok(onClick?.id);
const revealed = executor.trigger(onClick.id, []);
assert.ok(revealed);
result = revealed;
assert.deepEqual(result.state, { choice: "B", revealed: true });
assert.match(text(), /回答正确/);

const radioGroup = find("radio-group");
const onChange = radioGroup.props.onChange as DilHandler;
assert.ok(onChange?.id);
const retracted = executor.trigger(onChange.id, ["A"]);
assert.ok(retracted);
result = retracted;
assert.deepEqual(result.state, { choice: "A", revealed: false });
assert.doesNotMatch(text(), /回答正确/);

console.log("smoke: quiz-radio-reveal passed");
