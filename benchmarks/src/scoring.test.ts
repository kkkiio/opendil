import assert from "node:assert/strict";
import test from "node:test";
import { DIL_CASES } from "./cases.ts";
import {
  anyTag,
  attributeContains,
  type CaseCheck,
  cleanDiagnostics,
  compilesAndRuns,
  contextOf,
  either,
  hasAnyTag,
  hasEach,
  hasIf,
  hasStateDeclaration,
  hasTag,
  nested,
  noHeavyLayout,
  scoreCase,
} from "./scoring.ts";

const PROSE = `这个问题可以从几个角度解释。首先是直觉层面，其次是工程权衡，最后是结论。\n\n- 第一点\n- 第二点\n\n总的来说，需要根据场景选择。`;

/**
 * The check machinery is tested on synthetic snippets only — never on answers to the
 * benchmark prompts. Every check must be satisfiable (some generic DIL passes it) and
 * discriminating (plain prose fails it), so a high benchmark score still means the model
 * actually produced the construct the check asks for.
 */
function satisfiable(check: CaseCheck): void {
  assert.equal(check.test(contextOf(PROSE)), false, `${check.id} should reject prose`);
}

test("tag presence checks are satisfiable and discriminate", () => {
  const box = hasTag("box", { atLeast: 2, label: "至少两个 <box>" });
  assert.equal(box.test(contextOf("<box>a</box><box>b</box>")), true);
  assert.equal(box.test(contextOf("<box>a</box>")), false);
  satisfiable(box);

  const any = hasAnyTag("code", { atLeast: 3, label: "至少三个 <code>" });
  assert.equal(any.test(contextOf("<code>a</code><code>b</code><code>c</code>")), true);
  assert.equal(any.test(contextOf("<code>a</code>")), false);
  satisfiable(any);

  const alt = anyTag(["grid", "svg"], { label: "<grid> 或 <svg>" });
  assert.equal(alt.test(contextOf("<grid columns={2}><text>a</text></grid>")), true);
  assert.equal(alt.test(contextOf('<svg viewBox="0 0 10 10" width="50"><rect width="10" height="10"/></svg>')), true);
  satisfiable(alt);
});

test("structural checks are satisfiable and discriminate", () => {
  const nesting = nested("box", "box", "嵌套 <box>");
  assert.equal(nesting.test(contextOf("<box><box>inner</box></box>")), true);
  assert.equal(nesting.test(contextOf("<box>flat</box>")), false);
  satisfiable(nesting);

  const arrow = attributeContains("icon", "name", "arrow", "方向图标");
  assert.equal(arrow.test(contextOf('<icon name="arrow-right"/>')), true);
  assert.equal(arrow.test(contextOf('<icon name="github"/>')), false);
  satisfiable(arrow);

  const choice = either([hasTag("box", { label: "<box>" }), hasTag("svg", { label: "<svg>" })], "box 或 svg");
  assert.equal(choice.test(contextOf("<box>x</box>")), true);
  assert.equal(choice.test(contextOf("<text>neither</text>")), false);
  satisfiable(choice);
});

test("control-flow checks are satisfiable and discriminate", () => {
  const branch = hasIf("条件分支");
  assert.equal(branch.test(contextOf("{#if 1 > 0}<text>yes</text>{/if}")), true);
  satisfiable(branch);

  const loop = hasEach("循环");
  assert.equal(loop.test(contextOf("{#each [1, 2] as n}<text>{n}</text>{/each}")), true);
  satisfiable(loop);

  const state = hasStateDeclaration("状态声明");
  assert.equal(state.test(contextOf("{@body const [n, setN] = DIL.useState(0)}<text>{n}</text>")), true);
  satisfiable(state);
});

test("pipeline checks are satisfiable and discriminate", () => {
  // Diagnostics-free prose is legitimate input, so the discriminating case here is a
  // malformed snippet, not prose.
  const clean = cleanDiagnostics("解析无诊断");
  assert.equal(clean.test(contextOf("<box border>clean</box>")), true);
  assert.equal(clean.test(contextOf("{#if 1 > 0}<text>unterminated")), false);

  // Prose compiles too — a broken program is the discriminating input.
  const runs = compilesAndRuns("编译与执行通过");
  assert.equal(runs.test(contextOf("<box border>compiles</box>")), true);
  assert.equal(runs.test(contextOf("{@body throw new Error('boom')}<text>broken</text>")), false);
});

test("cases fail on plain prose", () => {
  for (const scenario of DIL_CASES) {
    const result = scoreCase(scenario, PROSE);
    assert.ok(result.score < 50, `${scenario.id} should not pass on prose, scored ${result.score}%`);
    assert.equal(result.dilNodes, 0);
  }
});

test("fenced DIL does not count as real DIL", () => {
  const fenced = `\`\`\`jsx\n<box padding={2}><row><badge>边界</badge></row></box>\n\`\`\``;
  const scenario = DIL_CASES[0];
  assert.ok(scenario);
  const result = scoreCase(scenario, fenced);
  assert.equal(result.dilNodes, 0);
  assert.ok(result.score < 50);
});

test("noHeavyLayout allows light icon/badge accents while rejecting heavy chrome", () => {
  const check = noHeavyLayout("无重型布局");
  assert.equal(check.test(contextOf(`<badge color="warning">注意</badge> 改写后的代码如下：`)), true);
  assert.equal(check.test(contextOf(`<grid columns={2}><box>A</box><box>B</box></grid>`)), false);
  assert.equal(check.test(contextOf(`<box><box>Nested</box></box>`)), false);
});
