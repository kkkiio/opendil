# OpenDIL

Open-source reference implementation, formal specification, and public corpus for **DIL (Dynamic Interface Language)** — a streaming-first Markdown superset for agent-generated visual explanations and interactive UI.

## Goals

1. **Drop-in open-source implementation** — modular TypeScript packages so web apps, agent UIs, and editors can parse, compile, sandbox-execute, and render DIL with minimal setup.
2. **Open DIL corpus & specification** — public formal grammar (`dil.ebnf`), component catalog, conformance tests, and curated `.dil.md` examples so developers and future foundation models alike can learn DIL natively.

## Packages

| Package | Description | Environment |
| --- | --- | --- |
| [`@opendil/core`](./packages/core) | Unified Markdown + DIL parser, streaming tail repair, compiler (`DilProgram { script, data }`), render-tree protocol, and system prompt (`@opendil/core/prompt`). Zero DOM/React dependencies. | Node.js, Edge, Browser |
| [`@opendil/runtime`](./packages/runtime) | Framework-agnostic isolated browser sandbox (`DilSandbox` over `iframe` + `MessagePort` + Web Worker) and Node worker runner (`@opendil/runtime/worker`). Zero React dependencies. | Browser (sandbox) / Node (worker) |
| [`@opendil/react`](./packages/react) | `<DilRenderer />` React component, design-token mapper, SVG allowlist, KaTeX math, and customizable primitive catalog (`components` override prop). | React 18 / 19 |

## Quick Start

### 1. Render DIL in React

```tsx
import { DilRenderer, DilHostContext } from "@opendil/react";

export function AssistantMessage({ source, isStreaming }: { source: string; isStreaming: boolean }) {
  return (
    <DilHostContext.Provider
      value={{
        busy: isStreaming,
        issueNewTurn: (prompt) => sendUserMessage(prompt),
      }}
    >
      <DilRenderer source={source} isStreaming={isStreaming} />
    </DilHostContext.Provider>
  );
}
```

Customize host design-system primitives (e.g. shadcn/ui `Button`/`Textarea`, Shiki `CodeBlock`, Mermaid, or custom fallback Markdown) via `components`:

```tsx
<DilRenderer
  source={source}
  isStreaming={isStreaming}
  components={{
    Button: MyButton,
    Textarea: MyTextarea,
    CodeBlock: MyShikiCodeBlock,
    Mermaid: MyMermaidDiagram,
    FallbackMarkdown: ({ markdown }) => <MyMarkdown>{markdown}</MyMarkdown>,
  }}
/>
```

### 2. Parse & Compile Anywhere (Node / Edge / Browser)

```ts
import { compileDil, parseDocument, toFallbackMarkdown } from "@opendil/core";
import { DIL_SYSTEM_PROMPT } from "@opendil/core/prompt";

const doc = parseDocument(source, { isStreaming: false });
const compiled = compileDil(doc);

// Every document — static or dynamic — compiles to the same shape:
// `compiled.program` (`{ script, data }`), the executable "DIL JS", plus `compiled.fallback`
// (the degraded Markdown used while the program cannot run).
// Where the program is evaluated (build machine, page, or sandbox) is the host's choice.
const plainMarkdown = toFallbackMarkdown(doc.tree);
```

## Example DIL Snippet

```dil
{@body const [revealed, setRevealed] = DIL.useState(false)}

<box border radius="xl" padding={3} gap={2}>
  <row align="center" justify="between">
    <title>Quick Check</title>
    <badge color="info">Interactive</badge>
  </row>
  <text color="secondary">What does `compileDil()` emit for dynamic documents?</text>
  <button color="primary" onClick={() => setRevealed(!revealed)}>
    {revealed ? "Hide answer" : "Reveal answer"}
  </button>
  {#if revealed}
    <box background="surface-secondary" radius="md" padding={2}>
      <text>A serializable `DilProgram` (`script` + `data`) that runs inside `@opendil/runtime`.</text>
    </box>
  {/if}
</box>
```

## Repository Layout

- [`packages/core`](./packages/core) — `@opendil/core` parser, compiler, render-tree protocol, prompt
- [`packages/runtime`](./packages/runtime) — `@opendil/runtime` isolated sandbox & worker runner
- [`packages/react`](./packages/react) — `@opendil/react` React renderer & primitive catalog
- [`spec/`](./spec) — Formal EBNF grammar ([`dil.ebnf`](./spec/dil.ebnf)), component catalog, compiler/runtime & streaming specs
- [`examples/`](./examples) — Curated `.dil.md` corpus organized by UI pattern
- [`conformance/`](./conformance) — Executable semantic conformance suite against captured reference artifacts
- [`benchmarks/`](./benchmarks) — Dual-track model evaluation suite (`agent` via Pi + Docker sandbox, and `chat` via OpenAI-compatible API)

## Development

```bash
pnpm install
pnpm build       # Build all packages
pnpm test        # Run all unit, property, snapshot, and conformance tests
pnpm typecheck   # Type-check all packages
pnpm check       # Biome lint + format check
```

## License

[MIT](./LICENSE)
