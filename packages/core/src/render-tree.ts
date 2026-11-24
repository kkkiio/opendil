export type ResolvedProps = Readonly<Record<string, unknown>>;

export interface DilHandler {
  readonly id: string;
}

export type ResolvedNode =
  | { readonly kind: "text"; readonly value: string }
  | {
      readonly kind: "element";
      readonly name: string;
      readonly synthetic?: boolean;
      readonly props: ResolvedProps;
      readonly children: readonly ResolvedNode[];
    };

export interface DilSite {
  readonly name: string;
  readonly offset: number;
  readonly synthetic?: boolean;
  readonly props: ResolvedProps;
  readonly dynamic: readonly string[];
}

export type DilData = readonly (string | DilSite)[];
export type WireNode = string | [number, Record<string, unknown>, WireNode[]];

export const MAX_DIL_NODES = 5_000;
export const MAX_DIL_DEPTH = 64;
const MAX_TEXT = 1_000_000;

interface TransferBudget {
  fields: number;
  text: number;
}

function readValue(value: unknown, budget: TransferBudget, depth = 0): unknown {
  if (--budget.fields < 0 || depth > 16) throw new Error("Invalid DIL value size");
  if (value == null || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)))
    return value;
  if (typeof value === "string") {
    budget.text -= value.length;
    if (budget.text < 0) throw new Error("Invalid DIL text size");
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > budget.fields) throw new Error("Invalid DIL list size");
    return value.map((item) => readValue(item, budget, depth + 1));
  }
  if (typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error("Invalid DIL value");
  }
  const fields = Object.entries(value);
  if (fields.length > budget.fields) throw new Error("Invalid DIL record size");
  return Object.fromEntries(
    fields.map(([key, item]) => {
      readValue(key, budget);
      return [key, readValue(item, budget, depth + 1)];
    }),
  );
}

export function readViewState(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error("Invalid DIL state");
  }
  return readValue(value, { fields: MAX_DIL_NODES * 8, text: MAX_TEXT }) as Record<string, unknown>;
}

/** A persisted card snapshot: the DIL state slots under a `root` envelope. Hosts store this per message or per session and seed the engine with it on reload. */
export interface DilViewState {
  readonly root: Readonly<Record<string, unknown>>;
}

/**
 * Read a bounded DIL snapshot from untrusted storage (a session log, localStorage, a
 * request payload). The budget mirrors the worker's own limits so a crafted snapshot can
 * never do more damage than a legitimate program could. Returns `undefined` for anything
 * that is not shaped like a snapshot; the engines then start from empty state.
 */
export function readDilViewState(value: unknown): DilViewState | undefined {
  if (!value || typeof value !== "object" || !("root" in value)) return undefined;
  const root: unknown = value.root;
  if (!root || typeof root !== "object" || Object.getPrototypeOf(root) !== Object.prototype) {
    return undefined;
  }
  const pending: [unknown, number][] = [[root, 0]];
  let fields = 40_000;
  let text = 1_000_000;
  for (let field = pending.pop(); field; field = pending.pop()) {
    const [data, depth] = field;
    if (--fields < 0 || depth > 16) return undefined;
    if (typeof data === "string") text -= data.length;
    else if (data === null || typeof data === "boolean" || (typeof data === "number" && Number.isFinite(data))) {
      continue;
    } else if (Array.isArray(data)) {
      if (data.length > fields - pending.length) return undefined;
      for (const item of data) pending.push([item, depth + 1]);
    } else if (data && typeof data === "object" && Object.getPrototypeOf(data) === Object.prototype) {
      const entries = Object.entries(data);
      fields -= entries.length;
      if (entries.length > fields - pending.length) return undefined;
      for (const [key, item] of entries) {
        text -= key.length;
        pending.push([item, depth + 1]);
      }
    } else {
      return undefined;
    }
    if (text < 0) return undefined;
  }
  return { root: root as Record<string, unknown> };
}

export function readTree(value: unknown, data: DilData): ResolvedNode[] {
  let remaining = MAX_DIL_NODES;
  const budget = { fields: MAX_DIL_NODES * 8, text: MAX_TEXT };
  const visit = (nodes: unknown, depth: number): ResolvedNode[] => {
    if (!Array.isArray(nodes) || depth > MAX_DIL_DEPTH) throw new Error("Invalid DIL tree");
    const result: ResolvedNode[] = [];
    for (const node of nodes) {
      if (--remaining < 0) throw new Error("DIL tree exceeds its node limit");
      if (typeof node === "string") {
        readValue(node, budget);
        if (node) result.push({ kind: "text", value: node });
        continue;
      }
      if (!Array.isArray(node) || node.length !== 3 || !Number.isInteger(node[0])) {
        throw new Error("Invalid DIL node");
      }
      const site = data[node[0]];
      if (!site || typeof site === "string" || !node[1] || typeof node[1] !== "object") {
        throw new Error("Invalid DIL component");
      }
      const props: Record<string, unknown> = Object.assign(Object.create(null), site.props);
      for (const name of site.dynamic) {
        if (!Object.hasOwn(node[1], name)) continue;
        const value: unknown = node[1][name];
        if (name === "onClick" || name === "onChange" || name === "onSubmit") {
          if (
            value &&
            typeof value === "object" &&
            "id" in value &&
            typeof value.id === "string" &&
            value.id.length <= 512
          ) {
            props[name] = { id: value.id } satisfies DilHandler;
          }
        } else {
          props[name] = readValue(value, budget);
        }
      }
      result.push({
        kind: "element",
        name: site.name,
        synthetic: site.synthetic,
        props,
        children: visit(node[2], depth + 1),
      });
    }
    return result;
  };
  return visit(value, 0);
}
