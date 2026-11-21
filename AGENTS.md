# AGENTS.md

Developer guide for coding agents working in the **OpenDIL** monorepo.

## Repository Structure

- `packages/core` (`@opendil/core`): Pure TypeScript unified Markdown + DIL parser, stream repair, compiler (`compileDil`), render-tree wire protocol (`render-tree.ts`), and system prompt (`prompt.ts`). Must stay free of React and browser DOM dependencies.
- `packages/runtime` (`@opendil/runtime`): Framework-agnostic browser sandbox (`DilSandbox`, `sandbox-frame.html`, `sandbox-worker.cjs`). `scripts/gen-assets.mjs` inlines the HTML and worker script into `src/sandbox-assets.gen.ts` so downstream bundlers do not need `?raw` loaders.
- `packages/react` (`@opendil/react`): React renderer (`DilRenderer`), design-token mapping (`tokens.ts`), SVG allowlist (`svg-map.ts`), KaTeX helper (`math.ts`), and default primitives (`primitives/*`) with host overrides via `DilComponents` (`components-context.ts`).
- `spec/`: Formal DIL specification (`dil.ebnf` and design/empirical reports).
- `examples/`: Curated `.dil.md` corpus organized by pattern.
- `conformance/`: Executable oracle tests comparing `@opendil/core` + `@opendil/runtime/worker` against captured reference artifacts.
- `benchmarks/`: Private workspace (`@opendil/benchmarks`) for evaluating LLMs across Coding Agent (Pi + Docker sandbox) and Direct Chat tracks with selectable prompt profiles (`full` / `light`).

## Commands

```bash
pnpm install             # Install workspace dependencies
pnpm build               # Generate runtime assets + tsc build all packages
pnpm typecheck           # Type-check all packages
pnpm test                # Run all package unit/fuzz/snapshot tests + conformance suite
pnpm test:conformance    # Run conformance suite only
pnpm test:update         # Regenerate golden parser snapshots in packages/core
pnpm check               # Biome lint + format check
pnpm check:write         # Biome lint + format auto-fix
```

## Conventions

- **Imports**: Packages use ESM with `"type": "module"` and TypeScript `rewriteRelativeImportExtensions: true`, so relative imports use `.ts`/`.tsx` extensions (allowing `node --test` to run `.ts` tests directly without a transpile step).
- **Worker module**: `packages/runtime/src/sandbox-worker.cjs` stays `.cjs` so it runs both as a classic Web Worker script (inlined via `sandbox-assets.gen.ts`) and as a Node-importable module (`@opendil/runtime/worker`).
- **Testing**: Keep tests fast and dependency-light using `node --test`. When modifying parser/compiler semantics, run `pnpm test:conformance` to verify zero regressions against the reference oracle.
