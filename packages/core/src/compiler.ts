import { collectStatements, toFallbackMarkdown } from "./index.ts";
import { type DilData, type DilSite, MAX_DIL_DEPTH, MAX_DIL_NODES } from "./render-tree.ts";
import { stateStatement } from "./statements.ts";
import type { DilDocument, DilNode } from "./types.ts";

export type ScriptPart =
  | string
  | { readonly kind: "expr" | "statement" | "each"; readonly code: string; readonly fallback: string };

export interface DilProgram {
  readonly script: readonly ScriptPart[];
  readonly data: DilData;
}

/**
 * The compiled artifact ("DIL JS"): a JS factory emitted as script parts plus its constant
 * table, and the degraded Markdown projection used while the program cannot run.
 */
export interface CompiledDil {
  readonly program: DilProgram;
  readonly fallback: string;
}

/**
 * Compile a DIL document into its executable form. Every document becomes a program —
 * static and dynamic content alike — so downstream has a single shape to run. Where the
 * program is evaluated (a server build, the page's main thread, or the isolated sandbox)
 * is the host's decision, not the compiler's.
 */
export function compileDil(document: DilDocument): CompiledDil {
  const data: (string | DilSite)[] = [];
  const script: ScriptPart[] = [];
  let nodesLeft = MAX_DIL_NODES;
  const emitValue = (code: string, fallback: string): void => {
    script.push("(__dil.safe(()=>(", { kind: "expr", code, fallback }, "\n)))");
  };

  const emitNodes = (nodes: readonly DilNode[], depth = 0): void => {
    script.push("__dil.flatten([");
    for (const node of nodes) {
      if (depth >= MAX_DIL_DEPTH || nodesLeft <= 0) break;
      if (node.type === "stmt") continue;
      nodesLeft--;
      if (node.type === "text") {
        const index = data.push(node.value) - 1;
        script.push(`__dil.text(__dilData[${index}]),`);
        continue;
      }
      if (node.type === "expr") {
        script.push("__dil.text(");
        emitValue(node.code, "undefined");
        script.push("),");
        continue;
      }
      if (node.type === "if") {
        script.push("(");
        for (const branch of node.branches) {
          if (branch.cond !== null) {
            emitValue(branch.cond, "false");
            script.push("?");
          }
          emitNodes(branch.body, depth + 1);
          if (branch.cond !== null) script.push(":");
        }
        if (node.branches.at(-1)?.cond !== null) script.push("null");
        script.push("),");
        continue;
      }
      if (node.type === "each") {
        script.push("__dil.each(");
        emitValue(node.list, "[]");
        script.push(
          ",__dilPath,",
          {
            kind: "each",
            code: `${node.item},${node.index ?? "__dilIndex"},__dilPath`,
            fallback: "__dilItem,__dilIndex,__dilPath",
          },
          "=>",
        );
        emitNodes(node.body, depth + 1);
        script.push("),");
        continue;
      }
      const props: Record<string, unknown> = Object.create(null);
      const dynamicProps = new Map<string, string>();
      if (node.type === "element") {
        for (const attribute of node.attrs) {
          const { name, kind, value } = attribute;
          if (name === "closed" || (node.name === "markdown-image" && name === "src" && kind === "expr")) continue;
          if (kind === "expr") {
            const code = String(value).trim();
            if (/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)$/.test(code)) {
              const literal = JSON.parse(code);
              if (typeof literal !== "number" || Number.isFinite(literal)) {
                dynamicProps.delete(name);
                props[name] = literal;
                continue;
              }
            }
            delete props[name];
            dynamicProps.set(name, code);
          } else {
            dynamicProps.delete(name);
            props[name] = kind === "boolean" ? true : value;
          }
        }
      } else if (node.kind === "math") {
        props.value = node.value;
        props.block = true;
      } else {
        props.language = node.info.trim().split(/\s+/)[0] || undefined;
      }
      props.closed = node.closed;
      const name = node.type === "element" ? node.name : node.kind === "math" ? "math" : "code-block";
      const synthetic = node.type === "element" && node.synthetic ? true : undefined;
      const site =
        data.push({
          name,
          offset: node.pos,
          synthetic,
          props,
          dynamic: [...dynamicProps.keys()],
        }) - 1;
      script.push(`__dil.node(${site},__dilPath,{`);
      for (const [key, value] of dynamicProps) {
        script.push(`[${JSON.stringify(key)}]:`);
        emitValue(value, "undefined");
        script.push(",");
      }
      script.push("},()=>");
      emitNodes(
        node.type === "element"
          ? node.children
          : node.kind === "math"
            ? []
            : [{ type: "text", value: node.value, pos: node.pos }],
        depth + 1,
      );
      script.push("),");
    }
    script.push("])");
  };

  for (const statement of collectStatements(document.raw)) {
    script.push({ kind: "statement", code: stateStatement(statement), fallback: "" }, "\n;");
  }
  script.push("return ");
  emitNodes(document.tree);
  return { program: { script, data }, fallback: toFallbackMarkdown(document.tree) };
}
