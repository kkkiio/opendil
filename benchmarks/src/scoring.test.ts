import assert from "node:assert/strict";
import test from "node:test";
import { DIL_CASES } from "./cases.ts";
import { IDEAL_ANSWERS } from "./ideal.ts";
import { contextOf, type DilCase, noHeavyLayout, scoreCase } from "./scoring.ts";

const PROSE = `这个问题可以从几个角度解释。首先是直觉层面，其次是工程权衡，最后是结论。\n\n- 第一点\n- 第二点\n\n总的来说，需要根据场景选择。`;

function dilCase(id: string): DilCase {
  const found = DIL_CASES.find((item) => item.id === id);
  assert.ok(found, `missing case ${id}`);
  return found;
}

test("every benchmark case is satisfied by its hand-written ideal answer", () => {
  for (const scenario of DIL_CASES) {
    const answer = IDEAL_ANSWERS[scenario.id];
    assert.ok(answer, `missing ideal answer for ${scenario.id}`);
    const result = scoreCase(scenario, answer);
    const failed = result.checks.filter((check) => !check.pass).map((check) => `${check.id}: ${check.label}`);
    assert.deepEqual(failed, [], `${scenario.id} missed checks: ${failed.join("\n")}`);
    assert.equal(result.score, 100, `${scenario.id} scored ${result.score}%`);
  }
});

test("benchmark cases fail on plain prose", () => {
  for (const scenario of DIL_CASES) {
    const result = scoreCase(scenario, PROSE);
    assert.ok(result.score < 50, `${scenario.id} should not pass on prose, scored ${result.score}%`);
    assert.equal(result.dilNodes, 0);
  }
});

test("fenced DIL does not count as real DIL", () => {
  const fenced = `\`\`\`jsx\n<box padding={2}><row><badge>边界</badge></row></box>\n\`\`\``;
  const result = scoreCase(dilCase("codemode-sandbox"), fenced);
  assert.equal(result.dilNodes, 0);
  assert.ok(result.score < 50);
});

test("noHeavyLayout allows light icon/badge accents while rejecting heavy chrome", () => {
  const check = noHeavyLayout("无重型布局");
  assert.equal(check.test(contextOf(`<badge color="warning">注意</badge> 改写后的代码如下：`)), true);
  assert.equal(check.test(contextOf(`<grid columns={2}><box>A</box><box>B</box></grid>`)), false);
  assert.equal(check.test(contextOf(`<box><box>Nested</box></box>`)), false);
});
