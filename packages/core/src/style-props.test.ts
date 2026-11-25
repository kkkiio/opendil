import assert from "node:assert/strict";
import test from "node:test";
import { type PropForm, STYLE_PROPS, type StylePropEntry } from "./style-props.ts";
import { DIL_VOCABULARY } from "./vocabulary.ts";

/** A sample must satisfy at least one declared form — this is what keeps the generated
 * renderer matrix test meaningful: the entry promises the value resolves. */
function sampleMatchesForm(entry: StylePropEntry): boolean {
  const { forms, values, sample } = entry;
  const ok = (form: PropForm) => {
    switch (form) {
      case "boolean":
        return typeof sample === "boolean";
      case "enum":
        return typeof sample === "string" && (values ?? []).includes(sample);
      case "scale":
      case "number":
        return typeof sample === "number" && Number.isFinite(sample);
      case "length":
        return typeof sample === "string" && /^-?\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|ch|pt)$/.test(sample);
      case "color":
        return typeof sample === "string" && (/^#[\da-f]{3,8}$/i.test(sample) || /\)\s*$/i.test(sample));
      case "object":
        return typeof sample === "object" && sample !== null && !Array.isArray(sample);
    }
  };
  return forms.some(ok);
}

test("every entry carries exactly one evidence kind: corpus, inferred, or lowered", () => {
  for (const [tag, props] of Object.entries(STYLE_PROPS)) {
    for (const [prop, entry] of Object.entries(props)) {
      assert.ok(entry.forms.length > 0, `${tag}.${prop} declares no value forms`);
      const kinds = (entry.corpus ? 1 : 0) + (entry.inferred ? 1 : 0) + (entry.lowered ? 1 : 0);
      assert.equal(kinds, 1, `${tag}.${prop} must carry exactly one evidence kind`);
      if (entry.corpus !== undefined) {
        assert.ok(entry.corpus.length > 0, `${tag}.${prop} cites an empty corpus ref list`);
      }
      if (entry.inferred) {
        assert.ok(entry.note, `${tag}.${prop} inference must state its derivation in note`);
      }
      if (entry.forms.includes("enum")) {
        assert.ok((entry.values ?? []).length > 0, `${tag}.${prop} is an enum without values`);
      } else {
        assert.equal(entry.values, undefined, `${tag}.${prop} lists values but is not an enum`);
      }
    }
  }
});

test("the sample of every entry satisfies one of its declared forms", () => {
  for (const [tag, props] of Object.entries(STYLE_PROPS)) {
    for (const [prop, entry] of Object.entries(props)) {
      assert.ok(sampleMatchesForm(entry), `${tag}.${prop} sample does not match any declared form`);
    }
  }
});

test("every table tag is a known DIL tag; enum values are unique", () => {
  for (const tag of Object.keys(STYLE_PROPS)) {
    assert.ok(tag in DIL_VOCABULARY, `${tag} is not in the tag vocabulary`);
  }
  for (const [tag, props] of Object.entries(STYLE_PROPS)) {
    for (const [prop, entry] of Object.entries(props)) {
      if (entry.values) {
        assert.equal(new Set(entry.values).size, entry.values.length, `${tag}.${prop} lists duplicate values`);
      }
      assert.ok(typeof entry.sample !== "function", `${tag}.${prop} sample must be data, not code`);
    }
  }
});
