import { type CallExpression, parse, type Statement, type Token, type VariableDeclarator } from "acorn";
import { javascript } from "./javascript.ts";
import { topLevelIndex } from "./scanner.ts";

export function readStatements(source: string): { statements: Statement[]; tokens: Token[] } | null {
  const tokens: Token[] = [];
  try {
    const { body } = parse(source, { ...javascript, allowReturnOutsideFunction: true, onToken: tokens });
    return {
      statements: body.filter(
        (statement): statement is Statement =>
          statement.type !== "ImportDeclaration" &&
          statement.type !== "ExportNamedDeclaration" &&
          statement.type !== "ExportDefaultDeclaration" &&
          statement.type !== "ExportAllDeclaration" &&
          statement.type !== "EmptyStatement",
      ),
      tokens,
    };
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof RangeError) return null;
    throw error;
  }
}

export function stateCall(
  binding: VariableDeclarator,
  allowBare = false,
): { key: string; call: CallExpression } | undefined {
  const { id, init } = binding;
  if (init?.type !== "CallExpression" || init.optional) return;
  const { callee } = init;
  const member =
    callee.type === "MemberExpression" &&
    !callee.optional &&
    callee.object.type === "Identifier" &&
    callee.object.name === "DIL";
  const useState =
    member &&
    (callee.computed
      ? callee.property.type === "Literal" && callee.property.value === "useState"
      : callee.property.type === "Identifier" && callee.property.name === "useState");
  if (!useState && !(allowBare && callee.type === "Identifier" && callee.name === "useState")) return;
  const first = id.type === "ArrayPattern" ? id.elements[0] : id;
  const name = first?.type === "AssignmentPattern" ? first.left : first;
  if (name?.type === "Identifier") return { key: name.name, call: init };
}

/** Split a body directive into source statements, with their terminal semicolons removed. */
export function splitStatements(code: string): string[] {
  const parsed = readStatements(code);
  if (parsed)
    return parsed.statements.map((statement) => code.slice(statement.start, statement.end).replace(/;$/, "").trim());

  const parts: string[] = [];
  let start = 0;
  for (let at = topLevelIndex(code, ";"); at >= 0; at = topLevelIndex(code, ";", start)) {
    parts.push(code.slice(start, at));
    start = at + 1;
  }
  parts.push(code.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** Supply the document key for a standalone state declaration. */
export function stateStatement(statement: string): string {
  const parsed = readStatements(statement);
  const declaration = parsed?.statements[0];
  if (
    parsed?.statements.length !== 1 ||
    declaration?.type !== "VariableDeclaration" ||
    declaration.declarations.length !== 1
  )
    return statement;

  const binding = declaration.declarations[0];
  const state = stateCall(binding, true);
  if (state && binding.id.type === "ArrayPattern") {
    const { call, key } = state;
    const open = parsed.tokens.find((token) => token.start >= call.callee.end && token.type.label === "(");
    if (!open) return statement;
    const args = statement.slice(open.end, call.end - 1);
    const initial = args.trim() ? `,${args}` : "";
    return `${statement.slice(0, call.start)}__dil.safe(() => __dil.state(${JSON.stringify(key)}${initial}\n)) ?? []${statement.slice(call.end)}`;
  }
  if (binding.id.type !== "Identifier" || !binding.init) return statement;
  const start = parsed.tokens.find((token) => token.start >= binding.id.end && token.type.label === "=")?.end;
  if (start === undefined) return statement;
  const value = statement.slice(start, declaration.end).replace(/;$/, "").trim();
  return `${declaration.kind} ${binding.id.name} = __dil.safe(() => (${value}\n))`;
}
