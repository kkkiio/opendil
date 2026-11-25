import { type Expression, parse } from "acorn";

export const javascript = { ecmaVersion: "latest", sourceType: "script" } as const;

export function readExpression(source: string): { node: Expression; code: string } | null {
  try {
    const wrapped = `(${source}\n)`;
    let trailingLineComment = false;
    const { body } = parse(wrapped, {
      ...javascript,
      preserveParens: true,
      onComment(block, _text, _start, end) {
        if (!block && end === source.length + 1) trailingLineComment = true;
      },
    });
    const statement = body[0];
    if (body.length !== 1 || statement?.type !== "ExpressionStatement") return null;
    const outer = statement.expression;
    if (outer.type !== "ParenthesizedExpression" || outer.end !== wrapped.length) return null;
    let expression = outer.expression;
    while (expression.type === "ParenthesizedExpression") expression = expression.expression;
    return { node: expression, code: trailingLineComment ? `${source}\n` : source };
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof RangeError) return null;
    throw error;
  }
}

type Constant = string | number | boolean | null | Constant[] | { [key: string]: Constant };

export function readConstant(node: Expression): Constant | undefined {
  if (node.type === "Literal") {
    const { value } = node;
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  }
  if (node.type === "UnaryExpression" && (node.operator === "-" || node.operator === "+")) {
    const value = readConstant(node.argument);
    return typeof value === "number" ? (node.operator === "-" ? -value : value) : undefined;
  }
  if (node.type === "ArrayExpression") {
    const values: Constant[] = [];
    for (const element of node.elements) {
      if (!element || element.type === "SpreadElement") return undefined;
      const value = readConstant(element);
      if (value === undefined) return undefined;
      values.push(value);
    }
    return values;
  }
  if (node.type === "ObjectExpression") {
    const entries: [string, Constant][] = [];
    for (const property of node.properties) {
      if (
        property.type !== "Property" ||
        property.computed ||
        property.kind !== "init" ||
        property.method ||
        property.shorthand
      )
        return undefined;
      const key =
        property.key.type === "Identifier"
          ? property.key.name
          : property.key.type === "Literal"
            ? property.key.value
            : undefined;
      if ((typeof key !== "string" && typeof key !== "number") || key === "__proto__") return undefined;
      const value = readConstant(property.value);
      if (value === undefined) return undefined;
      entries.push([String(key), value]);
    }
    return Object.fromEntries(entries);
  }
  return undefined;
}
