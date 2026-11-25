/**
 * The renderer matrix: the implementation's acceptance is locked to `STYLE_PROPS`.
 *
 *   accept  every (tag, prop) the table declares must visibly resolve — a sample that
 *           changes nothing means the renderer silently drops a spec'd attribute
 *   gate     every style prop from another tag's table must be inert on tags that do
 *           not declare it — the per-tag gating policy (surface props box-exclusive in
 *           the captured dialect, `border` famously so) enforced mechanically
 */

import assert from "node:assert/strict";
import test from "node:test";
import { STYLE_PROPS } from "@kkkiio/dil-core";
import { layoutSkin, type Skin, type SkinProps, textSkin } from "./tokens.ts";

const LAYOUT = new Set(["box", "row", "col", "grid", "grid-item", "list", "table-cell", "divider"]);

function skin(tag: string, props: SkinProps): Skin {
  return LAYOUT.has(tag) ? layoutSkin(tag, props) : textSkin(tag, props);
}

function differs(a: Skin, b: Skin): boolean {
  return a.className !== b.className || JSON.stringify(a.style) !== JSON.stringify(b.style);
}

test("accept matrix: every table entry's sample visibly resolves", () => {
  for (const [tag, props] of Object.entries(STYLE_PROPS)) {
    const empty = skin(tag, {});
    for (const [prop, entry] of Object.entries(props)) {
      const withSample = skin(tag, { [prop]: entry.sample });
      assert.ok(
        differs(withSample, empty),
        `${tag}.${prop} sample resolves to nothing — the table promises more than the renderer delivers`,
      );
    }
  }
});

test("gate matrix: style props stay inert on tags that do not declare them", () => {
  const samples = new Map<string, unknown>();
  for (const props of Object.values(STYLE_PROPS)) {
    for (const [prop, entry] of Object.entries(props)) {
      if (!samples.has(prop)) samples.set(prop, entry.sample);
    }
  }
  for (const tag of Object.keys(STYLE_PROPS)) {
    const declared = STYLE_PROPS[tag];
    const empty = skin(tag, {});
    for (const [prop, sample] of samples) {
      if (prop in declared) continue;
      assert.ok(!differs(skin(tag, { [prop]: sample }), empty), `${tag} accepts ${prop} outside the style-props table`);
    }
  }
});
