# OpenDIL — common tasks. Run `just` with no arguments to list recipes.

default:
    @just --list

# The local loop, in order: reveal problems, auto-fix them, test, build.
all:
    pnpm check
    just fmt
    pnpm test
    pnpm build

# Lint + format check (biome).
check:
    pnpm check

# Lint + format auto-fix (biome --write).
fmt:
    pnpm check:write

# All package tests.
test:
    pnpm test

# Generate runtime assets and build every package.
build:
    pnpm build

# Type-check all packages, no emit.
typecheck:
    pnpm typecheck

# Run the Chromium end-to-end tests.
e2e:
    pnpm test:e2e

# Regenerate golden parser snapshots in @kkkiio/dil-core.
snapshot:
    pnpm test:update

# Run the DIL benchmark suite. Needs provider credentials — see benchmarks/README.md.
bench:
    pnpm bench

# Remove build output.
clean:
    rm -rf packages/*/dist
