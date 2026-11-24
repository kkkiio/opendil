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
