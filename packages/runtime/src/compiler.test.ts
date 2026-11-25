import assert from "node:assert/strict";
import test from "node:test";
import { compileDil, parseDocument, type ResolvedNode } from "@kkkiio/dil-core";
import { createExecutor } from "./sandbox-worker.cjs";

function count(nodes: readonly ResolvedNode[]): number {
  let total = 0;
  for (const node of nodes) {
    total += 1;
    if (node.kind === "element") total += count(node.children);
  }
  return total;
}

test("large plain Markdown evaluates intact up to the transfer budget", () => {
  // Every document is now a program, so plain text is bounded by the worker budget that
  // guards against runaway model output. The boundary is exact: 1,000,000 chars pass,
  // one more would drop the overflowing text node.
  const source = "a".repeat(1_000_000);
  const rendered = text(resolved(source));
  assert.equal(rendered.length, source.length);
  assert.equal(rendered, source);
});

test("nested loops cannot expand without bound", () => {
  const source =
    "{#each Array.from({ length: 400 }) as r}{#each Array.from({ length: 400 }) as c}<text>x</text>{/each}{/each}";
  // 400 × 400 = 160k nodes overflows the executor's tree budget, so the load fails and
  // the engine keeps its previous tree rather than hanging or exhausting memory.
  assert.throws(() => createExecutor().load(compileDil(parseDocument(source))));
});

test("a large but legitimate loop still renders", () => {
  const source = "{#each Array.from({ length: 300 }, (_, i) => i) as i}<text>{i}</text>{/each}";
  const tree = resolved(source);
  // One `<text>` element plus its interpolated text node per item.
  assert.equal(count(tree), 600);
});

function resolved(source: string): readonly ResolvedNode[] {
  const compiled = compileDil(parseDocument(source));
  return createExecutor().load(compiled).tree;
}

function text(nodes: readonly ResolvedNode[]): string {
  return nodes.map((node) => (node.kind === "text" ? node.value : text(node.children))).join("");
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

test("each repeats its body with item and index bound", () => {
  const nodes = resolved("{#each ['a', 'b'] as item, i}<text>{i}:{item}</text>{/each}");
  assert.equal(find(nodes, "text").length, 2);
  assert.equal(text(nodes), "0:a1:b");
});

test("each reads its list from the statement scope and supports expressions", () => {
  const filtered = resolved(
    "{@body const items = [{ n: 1 }, { n: 2 }, { n: 3 }]}{#each items.filter(m => m.n > 1) as m}<text>{m.n}</text>{/each}",
  );
  assert.equal(text(filtered), "23");
});

test("nested each sees both frames", () => {
  const nodes = resolved(
    "{@body const groups = [{ xs: [1, 2] }, { xs: [3] }]}{#each groups as group, g}{#each group.xs as x}<text>{g}.{x};</text>{/each}{/each}",
  );
  assert.equal(text(nodes), "0.1;0.2;1.3;");
});

test("if/else picks the first true branch and falls back to false on failure", () => {
  const shown = resolved("{#if 1 < 2}yes{:else}no{/if}");
  assert.equal(text(shown), "yes");
  const hidden = resolved("{#if 1 > 2}yes{:else}no{/if}");
  assert.equal(text(hidden), "no");
  const broken = resolved("{#if items.missing.deep}yes{/if}");
  assert.equal(text(broken), "");
});

test("interpolation formats values and drops the empty ones", () => {
  const nodes = resolved(
    '{@body const n = 3}{@body const empty = ""}{@body const arr = ["a", "b"]}<text>共 {n} 项{empty}{arr} 完成</text>',
  );
  assert.equal(text(nodes), "共 3 项ab 完成");
  const [span] = find(nodes, "text");
  assert.ok(span && span.kind === "element");
  // Numbers become text nodes, an empty string vanishes, and an array is flattened.
  assert.deepEqual(
    span.children.map((child) => (child.kind === "text" ? child.value : "?")),
    ["共 ", "3", " 项", "a", "b", " 完成"],
  );
});

test("attributes resolve in all four forms, with undefined on failure", () => {
  // A bare flag, a quoted string, an object literal (constant-table reference) and an
  // inline expression are the four forms the compiler lowers into jsx props.
  const [box] = find(resolved("{@body const n = 3}<box border radius='lg' data={{ a: 1 }} gap={n}>x</box>"), "box");
  assert.ok(box && box.kind === "element");
  assert.equal(box.props.border, true);
  assert.equal(box.props.radius, "lg");
  assert.deepEqual(box.props.data, { a: 1 });
  assert.equal(box.props.gap, 3);

  // An expression that evaluates to undefined drops the prop but keeps the element.
  const [kept] = find(resolved("<box gap={undefined}>y</box>"), "box");
  assert.ok(kept && kept.kind === "element");
  assert.equal(kept.props.gap, undefined);

  // One that throws takes the guarded element with it.
  assert.equal(find(resolved("<box gap={oops.missing.x}>y</box>"), "box").length, 0);
});

test("a broken expression never removes its siblings", () => {
  const nodes = resolved("<box>before</box>{oops.missing}<box>after</box>");
  assert.equal(find(nodes, "box").length, 2);
  assert.equal(text(nodes), "beforeafter");
});

test("fences become widget contracts and display math elements", () => {
  // A fenced block is no longer lowered to a code-block element: it compiles to a widget
  // contract whose null slot resolves to the client widget placeholder.
  const [widget] = find(resolved("```js\nconst a = 1\n```"), "__clientDefinedWidget");
  assert.ok(widget && widget.kind === "element");

  const [expression] = find(resolved("$$\nE = mc^2\n$$"), "math");
  assert.ok(expression && expression.kind === "element");
  assert.equal(expression.props.block, true);
  assert.equal(expression.props.value, "E = mc^2");
});

test("statements are hoisted, never rendered", () => {
  const source = "{@body const n = 2}<text>{n}</text>";
  const nodes = resolved(source);
  assert.equal(text(nodes), "2");
  assert.equal(find(nodes, "stmt").length, 0);
});

test("DIL.useState initials join the scope; the runtime supplies the real setters", () => {
  const nodes = resolved("{@body const [open, setOpen] = DIL.useState(true)}{#if open}<text>shown</text>{/if}");
  assert.equal(text(nodes), "shown");
});

test("a real DIL sample renders its each over inline data", () => {
  const source = [
    "<box gap={3}>",
    "  {#each [{name:'Claude',p:99.5},{name:'Sol',p:96.2}] as m}",
    "    <row justify='between' align='center'>",
    "      <text weight='medium' size='sm'>{m.name}</text>",
    "      <text tabularNums>{m.p.toFixed(1)}%</text>",
    "    </row>",
    "  {/each}",
    "</box>",
  ].join("\n");
  const nodes = resolved(source);
  assert.equal(find(nodes, "text").length, 4);
  assert.equal(text(nodes).replace(/\s+/g, ""), "Claude99.5%Sol96.2%");
  const [box] = find(nodes, "box");
  assert.ok(box && box.kind === "element");
  assert.equal(box.props.gap, 3);
});

test("an unclosed streaming fence compiles to a widget placeholder", () => {
  // The wire tree no longer carries a `closed` flag: a half-arrived fence compiles to the
  // same widget contract as a closed one. (The stream-frame corpus still has to confirm
  // this end to end.)
  const [widget] = find(resolved("```js\nconst a = 1"), "__clientDefinedWidget");
  assert.ok(widget && widget.kind === "element");
});

test("each supports array and object destructuring with optional index", () => {
  const arrSource =
    '{#each [["1", "preamble", 169], ["2", "tools", 339]] as [n, name, size], idx}<text>{idx}:{n}-{name}-{size}|</text>{/each}';
  assert.equal(text(resolved(arrSource)), "0:1-preamble-169|1:2-tools-339|");

  const objSource =
    '{#each [{ name: "a", pct: "10%" }, { name: "b" }] as { name: label, pct = "0%" }}<text>{label}={pct}|</text>{/each}';
  assert.equal(text(resolved(objSource)), "a=10%|b=0%|");
});
