# OpenDIL Benchmarks

Evaluates how effectively models use **DIL (Dynamic Interface Language)** to explain complex systems and build interactive cards, using `@opendil/core` and `@opendil/runtime/worker` for deterministic scoring.

## Dual Tracks

- **`agent` (default — Coding Agent track)**: Runs a real **Pi coding agent** session (`read`, `bash`, `edit`, `write`, default `thinkingLevel: "high"`) with optional `--network=none` Docker repo sandboxes (`projectRepo`). Measures whether high-reasoning coding agents can turn deep codebase findings into human-aligned DIL explanations instead of walls of dense text.
- **`chat` (Direct Chat track)**: Calls any OpenAI-compatible Chat Completions endpoint directly via `fetch` (no tools or Docker needed) for general visual explanations and interactive UI cards.

## Prompt Profiles

- `full` (default): Full `DIL_SYSTEM_PROMPT` from `@opendil/core/prompt` (complete reference + examples).
- `light`: Compact syntax reference without full few-shot examples, to measure how models perform under lighter prompt budgets.

## Usage

```bash
# Offline scorer self-test (no API key or Docker required)
pnpm --filter @opendil/benchmarks test

# Coding Agent track (Pi + Docker sandbox for repo cases)
pnpm bench -- --track agent --provider opencode-go --model glm-5.3

# Light prompt profile on a specific case
pnpm bench -- --track agent --prompt light --provider deepseek --model deepseek-flash states

# Direct Chat track (OpenAI-compatible endpoint)
pnpm bench -- --track chat --provider openai --model gpt-5 interactive-quiz
```

Credentials resolve in order: environment variable (`<PROVIDER>_API_KEY` or provider-specific var), repo `.env`, then `~/.pi/agent/auth.json`.
