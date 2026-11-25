/**
 * A session is a one-shot compile with memory: the first revision must reproduce
 * `compileDil` exactly, and later revisions settle the blocks that stopped growing into
 * the batches they arrived in.
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createCompileSession } from "./compile-session.ts";
import { compileDil } from "./compiler.ts";
import { parseDocument } from "./document.ts";

const FIXTURES = join(fileURLToPath(new URL(".", import.meta.url)), "__fixtures__");
const fixtures = readdirSync(FIXTURES)
  .filter((file) => file.endsWith(".md"))
  .sort()
  .map((file) => ({ file, source: readFileSync(join(FIXTURES, file), "utf8") }));

const GROUPS = [
  "# 标题\n\n第一段。\n",
  "# 标题\n\n第一段。\n\n第二段。\n",
  "# 标题\n\n第一段。\n\n第二段。\n\n第三段。\n",
];

function idFactory(): () => string {
  let next = 0;
  return () => `id-${next++}`;
}

function compileOnce(source: string, isStreaming: boolean): string {
  return compileDil(parseDocument(source, { isStreaming }), { widgetIdFactory: idFactory() }).code;
}

/** Split the arguments of the `__dil.jsx(...)` call that starts at `start`. */
function splitArguments(code: string, start: number): { parts: string[]; end: number } {
  const parts: string[] = [];
  let depth = 0;
  let quote = "";
  let current = "";
  let i = start;
  for (; i < code.length; i++) {
    const ch = code[i];
    if (quote) {
      current += ch;
      if (ch === "\\") {
        current += code[++i];
        continue;
      }
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      current += ch;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      if (depth === 0) break;
      depth--;
      current += ch;
      continue;
    }
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current) parts.push(current);
  return { parts, end: i };
}

/** The size of every batch group at the root, in order; a single flat batch has one entry. */
function batches(code: string): number[] {
  const returned = code.slice(code.lastIndexOf("return ") + "return ".length);
  const { parts } = splitArguments(returned, "__dil.jsx(".length);
  if (parts[0] !== "__dil.Fragment") return [1];
  const sizes: number[] = [];
  for (const child of parts.slice(2)) {
    const isGroup = child.startsWith("__dil.jsx(__dil.Fragment,null");
    if (!isGroup) {
      if (sizes.length === 0) sizes.push(1);
      else sizes[sizes.length - 1]++;
      continue;
    }
    const inner = splitArguments(child, "__dil.jsx(".length);
    sizes.push(inner.parts.length - 2);
  }
  return sizes;
}

test("the first compile reproduces the one-shot artifact", () => {
  for (const { file, source } of fixtures) {
    const streamed = createCompileSession({ widgetIdFactory: idFactory() }).compile(source);
    assert.ok(streamed.code.length > 0, `${file}: empty program`);
    assert.equal(streamed.code, compileOnce(source, true), `${file}: session differs from compileDil`);
    assert.deepEqual(batches(streamed.code), batches(compileOnce(source, true)), `${file}: batching leaked`);
  }
});

test("a settled block starts a new batch, and only one", () => {
  const session = createCompileSession({ widgetIdFactory: idFactory() });
  assert.deepEqual(batches(session.compile(GROUPS[0]).code), [2], "first revision settles nothing to split");
  assert.deepEqual(batches(session.compile(GROUPS[1]).code), [1, 2], "second paragraph opens batch 1");
  assert.deepEqual(batches(session.compile(GROUPS[2]).code), [1, 1, 2], "third paragraph opens batch 2");
});

test("growth inside the tail adds no batch", () => {
  const session = createCompileSession({ widgetIdFactory: idFactory() });
  session.compile(GROUPS[0]);
  const settled = session.compile(GROUPS[1]);
  const growing = session.compile(`${GROUPS[1]}续写`);
  assert.deepEqual(batches(growing.code), batches(settled.code), "a growing tail is not a new batch");
  assert.notDeepEqual(growing.constants, settled.constants, "the revision was not recompiled");
});

test("recompiling the same source changes nothing", () => {
  const session = createCompileSession({ widgetIdFactory: idFactory() });
  session.compile(GROUPS[0]);
  const once = session.compile(GROUPS[1]);
  const twice = session.compile(GROUPS[1]);
  assert.deepEqual(twice, once);
});

test("a source that does not extend the previous one resets the ledger", () => {
  const session = createCompileSession({ widgetIdFactory: idFactory() });
  session.compile(GROUPS[2]);
  const other = "## 另一条消息\n\n只有一段。\n";
  const artifact = session.compile(other);
  assert.deepEqual(batches(artifact.code), [2], "a new message starts a new ledger");
  assert.equal(artifact.code, compileOnce(other, true));
});

test("every revision of a growing message compiles to a running program", () => {
  const session = createCompileSession({ widgetIdFactory: idFactory() });
  for (const { file, source } of fixtures) {
    for (let end = 1; end <= source.length; end++) {
      const artifact = session.compile(source.slice(0, end));
      assert.ok(artifact.code.includes("DIL.render(__dil.jsx("), `${file}: not a program at ${end}`);
      const sizes = batches(artifact.code);
      assert.ok(
        sizes.every((size) => size > 0),
        `${file}: empty batch at ${end}`,
      );
    }
  }
});
