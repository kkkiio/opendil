# OpenDIL

[![Coverage Status](https://coveralls.io/repos/github/kkkiio/opendil/badge.svg?branch=main)](https://coveralls.io/github/kkkiio/opendil?branch=main)

Open-source reference implementation, formal specification, and public corpus for **DIL (Dynamic Interface Language)** — a streaming-first Markdown superset for agent-generated visual explanations and interactive UI.

## Packages

| Package                                  | Description                                                                                   | Environment               |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------- |
| [`@kkkiio/dil-core`](./packages/core)       | Parser, compiler, render-tree protocol, and system prompt for DIL.                            | Node.js, Edge, Browser    |
| [`@kkkiio/dil-runtime`](./packages/runtime) | Framework-agnostic execution runtime for DIL — isolated sandbox or synchronous direct engine. | Browser / Node            |
| [`@kkkiio/dil-react`](./packages/react)     | React renderer and default primitive catalog for DIL.                                         | React 18 / 19 (SSR / SSG) |

## Example DIL Snippet

```dil
{@body const [revealed, setRevealed] = DIL.useState(false)}

<box border radius="xl" padding={3} gap={2}>
  <row align="center" justify="between">
    <title>Quick Check</title>
    <badge color="info">Interactive</badge>
  </row>
  <text color="secondary">What does `compileDil()` emit?</text>
  <button color="primary" onClick={() => setRevealed(!revealed)}>
    {revealed ? "Hide answer" : "Reveal answer"}
  </button>
  {#if revealed}
    <box background="surface-secondary" radius="md" padding={2}>
      <text>A serializable `DilProgram` (`script` + `data`) that runs inside `@kkkiio/dil-runtime`.</text>
    </box>
  {/if}
</box>
```

## Quick Start

### 1. Render DIL in React

```tsx
import { DilRenderer, DilHostContext } from "@kkkiio/dil-react";

export function AssistantMessage({
  source,
  isStreaming,
}: {
  source: string;
  isStreaming: boolean;
}) {
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
import { compileDil, parseDocument, toFallbackMarkdown } from "@kkkiio/dil-core";
import { DIL_SYSTEM_PROMPT } from "@kkkiio/dil-core/prompt";

const doc = parseDocument(source, { isStreaming: false });
const compiled = compileDil(doc);

// Every document — static or dynamic — compiles to the same shape:
// `compiled.program` (`{ script, data }`), the executable "DIL JS", plus `compiled.fallback`
// (the degraded Markdown used while the program cannot run).
// Where the program is evaluated (build machine, page, or sandbox) is the host's choice.
const plainMarkdown = toFallbackMarkdown(doc.tree);
```

### 3. Bake DIL into a Static Site (trusted sources)

For DIL you wrote yourself — a blog, docs, examples — run it in the host context with
`DirectRuntime`: no iframe, no boot latency, and a static build resolves the program
during rendering, baking the finished HTML into the page:

```tsx
import { DilRenderer } from "@kkkiio/dil-react";

// Resolves at build time (SSG) and again in the browser on hydration.
<DilRenderer source={dilExample} execution="direct" />
```

Persist a card's state across reloads: store the snapshots reported by
`onViewStateChange` and pass them back as `viewState` on the next render.
