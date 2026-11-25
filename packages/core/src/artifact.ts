/**
 * The artifact serializer: emits a parsed DIL document as the reference compiler's
 * compiled artifact — the closed JavaScript program plus its constant table — matching
 * the captured `model_dil_v2` envelope byte-for-byte after standard formatting.
 *
 * Every emission rule is corpus-derived and enforced by the artifact-diff oracle
 * (`conformance/artifact.test.ts`): guard placement, when the `__dilSafe` prelude is
 * emitted, constant allocation order, the prose-run wrapping (a run of components carries
 * no `text`), the single-root body shape (no `Fragment` around one root), which host tags
 * resolve to a component call and which degrade to text, widget contracts for fenced and
 * `<CodeBlock>` blocks, host-tag resolution ids, and statement key injection. Platform
 * facts the compiler cannot derive from source arrive as options: the internal widget tag
 * name, an id factory (the platform allocates one id per fence or host tag, in document
 * order), and the DIL block's position in the message.
 */

import { toFallbackMarkdown } from "./fallback.ts";
import type { DilAttribute, DilDocument, DilElementNode, DilNode } from "./types.ts";
import { DIL_VOCABULARY } from "./vocabulary.ts";

export interface CompileOptions {
  /** The internal tag emitted for client-resolved leaves; the captured platform's name
   * is passed by conformance scenarios, production hosts use the brand-free default. */
  readonly clientWidgetTag?: string;
  /** One id per fenced block or host tag, consumed in document order. Real hosts use
   * the default random factory; tests replay the captured sequence for determinism. */
  readonly widgetIdFactory?: () => string;
  /** The DIL block's position within the host message. */
  readonly bodyIndex?: number;
}

export interface CompiledArtifact {
  /** The executable program: `DIL.render(__dil.jsx(...))`, closed over `DIL.*` only. The
   * `__dilSafe` prelude is prepended only when the program actually calls it. */
  readonly code: string;
  /** The constant table the program reads through `DIL.useConstants()`. */
  readonly constants: Record<string, unknown>;
  /** The degraded Markdown projection shown while the program cannot run. */
  readonly fallbackMarkdown: string;
  readonly fallbackMarkdownVersion: number;
  /** The host components the program references; the client lazily loads these. */
  readonly requiredComponents: readonly string[];
}

const PRELUDE = "function __dilSafe(evaluate,failureValue){try{return evaluate()}catch{return failureValue}}\n\n";
const PREAMBLE =
  "const __dilConstants=DIL.useConstants();" +
  "const __dilModelDataBindings=DIL.useAppData((appData)=>appData.opGenui?.modelDataBindings??{});";

/** Tags whose children the reference compiler never wraps in a `text` element. */
const RAW_CHILD_TAGS = new Set([
  "bold",
  "italic",
  "text",
  "title",
  "caption",
  "button",
  "code",
  "icon",
  "badge",
  "math",
  "divider",
  "label",
  "checkbox",
  "input",
  "textarea",
  "Cite",
  "Link",
  "Entity",
  "AsyncImage",
  "AsyncImageGroup",
]);

/** Tags resolved by client components: emitted as bare identifiers, with the compiler
 * injecting a platform-allocated `__resolutionId` into their props. */
const HOST_TAGS = new Set(["Cite", "Link", "Entity", "AsyncImage", "AsyncImageGroup"]);

/** String props the reference compiler allocates into the constants table. */
const CONTENT_PROPS = new Set([
  "math.value",
  "Entity.value",
  "Link.title",
  "textarea.placeholder",
  "input.placeholder",
]);

/** Inline tags Markdown itself produces (`**x**`, `` `x` ``, `[x](y)`); a run of these is
 * prose wherever it appears. */
const MARKDOWN_INLINE_TAGS = new Set(
  Object.entries(DIL_VOCABULARY as Record<string, { kind?: string; lowered?: true }>)
    .filter(([, entry]) => entry.kind === "inline" && entry.lowered === true)
    .map(([name]) => name),
);

/** Inline tags only the model writes: a run of these carries no prose, so it is emitted
 * as its elements instead of a `text`. */
const STANDALONE_INLINE_TAGS = new Set(
  Object.entries(DIL_VOCABULARY as Record<string, { kind?: string; source?: true; lowered?: true }>)
    .filter(([, entry]) => entry.kind === "inline" && entry.source === true && entry.lowered !== true)
    .map(([name]) => name),
);

const NUMBER = /^-?\d+(?:\.\d+)?$/;
const SVG_TAGS = new Set(["rect", "path", "text", "line", "marker"]);

/** Quote unquoted object keys so a `{size:1}` literal becomes JSON-able. */
function jsonifyLiteral(code: string): string {
  return code.replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3');
}

/** A table cell always holds one paragraph; Markdown gives a text cell that element, and
 * so does a cell whose whole content is a single component. */
const PARAGRAPH_CALL = `__dil.jsx("text",null,`;

/** Inline containers whose content, opening with an ordered-list marker, parses as its
 * own block and so keeps the paragraph element Markdown would give it. */
const BLOCK_CONTENT_TAGS = new Set(["text", "label"]);

function startsListMarker(node: DilElementNode): boolean {
  if (!BLOCK_CONTENT_TAGS.has(node.name)) return false;
  const first = node.children[0];
  return first?.type === "text" && /^\d+\.\s/.test(first.value.trimStart());
}

/** `DIL.useState(init)` without an explicit key gets one injected: the first bound name. */
function injectStateKeys(code: string): string {
  const binding = code.match(/(?:const|let|var)\s*\[?\s*([A-Za-z_$][\w$]*)/);
  const call = code.indexOf("DIL.useState(");
  if (!binding || call < 0) return code;
  const start = call + "DIL.useState(".length;
  let depth = 0;
  let quote = "";
  for (let i = start; i < code.length; i++) {
    const ch = code[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") {
      if (ch === ")") {
        if (depth === 0) return `${code.slice(0, i)},{key:"${binding[1]}"}${code.slice(i)}`;
        depth--;
      } else depth--;
    } else if (ch === "," && depth === 0) return code;
  }
  return code;
}

class Serializer {
  private readonly constants: unknown[] = [];
  private readonly components: string[] = [];
  private readonly statements: string[] = [];
  private readonly widgetTag: string;
  private readonly nextId: () => string;
  private cdw = 0;
  private svgDepth = 0;
  private cellDepth = 0;
  private usesSafe = false;

  constructor(options: CompileOptions) {
    this.widgetTag = options.clientWidgetTag ?? "__clientDefinedWidget";
    this.nextId = options.widgetIdFactory ?? (() => crypto.randomUUID());
  }

  private alloc(value: unknown): string {
    this.constants.push(value);
    return `__dilConstants["${this.constants.length - 1}"]`;
  }

  private takeId(): string {
    return this.alloc(this.nextId());
  }

  /** Emit a guard call, recording that the program now needs the `__dilSafe` prelude. */
  private safe(expression: string, failureValue: string): string {
    this.usesSafe = true;
    return `__dilSafe(()=>(${expression}),${failureValue})`;
  }

  /** Every `{@body}` statement is hoisted ahead of the returned tree in document order,
   * wherever it was written. `DIL.useState` declares a state slot; any other declaration
   * guards its initializer, so a throwing value cannot take the whole program down. */
  private statement(code: string): string {
    if (code.includes("DIL.useState(")) return injectStateKeys(code);
    const declaration = /^(?:(?:const|let|var)\s+[^=]+?)\s*=\s*([\s\S]+)$/.exec(code);
    if (!declaration) return code;
    return `${code.slice(0, code.length - declaration[1].length)}${this.safe(declaration[1], "undefined")}`;
  }

  run(
    document: DilDocument,
    bodyIndex: number,
  ): Omit<CompiledArtifact, "fallbackMarkdown" | "fallbackMarkdownVersion"> {
    const roots = this.emitChildParts(document.tree, false);
    const children = roots.join(",");
    const returned = roots.length === 1 ? children : `__dil.jsx(__dil.Fragment,null,${children})`;
    const program =
      `DIL.render(__dil.jsx(()=>{${PREAMBLE}${this.statements.join("")}` +
      `return ${returned};},{"key":"body:${bodyIndex}"}));`;
    const constants = Object.fromEntries(this.constants.map((value, i) => [String(i), value]));
    return {
      code: (this.usesSafe ? PRELUDE : "") + program,
      constants,
      requiredComponents: [...this.components].sort(),
    };
  }

  /** A paragraph whose whole content is one model-written component carries no prose, so
   * that component stands on its own rather than being wrapped in a `text`. */
  private isElementOnlyParagraph(node: DilElementNode): boolean {
    if (node.synthetic !== true || node.name !== "text") return false;
    if (node.children.length !== 1) return false;
    const child = node.children[0];
    return child.type === "element" && STANDALONE_INLINE_TAGS.has(child.name);
  }

  private emitChildParts(nodes: readonly DilNode[], rawExpr: boolean): string[] {
    const parts: string[] = [];
    for (const node of nodes) {
      const emitted = this.emitNode(node, rawExpr);
      if (emitted) parts.push(emitted);
    }
    return parts;
  }

  private emitChildren(nodes: readonly DilNode[], wrapRuns: boolean, rawExpr = false, bareSingleText = true): string {
    const parts: string[] = [];
    if (!wrapRuns) return this.emitChildParts(nodes, rawExpr).join(",");
    const isSpace = (node: DilNode): boolean => node.type === "text" && !node.value.trim();
    let run: DilNode[] = [];
    const flush = () => {
      while (run.length > 0 && isSpace(run[0])) run.shift();
      while (run.length > 0 && isSpace(run[run.length - 1])) run.pop();
      if (run.length === 0) return;
      if (bareSingleText && run.length === 1 && run[0].type === "text") {
        parts.push(this.alloc(run[0].value));
        run = [];
        return;
      }
      const inner = run
        .map((n) => this.emitNode(n, rawExpr))
        .filter(Boolean)
        .join(",");
      const prose = run.some((n) => n.type === "text" || n.type === "expr" || this.isMarkdownInline(n));
      parts.push(prose ? `__dil.jsx("text",null,${inner})` : inner);
      run = [];
    };
    for (const node of nodes) {
      if (this.isProseAtom(node)) run.push(node);
      else {
        flush();
        const emitted = this.emitNode(node, rawExpr);
        if (emitted) parts.push(emitted);
      }
    }
    flush();
    return parts.join(",");
  }

  private isMarkdownInline(node: DilNode): boolean {
    return node.type === "element" && MARKDOWN_INLINE_TAGS.has(node.name);
  }

  private isProseAtom(node: DilNode): boolean {
    if (node.type === "text") return true;
    if (node.type === "expr") return true;
    if (node.type !== "element") return false;
    if (HOST_TAGS.has(node.name)) return true;
    if (!node.synthetic) return false;
    const entry = DIL_VOCABULARY[node.name as keyof typeof DIL_VOCABULARY];
    return entry?.kind === "inline";
  }

  private emitNode(node: DilNode, rawExpr = false): string {
    switch (node.type) {
      case "stmt":
        this.statements.push(`${this.statement(node.code)};`);
        return "";
      case "text":
        return this.alloc(node.value);
      case "expr":
        return rawExpr ? node.code : this.safe(node.code, "null");
      case "fence":
        return node.kind === "math"
          ? `__dil.jsx("math",{"block":true,"value":${this.alloc(node.value)}})`
          : this.emitWidget();
      case "if":
        return this.emitIf(node);
      case "each":
        return this.emitEach(node);
      case "element":
        if (this.cellDepth === 0 && this.isElementOnlyParagraph(node)) return this.emitNode(node.children[0], rawExpr);
        if (node.name === "code-block" || node.name === "CodeBlock") return this.emitWidget();
        if (HOST_TAGS.has(node.name)) {
          return this.resolvable(node) ? this.emitHostTag(node) : this.emitDegradedHostTag(node);
        }
        return this.emitElement(node);
    }
  }

  /** Whether a host tag carries the props its client component needs to resolve at all;
   * an `Entity` without a `disambig` hint has nothing to show, so it is not a component. */
  private resolvable(node: DilElementNode): boolean {
    if (node.name !== "Entity") return true;
    return node.attrs.some((attr) => attr.name === "disambig");
  }

  /** A host tag that cannot resolve degrades to a `text` element holding its label, in
   * place of the component call it would otherwise emit. */
  private emitDegradedHostTag(node: DilElementNode): string {
    const value = node.attrs.find((attr) => attr.name === "value");
    if (!value || value.kind !== "string") return "";
    return `__dil.jsx("text",null,${this.alloc(value.value)})`;
  }

  private emitIf(node: Extract<DilNode, { type: "if" }>): string {
    let out = "";
    for (const branch of node.branches) {
      if (branch.cond === null) {
        out += `:${this.emitChildren(branch.body, true)}`;
      } else {
        const guard = `(${this.safe(branch.cond, "false")})?${this.emitChildren(branch.body, true)}`;
        out += out === "" ? guard : `:${guard}`;
      }
    }
    if (!node.branches.some((b) => b.cond === null)) out += ":null";
    return out;
  }

  private emitEach(node: Extract<DilNode, { type: "each" }>): string {
    const body = this.emitChildren(node.body, true);
    const roots = node.body.filter((child) => child.type !== "stmt");
    const rendered = roots.length > 1 ? `__dil.jsx(__dil.Fragment,null,${body})` : body;
    return this.safe(`(${node.list}).map((${node.pattern})=>${this.safe(rendered, "null")})`, "[]");
  }

  /** A fenced block becomes a data contract: an id constant the client resolves against,
   * a null slot it fills, and the conditional that picks the rendered form. */
  private emitWidget(): string {
    const id = this.takeId();
    const slot = this.alloc(null);
    const key = `cdw:${this.cdw++}`;
    return (
      `(${slot}==null?` +
      `__dil.jsx("${this.widgetTag}",{"key":"${key}","invocationId":${id}}):` +
      `${slot}.type==="math"?__dil.jsx("math",{"key":"${key}","value":${slot}.value}):` +
      `${slot}.type==="text"?__dil.jsx("text",{"key":"${key}"},${slot}.value):null)`
    );
  }

  private emitHostTag(node: DilElementNode): string {
    if (!this.components.includes(node.name)) this.components.push(node.name);
    const props: string[] = [];
    for (const attr of node.attrs) {
      if (attr.kind === "string" && CONTENT_PROPS.has(`${node.name}.${attr.name}`)) {
        props.push(`${JSON.stringify(attr.name)}:${this.alloc(attr.value)}`);
        continue;
      }
      const emitted = this.emitProp(attr);
      props.push(`${JSON.stringify(attr.name)}:${emitted.text}`);
    }
    props.push(`"__resolutionId":${this.takeId()}`);
    const children = this.emitChildren(node.children, false, true);
    const call = `__dil.jsx(${node.name},{${props.join(",")}}${children ? `,${children}` : ""})`;
    return this.safe(call, "null");
  }

  private emitElement(node: DilElementNode): string {
    const attrs =
      node.name === "math"
        ? [...node.attrs].sort((a, b) => (a.name === "block" ? -1 : b.name === "block" ? 1 : 0))
        : node.name === "title"
          ? node.attrs.filter((a) => a.name !== "level")
          : node.attrs;
    const props: string[] = [];
    let attrsDynamic = false;
    for (const attr of attrs) {
      if (attr.kind === "string" && CONTENT_PROPS.has(`${node.name}.${attr.name}`)) {
        props.push(`${JSON.stringify(attr.name)}:${this.alloc(attr.value)}`);
        continue;
      }
      const inSvg = node.name === "svg" || (this.svgDepth > 0 && SVG_TAGS.has(node.name));
      const emitted = inSvg ? this.emitSvgProp(attr) : this.emitProp(attr);
      if (emitted.dynamic) attrsDynamic = true;
      props.push(`${JSON.stringify(attr.name)}:${emitted.text}`);
    }
    const singleDynamicChild = node.children.length === 1 && node.children[0].type === "expr";
    const dynamic = attrsDynamic || singleDynamicChild;
    const listMarker = startsListMarker(node);
    const raw = RAW_CHILD_TAGS.has(node.name) && !listMarker;
    if (node.name === "svg") this.svgDepth++;
    if (node.name === "table-cell") this.cellDepth++;
    const children = this.emitChildren(
      node.children,
      !raw,
      singleDynamicChild,
      node.name !== "table-cell" && !listMarker,
    );
    if (node.name === "table-cell") this.cellDepth--;
    if (node.name === "svg") this.svgDepth--;
    const body =
      node.name === "table-cell" && children && !children.startsWith(PARAGRAPH_CALL)
        ? `${PARAGRAPH_CALL}${children})`
        : children;
    const propsText = props.length > 0 ? `{${props.join(",")}}` : "null";
    const call = `__dil.jsx(${JSON.stringify(node.name)},${propsText}${body ? `,${body}` : ""})`;
    return dynamic ? this.safe(call, "null") : call;
  }

  private emitSvgProp(attr: DilAttribute): { text: string; dynamic: boolean } {
    if (attr.kind === "string") return { text: this.alloc(attr.value), dynamic: false };
    if (attr.kind === "boolean") return { text: "true", dynamic: false };
    const code = attr.value as string;
    if (NUMBER.test(code)) return { text: this.alloc(code), dynamic: false };
    return this.emitProp(attr);
  }

  private emitProp(attr: DilAttribute): { text: string; dynamic: boolean } {
    if (attr.kind === "boolean") return { text: "true", dynamic: false };
    if (attr.kind === "string") return { text: JSON.stringify(attr.value), dynamic: false };
    const code = attr.value as string;
    if (NUMBER.test(code)) return { text: code, dynamic: false };
    if (attr.kind === "raw") return { text: JSON.stringify(code), dynamic: false };
    if (code.startsWith("{") || code.startsWith("[")) {
      try {
        return { text: this.alloc(JSON.parse(jsonifyLiteral(code))), dynamic: false };
      } catch {
        return { text: code, dynamic: false };
      }
    }
    if (code.startsWith('"') || code.startsWith("'")) {
      return { text: code, dynamic: false };
    }
    return { text: code, dynamic: true };
  }
}

export function serializeArtifact(document: DilDocument, options: CompileOptions = {}): CompiledArtifact {
  const bodyIndex = options.bodyIndex ?? 0;
  const serialized = new Serializer(options).run(document, bodyIndex);
  return {
    ...serialized,
    fallbackMarkdown: toFallbackMarkdown(document.tree),
    fallbackMarkdownVersion: 1,
  };
}
