/**
 * The artifact serializer: emits a parsed DIL document as the reference compiler's
 * compiled artifact — the closed JavaScript program plus its constant table — matching
 * the captured `model_dil_v2` envelope byte-for-byte after standard formatting.
 *
 * Every emission rule is corpus-derived and enforced by the artifact-diff oracle
 * (`conformance/artifact.test.ts`): guard placement, when the `__dilSafe` prelude is
 * emitted, constant allocation order, the prose-run wrapping, the single-root body shape
 * (no `Fragment` around one root), widget contracts for fenced blocks, host-tag
 * resolution ids, and statement key injection. Platform facts the compiler cannot derive
 * from source arrive as options: the internal widget tag name, an id factory (the platform
 * allocates one id per fence or host tag, in document order), and the DIL block's position
 * in the message.
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
const CONTENT_PROPS = new Set(["math.value", "Entity.value", "textarea.placeholder", "input.placeholder"]);

const NUMBER = /^-?\d+(?:\.\d+)?$/;
const SVG_TAGS = new Set(["rect", "path", "text", "line", "marker"]);

/** Quote unquoted object keys so a `{size:1}` literal becomes JSON-able. */
function jsonifyLiteral(code: string): string {
  return code.replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3');
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
  private readonly widgetTag: string;
  private readonly nextId: () => string;
  private cdw = 0;
  private svgDepth = 0;
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

  run(
    document: DilDocument,
    bodyIndex: number,
  ): Omit<CompiledArtifact, "fallbackMarkdown" | "fallbackMarkdownVersion"> {
    const statements: string[] = [];
    const body: DilNode[] = [];
    for (const node of document.tree) {
      if (node.type === "stmt") statements.push(`${injectStateKeys(node.code)};`);
      else body.push(node);
    }
    const roots = this.emitChildParts(body, false);
    const children = roots.join(",");
    const returned = roots.length === 1 ? children : `__dil.jsx(__dil.Fragment,null,${children})`;
    const program =
      `DIL.render(__dil.jsx(()=>{${PREAMBLE}${statements.join("")}` +
      `return ${returned};},{"key":"body:${bodyIndex}"}));`;
    const constants = Object.fromEntries(this.constants.map((value, i) => [String(i), value]));
    return {
      code: (this.usesSafe ? PRELUDE : "") + program,
      constants,
      requiredComponents: [...this.components].sort(),
    };
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
      parts.push(`__dil.jsx("text",null,${inner})`);
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
        if (node.name === "code-block") return this.emitWidget();
        if (HOST_TAGS.has(node.name)) return this.emitHostTag(node);
        return this.emitElement(node);
    }
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
    let dynamic = false;
    for (const attr of attrs) {
      if (attr.kind === "string" && CONTENT_PROPS.has(`${node.name}.${attr.name}`)) {
        props.push(`${JSON.stringify(attr.name)}:${this.alloc(attr.value)}`);
        continue;
      }
      const inSvg = node.name === "svg" || (this.svgDepth > 0 && SVG_TAGS.has(node.name));
      const emitted = inSvg ? this.emitSvgProp(attr) : this.emitProp(attr);
      if (emitted.dynamic) dynamic = true;
      props.push(`${JSON.stringify(attr.name)}:${emitted.text}`);
    }
    if (node.children.some((child) => child.type === "expr")) dynamic = true;
    const raw = RAW_CHILD_TAGS.has(node.name);
    if (node.name === "svg") this.svgDepth++;
    const children = this.emitChildren(node.children, !raw, dynamic, node.name !== "table-cell");
    if (node.name === "svg") this.svgDepth--;
    const propsText = props.length > 0 ? `{${props.join(",")}}` : "null";
    const call = `__dil.jsx(${JSON.stringify(node.name)},${propsText}${children ? `,${children}` : ""})`;
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
