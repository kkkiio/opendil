/**
 * The streaming path compiles a growing message revision by revision. Batch grouping is a
 * shape the compiled program carries, never a shape the reader sees: the same source must
 * resolve to the same card whether it arrived in one piece or in twenty.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { DilRenderer } from "../dist/index.js";

const SOURCE = [
  "# 标题",
  "",
  "第一段。",
  "",
  "第二段。",
  "",
  "<box border padding={2}>",
  '  <list marker="bullet">',
  "    <list-item>一条清单</list-item>",
  "  </list>",
  "</box>",
  "",
  "最后一段。",
].join("\n");

function render(source: string, isStreaming: boolean): string {
  return renderToString(createElement(DilRenderer, { source, isStreaming, execution: "direct" }));
}

test("a streamed message renders what the finished message renders", () => {
  assert.equal(render(SOURCE, true), render(SOURCE, false));
});

test("every revision of a streamed message renders", () => {
  for (let end = 1; end <= SOURCE.length; end++) {
    const html = render(SOURCE.slice(0, end), true);
    assert.ok(html.length > 0, `empty card at ${end}`);
    assert.ok(!html.includes('data-dil-errors="1"'), `compile error at ${end}`);
  }
});
