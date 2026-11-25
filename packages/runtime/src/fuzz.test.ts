/**
 * Property tests for the DIL core: generators plus oracles.
 *
 * The point is not "random bytes do not crash" — `parseDocument` never throws by design,
 * and a crash-only oracle would call a silently truncated answer a pass. Each test below
 * states a property that a *correct* lowering must satisfy, and the generators are built
 * to reach the corners: multiline code spans, loose lists, escaped punctuation, autolinks.
 *
 * Two properties found real bugs while this file was being written (see the DIL PR):
 * a multiline code span was rejected, so `{a: 1}` inside it became an interpolation; and
 * document-level prose was split on every blank line, so a loose list became two lists.
 */

import assert from "node:assert/strict";
import test from "node:test";
// Fixed seeds: a failing property reproduces exactly, and CI does not flip on a random
// draw. Bump the seed deliberately to explore a new slice of the input space.
import { compileDil, createCompileSession, type DilNode, hasDilElements, parseDocument } from "@kkkiio/dil-core";
import fc from "fast-check";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { createExecutor } from "./sandbox-worker.cjs";

const settings = {
  numRuns: process.env.FUZZ_PROFILE === "deep" ? 5_000 : 120,
  seed: Number(process.env.FUZZ_SEED ?? 20241118),
};

const mdastParser = unified().use(remarkParse).use(remarkGfm);

// ---------------------------------------------------------------------------
// Generators — Markdown-only documents, so any DIL node is "invented"
// ---------------------------------------------------------------------------

const word = fc.constantFrom("alpha", "beta", "gamma", "delta", "流程", "状态");

const inlineCode = fc.tuple(fc.integer({ min: 1, max: 3 }), word, word).map(([lines, first, rest]) => {
  // Multiline spans are the corner: CommonMark allows them, a scanner that rejects
  // them lets their braces through as DIL.
  const body = Array.from({ length: lines }, () => `${first} ${rest}`).join("\n");
  return `\`${body} {a: 1} <dev@example.com>\``;
});

const escapedProse = fc.constantFrom("\\{a, b\\}", "\\<box\\>", "50\\% of it", "a \\* b");

const inline = fc.oneof(
  inlineCode,
  escapedProse,
  word,
  fc.tuple(word, word).map(([a, b]) => `**${a}** ${b}`),
);

const paragraph = fc.array(inline, { minLength: 1, maxLength: 3 }).map((parts) => parts.join(" "));

const listItem = fc.array(inline, { minLength: 1, maxLength: 2 }).map((parts) => parts.join(" "));

/** `loose` is the corner: blank lines between items must stay one list. */
const list = fc
  .tuple(fc.array(listItem, { minLength: 2, maxLength: 3 }), fc.boolean())
  .map(([items, loose]) => items.map((item, index) => `${index + 1}. ${item}`).join(loose ? "\n\n" : "\n"));

const table = fc.array(fc.tuple(word, word), { minLength: 1, maxLength: 2 }).map(([[headA, headB], ...rows]) => {
  const body = rows.map(([a, b]) => `| ${a} | ${b} |`).join("\n");
  return `| ${headA} | ${headB} |\n| --- | --- |${body ? `\n${body}` : ""}`;
});

const fenced = fc.tuple(word, word).map(([language, body]) => `\`\`\`${language}\n${body}\n\`\`\``);

const heading = fc.tuple(fc.integer({ min: 1, max: 3 }), word).map(([depth, text]) => `${"#".repeat(depth)} ${text}`);

const quote = fc
  .array(word, { minLength: 1, maxLength: 2 })
  .map((lines) => lines.map((line) => `> ${line}`).join("\n"));

/** Alone between blank lines, so this stays a thematic break rather than a setext heading. */
const rule = fc.constant("---");

const block = fc.oneof(paragraph, heading, list, table, fenced, quote, rule);

const markdownDocument = fc.array(block, { minLength: 1, maxLength: 3 }).map((blocks) => blocks.join("\n\n"));

// ---------------------------------------------------------------------------
// Oracles
// ---------------------------------------------------------------------------

/** Visible text as Markdown itself defines it: mdast text, minus the syntax. */
function mdastText(source: string): string {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const record = node as { type?: string; value?: string; alt?: string; children?: unknown[] };
    if (record.type === "text" || record.type === "inlineCode" || record.type === "code") {
      out.push(record.value ?? "");
    } else if (record.type === "image") {
      out.push(record.alt ?? "");
    }
    for (const child of record.children ?? []) walk(child);
  };
  walk(mdastParser.parse(source));
  return out.join(" ");
}

/** The same text as the lowered DIL tree presents it. */
function treeText(nodes: readonly DilNode[]): string {
  const out: string[] = [];
  const walk = (list: readonly DilNode[]): void => {
    for (const node of list) {
      if (node.type === "text") out.push(node.value);
      else if (node.type === "element") walk(node.children);
      else if (node.type === "each") walk(node.body);
      else if (node.type === "if") for (const branch of node.branches) walk(branch.body);
    }
  };
  walk(nodes);
  return out.join(" ");
}

const squash = (text: string): string => text.replace(/\s+/g, " ").trim();

function collect(nodes: readonly DilNode[], name: string, out: DilNode[] = []): DilNode[] {
  for (const node of nodes) {
    if (node.type === "element") {
      if (node.name === name) out.push(node);
      collect(node.children, name, out);
    } else if (node.type === "each") collect(node.body, name, out);
    else if (node.type === "if") for (const branch of node.branches) collect(branch.body, name, out);
  }
  return out;
}

// ---------------------------------------------------------------------------
// O1 — Markdown-only input must not invent DIL, and must not lose text
// ---------------------------------------------------------------------------

test("property: Markdown-only prose never becomes DIL and keeps its text", () => {
  fc.assert(
    fc.property(markdownDocument, (source) => {
      const document = parseDocument(source);
      assert.equal(hasDilElements(document.raw), false, `invented DIL for:\n${source}`);
      assert.equal(squash(treeText(document.tree)), squash(mdastText(source)), `text changed for:\n${source}`);
    }),
    settings,
  );
});

// ---------------------------------------------------------------------------
// O1b — inline DIL neighbours keep their separators
// ---------------------------------------------------------------------------

/**
 * The space between two inline nodes lives in a whitespace-only text node. A lowering
 * pass that drops those nodes renders `Helloworld` and `12` — a regression this property
 * was added for after review found it by hand.
 */
const inlineDil = fc.oneof(
  word.map((value) => ({ source: value, text: value })),
  word.map((value) => ({ source: `<bold>${value}</bold>`, text: value })),
  word.map((value) => ({ source: `<italic>${value}</italic>`, text: value })),
  word.map((value) => ({ source: `<code>${value}</code>`, text: value })),
  fc.integer({ min: 1, max: 9 }).map((n) => ({ source: `{${n} + 1}`, text: String(n + 1) })),
);

test("property: inline DIL neighbours keep their separators", () => {
  fc.assert(
    fc.property(fc.array(inlineDil, { minLength: 2, maxLength: 4 }), (atoms) => {
      const source = atoms.map((atom) => atom.source).join(" ");
      const expected = atoms.map((atom) => atom.text).join(" ");
      // Resolve first: `{1 + 1}` is an `expr` node until it is evaluated.
      const compiled = compileDil(parseDocument(source));
      const resolved = createExecutor().load(compiled).tree;
      const actual = squash(
        resolved.map((node) => (node.kind === "text" ? node.value : "")).join("") +
          resolved.map((node) => (node.kind === "element" ? flatten(node.children) : "")).join(""),
      );
      assert.equal(actual, expected, source);
    }),
    settings,
  );
});

function flatten(nodes: readonly { kind: string; value?: string; children?: readonly unknown[] }[]): string {
  let out = "";
  for (const node of nodes) {
    if (node.kind === "text") out += node.value ?? "";
    else if (node.children)
      out += flatten(node.children as readonly { kind: string; value?: string; children?: readonly unknown[] }[]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// O2 — block structure matches what Markdown itself parsed
// ---------------------------------------------------------------------------

test("property: a loose list stays one list", () => {
  fc.assert(
    fc.property(fc.tuple(fc.array(listItem, { minLength: 2, maxLength: 3 }), fc.boolean()), ([items, loose]) => {
      const source = items.map((item, index) => `${index + 1}. ${item}`).join(loose ? "\n\n" : "\n");
      const expected = mdastParser.parse(source).children.filter((node) => node.type === "list");
      assert.equal(expected.length, 1, "the generator must produce one list");

      const document = parseDocument(source);
      const lists = collect(document.tree, "list");
      assert.equal(lists.length, 1, `split a list into ${lists.length} for:\n${source}`);

      const items_ = (lists[0] as { children: readonly DilNode[] }).children.filter(
        (child) => child.type === "element" && child.name === "list-item",
      );
      assert.equal(items_.length, items.length, `lost list items for:\n${source}`);
    }),
    settings,
  );
});

/** What the document tier must emit for one Markdown block. */
const DIL_NODE_FOR_MDAST: Record<string, string> = {
  paragraph: "text",
  heading: "title",
  list: "list",
  blockquote: "blockquote",
  thematicBreak: "divider",
  code: "code-block",
  table: "table",
};

test("property: the document tier splits into exactly the Markdown blocks", () => {
  // Markdown is the oracle for *where* the boundaries are: one block in, one DIL node out,
  // in the same order. A prose run that merges two blocks (or a block that drifts out of
  // its list) shows up as a count or order mismatch here.
  fc.assert(
    fc.property(fc.array(block, { minLength: 1, maxLength: 5 }), (blocks) => {
      const source = blocks.join("\n\n");
      const expected = mdastParser.parse(source).children.map((node) => DIL_NODE_FOR_MDAST[node.type]);
      assert.ok(
        expected.every((name) => name !== undefined),
        `generator produced a block the mapping does not cover: ${source}`,
      );

      const actual = parseDocument(source).tree.map((node) => (node.type === "element" ? node.name : node.type));
      assert.deepEqual(actual, expected, source);
    }),
    settings,
  );
});

// Markdown cannot be the oracle once DIL tags are in the source: they lower to nodes remark
// never sees. So each generated piece carries the node it must become.
interface Piece {
  readonly source: string;
  readonly node: string;
  readonly markdown?: boolean;
}

const piece: fc.Arbitrary<Piece> = fc.oneof(
  ...(
    [
      { source: "<box>\n  <text>alpha</text>\n</box>", node: "box" },
      { source: "<row>\n  <badge>beta</badge>\n</row>", node: "row" },
      { source: "```js\nconst a = 1;\n```", node: "code-block" },
      { source: "<divider/>", node: "divider" },
      { source: "{#if true}<text>gamma</text>{/if}", node: "if" },
      { source: "{#each [1, 2] as n}<text>{n}</text>{/each}", node: "each" },
      { source: "{@body const a = 1}", node: "stmt" },
    ] satisfies Piece[]
  ).map((value) => fc.constant(value)),
  paragraph.map((source) => ({ source, markdown: true, node: "text" })),
  heading.map((source) => ({ source, markdown: true, node: "title" })),
  list.map((source) => ({ source, markdown: true, node: "list" })),
  table.map((source) => ({ source, markdown: true, node: "table" })),
  fenced.map((source) => ({ source, markdown: true, node: "code-block" })),
  quote.map((source) => ({ source, markdown: true, node: "blockquote" })),
);

test("property: authored DIL and surrounding Markdown preserve their document structure", () => {
  fc.assert(
    fc.property(fc.array(piece, { minLength: 1, maxLength: 5 }), (pieces) => {
      const source = pieces.map((entry) => entry.source).join("\n\n");
      const expected: string[] = [];
      let prose: string[] = [];
      for (const piece of [...pieces, { source: "", node: "", markdown: false }]) {
        if (piece.markdown) {
          prose.push(piece.source);
          continue;
        }
        if (prose.length > 0) {
          expected.push(...mdastParser.parse(prose.join("\n\n")).children.map((node) => DIL_NODE_FOR_MDAST[node.type]));
          prose = [];
        }
        if (piece.node) expected.push(piece.node);
      }
      const actual = parseDocument(source).tree.map((node) => (node.type === "element" ? node.name : node.type));
      assert.deepEqual(actual, expected, source);
    }),
    settings,
  );
});

test("a statement inside a container is available to its siblings and runs once", () => {
  const source = [
    "{@body let count = 0}",
    "<box><row>{@body count += 1}<text>inside {count}</text></row></box>",
    "<text>outside {count}</text>",
  ].join("\n");
  const result = createExecutor().load(compileDil(parseDocument(source)));
  assert.equal(result.errors, 0);
  assert.equal(flatten(result.tree), "inside 1outside 1");
});

const dynamicCard = fc
  .tuple(
    fc.array(fc.constantFrom("box", "row", "col"), { maxLength: 5 }),
    fc.array(word, { minLength: 1, maxLength: 4 }),
  )
  .map(([containers, items]) => {
    const declaration = `{@body const values = ${JSON.stringify(items)}}{@body count += 1}`;
    const nested = containers.reduce((child, tag) => `<${tag}>${child}</${tag}>`, declaration);
    return {
      source: [
        "{@body let count = 0}",
        `<box>${nested}</box>`,
        "{#if count === 1}",
        "{#each values as value, i}<row gap={i + 1}><text>{value}</text></row>{/each}",
        "{/if}",
        "<text>{missing()}ready</text>",
      ].join("\n"),
      items,
    };
  });

test("property: nested declarations and dynamic controls render their values", () => {
  fc.assert(
    fc.property(dynamicCard, ({ source, items }) => {
      const result = createExecutor().load(compileDil(parseDocument(source)));
      assert.equal(flatten(result.tree), `${items.join("")}ready`);
      assert.equal(result.errors, 1);
    }),
    settings,
  );
});

const widgets = fc.array(fc.tuple(fc.boolean(), word), { minLength: 2, maxLength: 6 });

test("property: fenced and authored code blocks resolve in document order", () => {
  fc.assert(
    fc.property(widgets, (pieces) => {
      const source = pieces
        .map(([authored, value]) =>
          authored ? `<CodeBlock language="txt">${value}</CodeBlock>` : `\`\`\`txt\n${value}\n\`\`\``,
        )
        .join("\n\n");
      let allocated = 0;
      const artifact = compileDil(parseDocument(source), { widgetIdFactory: () => `code-${allocated++}` });
      const ids = pieces.map((_, index) => `code-${index}`);
      const result = createExecutor().load(artifact);
      assert.equal(result.errors, 0);
      assert.deepEqual(
        result.tree.flatMap((node) => (node.kind === "element" ? [node.props.invocationId] : [])),
        ids,
      );
      const references = Array.from(artifact.code.matchAll(/__dilConstants\["(\d+)"\]/g), ([, key]) => key);
      assert.deepEqual([...new Set(references)].sort(), Object.keys(artifact.constants).sort());
    }),
    settings,
  );
});

test("property: fallback preserves generated table entries and fenced indentation", () => {
  fc.assert(
    fc.property(table, word, fc.integer({ min: 0, max: 3 }), (sourceTable, label, indent) => {
      const padding = " ".repeat(indent);
      const fence = `${padding}\`\`\`txt\n${padding}  ${label}\n${padding}\`\`\``;
      const artifact = compileDil(parseDocument(`${sourceTable}\n\n${fence}`));
      const blocks = mdastParser.parse(artifact.fallbackMarkdown).children;
      assert.deepEqual(
        blocks.map((node) => node.type),
        ["table", "code"],
      );
      const entries = mdastText(sourceTable);
      assert.equal(mdastText(artifact.fallbackMarkdown), `${entries}   ${label}`);
      assert.match(artifact.fallbackMarkdown, /^\|(?:-{8}\|){2}$/m);
    }),
    settings,
  );
});

test("property: streamed prefixes remain executable and resolve the finished card", () => {
  fc.assert(
    fc.property(fc.array(fc.tuple(word, fc.nat(120)), { minLength: 2, maxLength: 6 }), (parts) => {
      const source = parts.map(([label]) => `<box><text>${label}</text></box>`).join("\n\n");
      const cuts = [...new Set(parts.map(([, offset]) => offset % source.length))].sort((a, b) => a - b);
      const session = createCompileSession();
      for (const end of cuts) {
        const prefix = source.slice(0, end);
        const artifact = session.compile(prefix);
        assert.equal(createExecutor().load(artifact).errors, 0);
        assert.deepEqual(session.compile(prefix), artifact);
      }
      const streamed = createExecutor().load(session.compile(source));
      const finished = createExecutor().load(compileDil(parseDocument(source)));
      assert.deepEqual(streamed.tree, finished.tree);
      assert.equal(flatten(streamed.tree), parts.map(([label]) => label).join(""));
    }),
    settings,
  );
});
