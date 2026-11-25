import assert from "node:assert/strict";
import test from "node:test";
import { splitEachClause, splitStatements } from "./index.ts";

test("splits {@body} statements only at top-level semicolons", () => {
  assert.deepEqual(splitStatements('const a = {x:1;}; const b = "a;b"'), ["const a = {x:1;}", 'const b = "a;b"']);
  assert.deepEqual(splitStatements(" const a = 1 ; "), ["const a = 1"]);
  assert.deepEqual(splitStatements(""), []);
});

test("loop clauses accept JavaScript binding patterns and keep DIL's optional index", () => {
  const expression = '(rows.filter(row => / as /.test(row.name))) as { ["name"]: title = "x" }, i';
  assert.deepEqual(splitEachClause(expression), {
    list: "(rows.filter(row => / as /.test(row.name)))",
    pattern: '{ ["name"]: title = "x" }, i',
    item: '{ ["name"]: title = "x" }',
    index: "i",
  });
  assert.equal(splitEachClause("rows trailing as row"), null);
  assert.equal(splitEachClause("rows as row,"), null);
});
