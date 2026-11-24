import assert from "node:assert/strict";
import test from "node:test";
import { readDilViewState } from "./render-tree.ts";

test("readDilViewState accepts a plain snapshot", () => {
  const view = readDilViewState({ root: { count: 3, notes: ["a", "b"] } });
  assert.deepEqual(view, { root: { count: 3, notes: ["a", "b"] } });
});

test("readDilViewState rejects anything not shaped like a snapshot", () => {
  for (const value of [undefined, null, 0, "", [], {}, { root: null }, { root: "x" }, { root: [] }]) {
    assert.equal(readDilViewState(value), undefined, `should reject ${JSON.stringify(value)}`);
  }
});

test("readDilViewState rejects exotic prototypes and non-plain values", () => {
  class Slot {}
  assert.equal(readDilViewState({ root: new Slot() }), undefined);
  assert.equal(readDilViewState({ root: { count: new Slot() } }), undefined);
  assert.equal(readDilViewState({ root: { fn: () => 0 } }), undefined);
});

test("readDilViewState enforces its field, text, and depth budget", () => {
  // A record's entry count must fit in half the remaining field budget (40,000 total),
  // so 10,000 keys pass comfortably and 40,001 are rejected outright.
  const wide = Object.fromEntries(Array.from({ length: 10_000 }, (_, i) => [`k${i}`, i]));
  assert.ok(readDilViewState({ root: wide }));
  const tooWide = Object.fromEntries(Array.from({ length: 40_001 }, (_, i) => [`k${i}`, i]));
  assert.equal(readDilViewState({ root: tooWide }), undefined);
  // Text: 1,000,000 chars total, keys included; 999,990 + a 4-char key passes, 1,000,001 fails.
  assert.ok(readDilViewState({ root: { text: "a".repeat(999_990) } }));
  assert.equal(readDilViewState({ root: { text: "a".repeat(1_000_001) } }), undefined);
  // Depth: a value at depth 16 survives; one nested beyond it is rejected.
  let deep: Record<string, unknown> = { leaf: true };
  for (let i = 0; i < 15; i++) deep = { nested: deep };
  assert.ok(readDilViewState({ root: deep }));
  deep = { nested: deep };
  assert.equal(readDilViewState({ root: deep }), undefined);
});
