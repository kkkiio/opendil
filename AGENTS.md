# OpenDIL AGENTS.md

Developer guide for coding agents working in the **OpenDIL** monorepo.

## Project Structure Guide

### Repo Structure & Important Files

```text
opendil/
├── packages/
│   ├── core/                      # @kkkiio/dil-core — parse, stream repair, compileDil,
│   │                              #   render-tree protocol, system prompt. No React/DOM.
│   ├── runtime/
│   │   └── src/sandbox-worker.cjs # classic Web Worker script AND Node-importable CJS
│   │                              #   (typeof-exports guard). Do not convert to ESM.
│   └── react/                     # @kkkiio/dil-react — DilRenderer (execution
│                                  #   "sandbox" | "direct"), tokens, svg-map, KaTeX,
│                                  #   host overrides via DilComponents.
├── spec/                          # formal specification: dil.ebnf + design/empirical reports
├── examples/                      # curated .dil.md corpus, organized by pattern
├── conformance/                   # executable oracle: ours vs captured reference artifacts
└── benchmarks/                    # @kkkiio/dil-benchmarks — npm-private ("private": true),
                                   #   never ships answer keys
```

## Domain Language

- **DIL** — Dynamic Interface Language: a Markdown superset with JSX-like tags, `{#if}/{#each}` control flow, and `{@body}` JS statements.
- **program** — the output of `compileDil`: script parts plus a constant table. Every document compiles to one, static and dynamic alike.
- **fallback** — the degraded Markdown projection rendered while a program cannot run (streaming tail, syntax errors, sandbox boot).
- **resolved tree** — the pure-data node tree (`ResolvedNode`) an engine hands the renderer; identical across execution modes.
- **DilSandbox** — the engine that runs a program in a hidden iframe + worker, for untrusted model output.
- **DirectRuntime** — the engine that runs a program synchronously in the current context (browser or build machine), for trusted authored DIL.
- **view state** — the persisted `{ root }` envelope of DIL.useState slots; seeds an engine, reported on user interactions (`readDilViewState`).
- **conformance oracle** — captured reference artifacts (`*.raw.js` + `*.data.json`) that our implementation must reproduce exactly.
- **snapshot** — golden files under `packages/core/src/__snapshots__/` (`<name>.tree.yaml` + `<name>.fallback.md`), regenerated with `pnpm test:update`.

## Policies & Mandatory Rules

*None yet. Add trigger-based hard rules here as they arise.*

## Operation Guide

### Commands

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

The three publishable packages (`@kkkiio/dil-core`, `@kkkiio/dil-runtime`, `@kkkiio/dil-react`) move in lockstep — one version number for all of them, tagged `v<version>`. `@kkkiio/dil-benchmarks` is private and never ships.

When asked to cut or release a new version:

1. **Bump and verify**: set the same `version` in all three `packages/*/package.json`, then run `pnpm build && pnpm typecheck && pnpm test && pnpm check` locally — all green before anything is tagged.
2. **Commit and tag**: commit as `chore(release): bump to v<version>` and tag `v<version>`.
3. **Prepare a draft release, then stop**: create a GitHub Release **draft** with `gh release create v<version> --draft --title "v<version>"` and release notes covering the notable changes since the last release. Do **not** publish it — stop and share the draft URL with the maintainer.
4. **The maintainer clicks Publish**: [`release.yml`](.github/workflows/release.yml) then verifies the tag against every manifest, runs the full verification suite, and publishes each package to npm via Trusted Publishing (skipping any version already published, so retries are safe).
