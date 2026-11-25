/**
 * Plain-text projection: the AST back to Markdown.
 *
 * Two callers need it: "Copy as Markdown" on an assistant message, and transcript
 * quoting (`Add to Chat`), both of which must keep working when the same content is
 * also rendered as UI. Nothing is evaluated: dynamic interpolations disappear, and an
 * `{#if}` contributes its `{:else}` branch — the state a reader sees before interacting.
 *
 * Platform references such as citations, entities and image queries retain their markers.
 * Prose is escaped where a bare character would read as Markdown syntax.
 */

import type { DilElementNode, DilNode } from "./types.ts";

interface RenderContext {
  readonly listDepth: number;
  /** Table cells are not blocks: a cell that opens with `1.` is not a list. */
  readonly inTableCell?: boolean;
  readonly inLinkLabel?: boolean;
}

/** Private-use delimiters the reference wraps platform references in: citations, links,
 * entities and image queries travel through the projection as opaque markers. */
const MARKER_OPEN = "\ue200";
const MARKER_SEP = "\ue202";
const MARKER_CLOSE = "\ue201";

const IMAGE_MARKER = `${MARKER_OPEN}image_group`;

function marker(kind: string, fields: readonly string[]): string {
  return `${MARKER_OPEN}${kind}${fields.map((field) => MARKER_SEP + field).join("")}${MARKER_CLOSE}`;
}

/** Characters that would start Markdown syntax are backslash-escaped in prose; the
 * numbering of a paragraph that merely looks like a list marker is escaped too. */
function escapeProse(value: string, atBlockStart: boolean): string {
  const escaped = value.replace(/([$#_!])/g, "\\$1");
  return atBlockStart ? escaped.replace(/^(\d+)\.(?=\s|$)/, "$1\\.") : escaped;
}

export function toFallbackMarkdown(nodes: DilNode[]): string {
  return tidyFallback(renderNodes(nodes, { listDepth: 0 }));
}

function renderNodes(nodes: DilNode[], ctx: RenderContext): string {
  let out = "";
  let previousWasTextBlock = false;
  let previousWasTitle = false;
  for (const node of nodes) {
    switch (node.type) {
      case "text": {
        const literal = ctx.inLinkLabel ? node.value.replace(/[\\[\]]/g, "\\$&") : node.value;
        out += escapeProse(literal, (out === "" || out.endsWith("\n")) && ctx.inTableCell !== true);
        previousWasTextBlock = false;
        break;
      }
      case "stmt":
      case "expr":
        previousWasTextBlock = false;
        break;
      case "fence":
        out +=
          node.kind === "math" ? `\n\n$$\n${node.value}\n$$\n\n` : `\n\n\`\`\`${node.info}\n${node.value}\n\`\`\`\n\n`;
        previousWasTextBlock = false;
        break;
      case "if": {
        const fallback = node.branches.find((branch) => branch.cond === null);
        out += renderNodes(fallback?.body ?? [], ctx);
        previousWasTextBlock = false;
        break;
      }
      case "each":
        out += renderNodes(node.body, ctx);
        previousWasTextBlock = false;
        break;
      case "element": {
        const isTextBlock = node.name === "text" || isInlineParagraph(node);
        if (isTextBlock && previousWasTextBlock) out += "\n\n";
        const rendered = renderElement(node, ctx);
        if (previousWasTitle && rendered.startsWith(IMAGE_MARKER) && out.endsWith("\n\n")) out = out.slice(0, -1);
        out += rendered;
        previousWasTextBlock = isTextBlock;
        previousWasTitle = node.name === "title";
        break;
      }
    }
  }
  return out;
}

function renderElement(node: DilElementNode, ctx: RenderContext): string {
  const inner = (): string => renderNodes(node.children, ctx).trim();

  switch (node.name) {
    case "title": {
      const size = attributeValue(node, "size");
      const depth = Number(attributeValue(node, "level"));
      const level = depth >= 1 && depth <= 6 ? depth : size === "xl" || size === "2xl" ? 1 : size === "lg" ? 2 : 3;
      return `\n\n${"#".repeat(level)} ${inner().replace(/^(\d+)\.(?=\s|$)/, "$1\\.")}\n\n`;
    }
    case "text":
      return hasAttribute(node, "lineThrough") ? `~~${inner()}~~` : inner();
    case "caption":
      return inner() ? `\n\n${inner()}\n\n` : "";
    case "bold":
      return `**${inner()}**`;
    case "italic":
      return `*${inner()}*`;
    case "hard-break":
      return "  \n";
    case "markdown-literal":
      return rawText(node);
    case "markdown-image": {
      const src = attributeValue(node, "src") ?? "";
      const alt = attributeValue(node, "alt") ?? "";
      const title = attributeValue(node, "title");
      return `![${alt}](${src}${title ? ` "${title}"` : ""})`;
    }
    case "code": {
      const text = rawText(node);
      return text ? `\`${text}\`` : "";
    }
    case "math": {
      const value = attributeValue(node, "value") ?? inner();
      if (!value) return "";
      return hasAttribute(node, "block") ? `\n\n$$\n${value}\n$$\n\n` : `$${value}$`;
    }
    case "code-block":
    case "CodeBlock": {
      const language = attributeValue(node, "language") ?? "";
      const body = codeBody(node);
      return `\n\n\`\`\`${language}\n${body}${body.endsWith("\n") ? "" : "\n"}\`\`\`\n\n`;
    }
    case "divider":
      return "\n\n---\n\n";
    case "blockquote": {
      const body = inner();
      if (!body) return "";
      return `\n\n${body
        .split("\n")
        .map((line) => `> ${line}`.trimEnd())
        .join("\n")}\n\n`;
    }
    case "list":
      return renderList(node, ctx);
    case "list-item":
      return renderNodes(node.children, { listDepth: ctx.listDepth + 1 }).trim();
    case "table":
      return renderTable(node, ctx);
    case "table-cell":
    case "table-row":
      return inner();
    case "Link": {
      const target = attributeValue(node, "url")?.trim();
      const title = attributeValue(node, "title");
      const text = renderNodes(node.children, { ...ctx, inLinkLabel: true }).trim();
      const label = text || (title || target || "").replace(/[\\[\]]/g, "\\$&");
      if (!target) return label;
      const escapedTarget = target.replace(/[\\<>]/g, "\\$&");
      const destination = /[\s<>]/.test(target) ? `<${escapedTarget}>` : escapedTarget.replace(/[()]/g, "\\$&");
      const escapedTitle = title?.replace(/[\\"]/g, "\\$&");
      return `[${label}](${destination}${escapedTitle ? ` "${escapedTitle}"` : ""})`;
    }
    case "Cite": {
      const refs = citationRefs(node);
      return refs.length > 0 ? marker("cite", refs) : inner();
    }
    case "Entity": {
      const disambig = attributeValue(node, "disambig");
      const value = attributeValue(node, "value");
      if (!disambig) return value ?? inner();
      return marker("entity", [JSON.stringify([attributeValue(node, "category") ?? "", value ?? "", disambig])]);
    }
    case "AsyncImage":
      return marker("image_group", [
        JSON.stringify({
          query: [attributeValue(node, "query") ?? ""],
          ...(attributeValue(node, "aspectRatio") ? { aspect_ratio: attributeValue(node, "aspectRatio") } : {}),
          layout: "carousel",
          num_per_query: 1,
        }),
      ]);
    case "AsyncImageGroup": {
      const query = queryList(attributeValue(node, "query"));
      const aspect = attributeValue(node, "aspectRatio");
      const layout = attributeValue(node, "layout");
      const perQuery = attributeValue(node, "numPerQuery");
      return marker("image_group", [
        JSON.stringify({
          query,
          ...(aspect ? { aspect_ratio: aspect } : {}),
          ...(layout ? { layout } : {}),
          ...(perQuery ? { num_per_query: Number(perQuery) } : {}),
        }),
      ]);
    }
    case "input":
    case "textarea": {
      const placeholder = node.attrs.find((attribute) => attribute.name === "placeholder");
      if (placeholder?.kind !== "string" || typeof placeholder.value !== "string") return "";
      return escapeProse(placeholder.value.replace(/[\\*[\]`<>]/g, "\\$&"), true);
    }
    case "badge":
      return inner() ? `(${inner()})` : "";
    case "button": {
      const label = inner();
      if (!label) return "";
      const target = openUrlTarget(node);
      return target ? `[${label}](${target})` : `[${label}]`;
    }
    case "radio-group":
    case "form": {
      const body = node.children
        .map((child) => renderNodes([child], ctx).trim())
        .filter(Boolean)
        .join("\n\n");
      return body ? `\n\n${body}\n\n` : "";
    }
    case "icon":
    case "svg":
    case "defs":
    case "marker":
    case "rect":
    case "path":
    case "line":
    case "circle":
      return "";
    case "row":
    case "col": {
      const parts = node.children
        .map((child) => ({ node: child, text: renderNodes([child], ctx) }))
        .filter((part) => part.text.trim() !== "");
      let out = "";
      let lastWasInline = false;
      for (const part of parts) {
        const inline = isInlineAtom(part.node);
        if (!out) out = part.text;
        else if (inline && lastWasInline) out = `${out} ${part.text}`;
        else out += `${out.endsWith("\n") ? "" : "\n\n"}${part.text}`;
        lastWasInline = inline;
      }
      return out;
    }
    case "box":
    case "grid":
    case "grid-item": {
      const body = node.children
        .map((child) => renderNodes([child], ctx).trim())
        .filter(Boolean)
        .join("\n\n");
      return body ? `\n\n${body}\n\n` : "";
    }
    default:
      return inner();
  }
}

/** `{#each}` / `{#if}` around the items are transparent for projection purposes. */
function collectItems(nodes: readonly DilNode[]): DilElementNode[] {
  const out: DilElementNode[] = [];
  for (const node of nodes) {
    if (node.type === "element" && node.name === "list-item") out.push(node);
    else if (node.type === "each") out.push(...collectItems(node.body));
    else if (node.type === "if") {
      for (const branch of node.branches) out.push(...collectItems(branch.body));
    }
  }
  return out;
}

/** Tags that read as inline content: a row keeps them on its line, and a Markdown
 * paragraph that lowers to one of them is still a paragraph of its own. */
const INLINE_TAGS = new Set([
  "text",
  "bold",
  "italic",
  "code",
  "math",
  "badge",
  "icon",
  "hard-break",
  "markdown-image",
  "markdown-literal",
  "Link",
  "Cite",
  "Entity",
  "AsyncImage",
  "AsyncImageGroup",
  "button",
]);

function isInlineParagraph(node: DilElementNode): boolean {
  return node.synthetic === true && INLINE_TAGS.has(node.name);
}

/** Whether a row child reads as inline content rather than as a block of its own. */
function isInlineAtom(node: DilNode): boolean {
  return node.type === "text" || node.type === "expr" || (node.type === "element" && INLINE_TAGS.has(node.name));
}

/** `<Cite ref="x"/>` / `<Cite refs={["x","y"]}/>`: the reference ids it cites, in order. */
function citationRefs(node: DilElementNode): string[] {
  const single = attributeValue(node, "ref");
  if (single) return [single];
  const list = attributeValue(node, "refs");
  if (!list) return [];
  const parsed = listQuery(list);
  return parsed.map((value) => String(value));
}

/** A JS array literal written in an attribute (`["a","b"]`) as plain strings. */
function listQuery(value: string | null): unknown[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return value
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
}

function queryList(value: string | null): string[] {
  return listQuery(value).map((item) => String(item));
}

/** A button that opens a URL projects as a Markdown link; the target is written inline. */
function openUrlTarget(node: DilElementNode): string | null {
  const onClick = node.attrs.find((attribute) => attribute.name === "onClick");
  if (!onClick || typeof onClick.value !== "string") return null;
  const open = /GenUI\.openUrl\(\s*(["'])((?:(?!\1).)*)\1\s*\)/.exec(onClick.value);
  return open ? open[2] : null;
}

function renderList(node: DilElementNode, ctx: RenderContext): string {
  const marker = attributeValue(node, "marker");
  const items = collectItems(node.children);
  if (!items.length) return renderNodes(node.children, ctx);

  const indent = "  ".repeat(ctx.listDepth);
  const start = Number.parseInt(attributeValue(node, "start") ?? "1", 10);
  const lines = items.map((item, index) => {
    const prefix =
      marker === "none" ? "" : marker === "number" ? `${Number.isFinite(start) ? start + index : index + 1}. ` : "- ";
    const checked = attributeValue(item, "checked");
    const task = checked === "true" ? "[x] " : checked === "false" ? "[ ] " : "";
    const body = renderNodes(item.children, { listDepth: ctx.listDepth + 1 })
      .trim()
      .split("\n")
      .filter((line, lineIndex, all) => line.length > 0 || lineIndex < all.length - 1);
    const [first = "", ...rest] = body;
    const pad = " ".repeat(prefix.length + task.length);
    const continuation = rest.map((line) => `\n${indent}${pad}${line}`).join("");
    return `${indent}${prefix}${task}${first}${continuation}`;
  });

  return `\n\n${lines.join(marker === "none" ? "\n\n" : "\n")}\n\n`;
}

function renderTable(node: DilElementNode, ctx: RenderContext): string {
  const rows = node.children.filter(
    (child): child is DilElementNode => child.type === "element" && child.name === "table-row",
  );
  if (!rows.length) return "";

  const cells = rows.map((row) =>
    row.children.filter((child): child is DilElementNode => child.type === "element" && child.name === "table-cell"),
  );
  const rendered = cells.map((row) => {
    const contents = row.map((cell) =>
      renderNodes(cell.children, { ...ctx, inTableCell: true })
        .trim()
        .replace(/\s*\n\s*/g, " ")
        .replace(/\|/g, "\\|"),
    );
    return `| ${contents.join(" | ")} |`;
  });

  const columns = Math.max(1, cells[0].length);
  rendered.splice(1, 0, `|${Array.from({ length: columns }, () => "--------").join("|")}|`);
  return `\n\n${rendered.join("\n")}\n\n`;
}

/** A fenced body verbatim: `<CodeBlock>` keeps the newlines that surround its source. */
function codeBody(node: DilElementNode): string {
  return node.children.some((child) => child.type === "text") ? rawText(node) : "";
}

function rawText(node: DilElementNode): string {
  return node.children.map((child) => (child.type === "text" ? child.value : "")).join("");
}

function attributeValue(node: DilElementNode, name: string): string | null {
  const attribute = node.attrs.find((candidate) => candidate.name === name);
  if (!attribute) return null;
  if (typeof attribute.value === "string") return attribute.value;
  return attribute.value ? "true" : null;
}

function hasAttribute(node: DilElementNode, name: string): boolean {
  return node.attrs.some((attribute) => attribute.name === name);
}

/**
 * Drop projection debris — headings whose content was dynamic, table rows of empty
 * cells — without touching fenced blocks, where every line matters.
 */
export function tidyFallback(markdown: string): string {
  const lines = markdown.split("\n");
  const kept: string[] = [];
  let fence: string | null = null;
  let mathEnd: "\\]" | "$$" | null = null;

  for (const line of lines) {
    if (mathEnd) {
      kept.push(line);
      if (line.trim() === mathEnd) mathEnd = null;
      continue;
    }
    if (fence) {
      kept.push(line);
      if (line.trim() === fence) fence = null;
      continue;
    }
    const opener = /^\s*(```|~~~)/.exec(line);
    if (opener) {
      fence = opener[1];
      kept.push(line);
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed) {
      if (line !== "" || kept.at(-1) !== "") kept.push(line);
      continue;
    }
    if (trimmed === "\\[" || trimmed === "$$") {
      mathEnd = trimmed === "$$" ? "$$" : "\\]";
      kept.push(trimmed);
      continue;
    }
    if (trimmed === "\\]") {
      kept.push(trimmed);
      continue;
    }
    if (trimmed === ">") {
      kept.push(">");
      continue;
    }
    if (/^#{1,6}\s*$/.test(line)) continue;
    if (/^#{1,6}\s/.test(line) && !hasWord(line.replace(/^#+\s*/, ""))) continue;
    if (line.startsWith("|")) {
      if (isTableSeparator(line)) {
        kept.push(line);
        continue;
      }
      const cells = line.replace(/^\|/, "").replace(/\|$/, "").split("|");
      if (cells.some(hasWord)) kept.push(line);
      continue;
    }
    if (!hasWord(line) && !/^[-*]\s/.test(line) && line.trim() !== "---") continue;
    kept.push(line);
  }

  return kept.join("\n").trim();
}

function isTableSeparator(line: string): boolean {
  const cells = line.replace(/^\|/, "").replace(/\|$/, "").split("|");
  return cells.length > 0 && cells.every((cell) => /^\s*:?-{1,}:?\s*$/.test(cell));
}

function hasWord(value: string): boolean {
  return /[\p{L}\p{N}]/u.test(value);
}
