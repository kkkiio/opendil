import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
// The SSG guarantee is about the artifact a host ships, so this suite runs against the
// built `dist/` — the package script builds core, runtime, and react first.
import { DilRenderer } from "../dist/index.js";

test("direct mode bakes dynamic DIL into the server-rendered HTML", () => {
  const source = [
    "<box border padding={2}>",
    "{#each ['写代码', '跑测试'] as task, i}",
    '  <row gap={2}><badge>{i + 1}</badge><text color="secondary">{task}</text></row>',
    "{/each}",
    "</box>",
  ].join("\n");
  const html = renderToString(createElement(DilRenderer, { source, execution: "direct" }));
  assert.match(html, /写代码/);
  assert.match(html, /跑测试/);
  assert.ok(!html.includes("whitespace-pre-wrap"), "must not render the fallback shell");
});

test("direct mode resolves static documents too (single compiled shape)", () => {
  const html = renderToString(createElement(DilRenderer, { source: "普通正文段落", execution: "direct" }));
  assert.match(html, /普通正文段落/);
  assert.ok(!html.includes("whitespace-pre-wrap"));
});

test("a broken program renders its fallback instead of throwing", () => {
  const html = renderToString(
    createElement(DilRenderer, { source: "{@body throw new Error('boom')}\n\n正文", execution: "direct" }),
  );
  assert.ok(html.includes("whitespace-pre-wrap"), "the degraded markdown shell");
  assert.match(html, /正文/);
});

test("sandbox mode defers resolution to the client", () => {
  // The iframe only exists in a browser, so a static build can never resolve there —
  // the fallback ships and the sandbox upgrades it after hydration.
  const html = renderToString(createElement(DilRenderer, { source: "正文", execution: "sandbox" }));
  assert.ok(html.includes("whitespace-pre-wrap"));
});

test("the error tally lands on the root as data-dil-errors", () => {
  const html = renderToString(createElement(DilRenderer, { source: "<text>{boom()}</text>", execution: "direct" }));
  assert.match(html, /data-dil-errors="1"/);
});

test("a seeded view state restores the card before its first render", () => {
  const source = ["{@body const [count, setCount] = DIL.useState(0)}", "<text>{count}</text>"].join("\n");
  const html = renderToString(
    createElement(DilRenderer, { source, execution: "direct", viewState: { root: { count: 7 } } }),
  );
  assert.match(html, /7/);
  assert.ok(!html.includes("whitespace-pre-wrap"));
});

test("the form-control family renders: checkbox, input, form", () => {
  const source = [
    "{@body const [ok, setOk] = DIL.useState(false)}",
    "<form gap={2} onSubmit={() => setOk(true)}>",
    '<input value="备注" onChange={() => undefined} placeholder="可选"/>',
    "<checkbox checked={ok} onChange={setOk}>我已阅读</checkbox>",
    "</form>",
  ].join("\n");
  const html = renderToString(createElement(DilRenderer, { source, execution: "direct" }));
  assert.match(html, /<form/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /我已阅读/);
  assert.match(html, /placeholder="可选"/);
});

test("surface-inverted maps to the primary fill, tertiary/subtle to muted steps", () => {
  const source = [
    '<box background="surface-tertiary" height="5px" radius="full" clip>',
    '<box background="surface-inverted" width="33%" height="100%" radius="full"/>',
    "</box>",
    '<text color="tertiary">三级文字</text>',
    '<text color="subtle">更弱文字</text>',
  ].join("\n");
  const html = renderToString(createElement(DilRenderer, { source, execution: "direct" }));
  assert.match(html, /bg-primary/);
  assert.match(html, /text-muted-foreground\/80/);
  assert.match(html, /text-muted-foreground\/60/);
});

test("a multi-field form gets a submit path: buttons inside a form are submit buttons", () => {
  const source = [
    '{@body const [title, setTitle] = DIL.useState("")}',
    '{@body const [note, setNote] = DIL.useState("")}',
    '<form gap={2} onSubmit={() => setTitle("已提交")}>',
    '<input value={title} onChange={setTitle} placeholder="标题"/>',
    '<input value={note} onChange={setNote} placeholder="备注"/>',
    "<button block>提交</button>",
    "</form>",
  ].join("\n");
  const html = renderToString(createElement(DilRenderer, { source, execution: "direct" }));
  assert.match(html, /type="submit"/);
  // Outside a form the same button stays inert.
  const outside = renderToString(createElement(DilRenderer, { source: "<button>提交</button>", execution: "direct" }));
  assert.match(outside, /type="button"/);
});
