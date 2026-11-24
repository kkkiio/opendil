# DIL Examples & Corpus

Curated, verified `.dil.md` examples covering common visual explanation and interactive UI patterns in **DIL (Dynamic Interface Language)**.

Every example uses the standard `.dil.md` extension (Markdown + DIL mixed) and is valid under [`spec/dil.ebnf`](../spec/dil.ebnf).

## Catalog

| Category | Example | Demonstrates |
| --- | --- | --- |
| **Basics** | [`basics/objects-with-icons.dil.md`](./basics/objects-with-icons.dil.md) | `<box>`, `<row>`, `<col>`, `<icon>`, responsive wrapping |
| **Basics** | [`basics/prose-blocks.dil.md`](./basics/prose-blocks.dil.md) | Document-tier Markdown mixed with DIL: headings, tables, lists, math, code fences, links |
| **Flow** | [`flow/agent-pipeline.dil.md`](./flow/agent-pipeline.dil.md) | Multi-branch architecture & packet flow with `<grid>`, `<box>`, directional `<icon>` |
| **Metrics** | [`metrics/work-progress.dil.md`](./metrics/work-progress.dil.md) | Milestone card, progress bar (`clip`, percentage `width`), `tabularNums`, status badges |
| **Metrics** | [`metrics/layout-metrics.dil.md`](./metrics/layout-metrics.dil.md) | Metric cards, typography scale, `{@body}` state, interpolation |
| **SVG** | [`svg/architecture-diagram.dil.md`](./svg/architecture-diagram.dil.md) | Parametric `<svg>` with `<defs>`/`<marker>`, `{#each}`, arithmetic coordinates |
| **SVG** | [`svg/parametric-grid.dil.md`](./svg/parametric-grid.dil.md) | Nested `{#each}` generating SVG grid geometry |
| **Interactive** | [`interactive/control-flow.dil.md`](./interactive/control-flow.dil.md) | `{@body DIL.useState}`, `{#each}`, `{#if}` / `{:else}`, `<button onClick>` |
| **Interactive** | [`interactive/quiz-radio-reveal.dil.md`](./interactive/quiz-radio-reveal.dil.md) | Interactive quiz with `<radio-group>`, `<radio>`, and state-driven answer reveal |
| **Interactive** | [`interactive/self-check-form.dil.md`](./interactive/self-check-form.dil.md) | Multi-field form (`<radio-group>`, `<label>`, `<textarea>`) triggering `GenUI.issueNewTurn` |

## Contributing Examples

When adding a new `.dil.md` example:
1. Place it under the most relevant category folder (`basics/`, `flow/`, `metrics/`, `svg/`, `interactive/`).
2. Keep it self-contained, realistic, and free of private/identifying data.
3. Verify it parses cleanly with `@kkkiio/dil-core` (`parseDocument(source, { isStreaming: false }).diagnostics.length === 0`).
4. Add a row to the table above.
