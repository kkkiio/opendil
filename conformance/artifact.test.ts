/**
 * The artifact-diff oracle: compileDil must reproduce the captured compiler's output
 * byte-for-byte after prettier normalization — for the program (code), the constant
 * table, and the fallback projection. Scenario inputs that are platform facts, not
 * compiler behavior, are declared per scenario: the captured internal widget tag, the
 * UUID sequence the platform allocated (replayed through the id factory for
 * determinism), and the DIL block's position in the message.
 *
 * `view_state` is excluded on principle: the runtime persists it after interaction,
 * not the compiler. A red assertion here is a working state, not an accident: the
 * compiler is being aligned to the corpus surface by surface.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileDil, parseDocument } from "@kkkiio/dil-core";
import * as prettier from "prettier";

interface Scenario {
  readonly name: string;
  readonly bodyIndex: number;
  readonly widgetIdReplay: readonly string[];
}

const SCENARIOS: readonly Scenario[] = [
  {
    name: "svg-diagram",
    bodyIndex: 0,
    widgetIdReplay: [
      "3ffebd24-1b61-5e95-8b90-4667c80853e6",
      "624eac0f-78cb-533b-95ff-98c4c916401a",
      "942d2c4a-6ecd-545a-a687-b8420b25b9e3",
      "965e8727-dd6e-5984-99ee-d31eb3b63259",
    ],
  },
  {
    name: "quiz-radio-reveal",
    bodyIndex: 2,
    widgetIdReplay: [
      "91706c45-f698-553c-b4fd-b60bb8947953",
      "9c49f3fe-7dd5-58df-9e34-edd2ddf2811d",
      "f09d8320-690d-5890-9e81-cee68fc88d53",
      "0f5b1e31-8548-5d76-994f-32a8e6371139",
      "ba51d28c-d385-56c6-b039-58651d36843f",
      "d354fd31-a44f-5df0-997a-5917eae4e26a",
      "16b69761-ae28-5fae-85ac-c1060e30bd8d",
      "07a263ba-8b70-58b8-81ff-5f7982e65230",
      "f8d6c4b8-bc32-5818-be7f-d3c50c9aad3b",
      "fa965496-d673-5350-a617-c32d1ff0042d",
      "09334759-6937-5ddc-86cb-062c9bc0adae",
    ],
  },
  {
    name: "self-check-form",
    bodyIndex: 2,
    widgetIdReplay: [
      "624eac0f-78cb-533b-95ff-98c4c916401a",
      "942d2c4a-6ecd-545a-a687-b8420b25b9e3",
      "3ffebd24-1b61-5e95-8b90-4667c80853e6",
      "965e8727-dd6e-5984-99ee-d31eb3b63259",
    ],
  },
  {
    name: "each-grid-labels",
    bodyIndex: 0,
    widgetIdReplay: [
      "624eac0f-78cb-533b-95ff-98c4c916401a",
      "942d2c4a-6ecd-545a-a687-b8420b25b9e3",
      "965e8727-dd6e-5984-99ee-d31eb3b63259",
      "f6f56486-f9e8-5487-bada-8d928fdfc15f",
      "4d343fcd-41df-5b74-81df-63c72367c41d",
      "567c4e78-901e-511d-a9d6-a65480f3d154",
      "77220593-0372-59ec-91ea-c8522e0f86d0",
      "0ee4d5fd-1bff-5946-adc9-da984efdc759",
    ],
  },
];

function load(name: string) {
  const dir = `conformance/scenarios/${name}`;
  return {
    source: readFileSync(`${dir}/${name}.dil.md`, "utf8"),
    captured: readFileSync(`${dir}/${name}.raw.js`, "utf8"),
    data: JSON.parse(readFileSync(`${dir}/${name}.data.json`, "utf8")) as Record<string, unknown>,
  };
}

function compile(scenario: Scenario) {
  const { source } = load(scenario.name);
  let next = 0;
  const ids = scenario.widgetIdReplay;
  return compileDil(parseDocument(source, { isStreaming: false }), {
    clientWidgetTag: "__chatgptClientDefinedWidget",
    widgetIdFactory: () => ids[next++],
    bodyIndex: scenario.bodyIndex,
  });
}

function firstDiff(a: string, b: string, window = 3): string {
  const la = a.split("\n");
  const lb = b.split("\n");
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) {
      const from = Math.max(0, i - window);
      return (
        `first differing line ${i + 1} (ours ${la.length} lines, captured ${lb.length} lines)\n` +
        [...la.slice(from, i + 1 + window).map((l) => `  ours    | ${l}`)].join("\n") +
        "\n" +
        [...lb.slice(from, i + 1 + window).map((l) => `  captured| ${l}`)].join("\n")
      );
    }
  }
  return "no line diff (length mismatch)";
}

test("code: compileDil's program equals the captured raw.js after prettier", async () => {
  for (const s of SCENARIOS) {
    const out = compile(s);
    const a = await prettier.format(out.code, { parser: "babel", printWidth: 120 });
    const b = await prettier.format(load(s.name).captured, { parser: "babel", printWidth: 120 });
    assert.deepEqual(a, b, `[${s.name}] code diff\n${firstDiff(a, b)}`);
  }
});

test("constants: compileDil's table equals the captured one", async () => {
  for (const s of SCENARIOS) {
    const out = compile(s);
    const captured = load(s.name).data.constants as Record<string, unknown>;
    const a = await prettier.format(JSON.stringify(out.constants), { parser: "json" });
    const b = await prettier.format(JSON.stringify(captured), { parser: "json" });
    assert.deepEqual(
      a,
      b,
      `[${s.name}] constants diff (ours ${Object.keys(out.constants).length}, captured ${
        Object.keys(captured).length
      })\n${firstDiff(a, b, 4)}`,
    );
  }
});

test("fallbackMarkdown: compileDil's degraded projection equals the captured one", () => {
  for (const s of SCENARIOS) {
    const out = compile(s);
    const captured = load(s.name).data.fallbackMarkdown as string;
    if (typeof captured !== "string") continue;
    assert.deepEqual(out.fallbackMarkdown, captured, `[${s.name}] fallbackMarkdown diff`);
  }
});

test("requiredComponents: compileDil's host-component manifest equals the captured one", () => {
  for (const s of SCENARIOS) {
    const captured = load(s.name).data.requiredComponents;
    if (!Array.isArray(captured)) continue;
    assert.deepEqual(compile(s).requiredComponents, captured, `[${s.name}] requiredComponents diff`);
  }
});
