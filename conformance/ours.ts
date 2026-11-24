import {
  compileDil,
  type DilHandler,
  type DilViewState,
  parseDocument,
  type ResolvedNode,
  readTree,
} from "@kkkiio/dil-core";
import { createProgram } from "@kkkiio/dil-runtime/worker";
import type { ReferenceEffect } from "./reference.ts";

export interface OurProgram {
  render(): readonly ResolvedNode[];
  state(): Record<string, unknown>;
  effects(): readonly ReferenceEffect[];
  clearEffects(): void;
  /** Apply one event to the node a user would have touched. */
  change(tag: string, value: unknown): boolean;
  click(tag: string): boolean;
}

export function createOurProgram(source: string, viewState?: DilViewState): OurProgram {
  const performed: ReferenceEffect[] = [];
  const runtime = createProgram(viewState?.root);
  const { program } = compileDil(parseDocument(source, { isStreaming: false }));
  let result = runtime.load(program);
  let tree = readTree(result.tree, program.data);
  const fire = (value: unknown, args?: unknown[]): void => {
    if (!value) return;
    const next = runtime.trigger((value as DilHandler).id, args);
    if (!next) return;
    result = next;
    tree = readTree(next.tree, program.data);
    for (const prompt of next.effects) performed.push({ name: "issueNewTurn", args: [prompt] });
  };
  const find = (nodes: readonly ResolvedNode[], tag: string): ResolvedNode | null => {
    for (const node of nodes) {
      if (node.kind !== "element") continue;
      if (node.name === tag) return node;
      const nested = find(node.children, tag);
      if (nested) return nested;
    }
    return null;
  };

  return {
    render: () => tree,
    state: () => result?.state ?? {},
    effects: () => performed,
    clearEffects: () => performed.splice(0, performed.length),
    change: (tag, value) => {
      const node = find(tree, tag);
      if (!node || node.kind !== "element") return false;
      fire(node.props.onChange, [value]);
      return true;
    },
    click: (tag) => {
      // The last matching node: a card's submit button follows its controls.
      const all: ResolvedNode[] = [];
      const collect = (nodes: readonly ResolvedNode[]): void => {
        for (const node of nodes) {
          if (node.kind !== "element") continue;
          if (node.name === tag) all.push(node);
          collect(node.children);
        }
      };
      collect(tree);
      const node = all.at(-1);
      if (!node || node.kind !== "element") return false;
      fire(node.props.onClick);
      return true;
    },
  };
}
