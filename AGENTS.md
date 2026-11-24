# AGENTS.md

Developer guide for coding agents working in the **OpenDIL** monorepo.

## Repository Structure

- `packages/core` (`@opendil/core`): Pure TypeScript unified Markdown + DIL parser, stream repair, compiler (`compileDil`), render-tree wire protocol (`render-tree.ts`), and system prompt (`prompt.ts`). Must stay free of React and browser DOM dependencies.
- `packages/runtime` (`@opendil/runtime`): Framework-agnostic browser sandbox (`DilSandbox`, `sandbox-frame.html`, `sandbox-worker.cjs`). `scripts/gen-assets.mjs` inlines the HTML and worker script into `src/sandbox-assets.gen.ts` so downstream bundlers do not need `?raw` loaders.
- `packages/react` (`@opendil/react`): React renderer (`DilRenderer`), design-token mapping (`tokens.ts`), SVG allowlist (`svg-map.ts`), KaTeX helper (`math.ts`), and default primitives (`primitives/*`) with host overrides via `DilComponents` (`components-context.ts`).
- `spec/`: Formal DIL specification (`dil.ebnf` and design/empirical reports).
- `examples/`: Curated `.dil.md` corpus organized by pattern.
- `conformance/`: Executable oracle tests comparing `@opendil/core` + `@opendil/runtime/worker` against captured reference artifacts.
- `benchmarks/`: Evaluation workspace (`@opendil/benchmarks`, excluded from npm publishing via `"private": true`) for LLMs across Coding Agent (Pi + Docker sandbox) and Direct Chat tracks with selectable prompt profiles (`full` / `light`). Cases carry no answer keys: `scoring.test.ts` exercises the check machinery on synthetic snippets only.

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

## Operation Guide

### PR Workflow

GitHub PRs are gated by [Codex Review Check](.github/workflows/codex-review-check.yml) (`require-lgtm: true`) and structured by [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md).

When asked to open or update a PR (e.g. after aligning on a design/spec):

1. **Write a high-signal PR description**: Fill out every section of [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md) (`Goal`, `Unknown Unknowns & Plan Drifts`, `Visual Explanation & Live Evidence`) as an implementation report for the human — do not restate file-by-file diffs or routine CI test logs.
2. **Self-heal CI & Codex Review in the background**:
   - Wait for checks with `gh pr checks --watch`.
   - If CI or `Codex Review Gate` fails, inspect the failure with `gh run view <run-id> --log-failed`. Fix valid findings (or reply with reasoning and resolve the thread), push, and trigger `@codex review` as instructed until the current `HEAD` receives an LGTM.
   - Update the PR description if fixes introduce new plan drifts or findings worth noting.
3. **Auto-merge or escalate**:
   - Once all checks pass, squash-merge the PR (`gh pr merge --squash --delete-branch`).
   - Stop and discuss with the maintainer if the review loop does not pass after 3 rounds or a finding requires changing the agreed design/spec.

### Release

The three publishable packages (`@opendil/core`, `@opendil/runtime`, `@opendil/react`) move in lockstep — one version number for all of them, tagged `v<version>`. `@opendil/benchmarks` is private and never ships.

When asked to cut or release a new version:

1. **Bump and verify**: set the same `version` in all three `packages/*/package.json`, then run `pnpm build && pnpm typecheck && pnpm test && pnpm check` locally — all green before anything is tagged.
2. **Commit and tag**: commit as `chore(release): bump to v<version>` and tag `v<version>`.
3. **Prepare a draft release, then stop**: create a GitHub Release **draft** with `gh release create v<version> --draft --title "v<version>"` and release notes covering the notable changes since the last release. Do **not** publish it — stop and share the draft URL with the maintainer.
4. **The maintainer clicks Publish**: [`release.yml`](.github/workflows/release.yml) then verifies the tag against every manifest, runs the full verification suite, and publishes each package to npm via Trusted Publishing (skipping any version already published, so retries are safe).

Note: the **first release of each package is published by the maintainer locally** (npm login, then `pnpm -r publish --access public` from the repo root) — a package must exist on npm before its Trusted Publishing configuration can take effect. The maintainer configures the npmjs.org side per package.
