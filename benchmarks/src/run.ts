/**
 * OpenDIL benchmark CLI runner.
 *
 * Examples:
 *   pnpm bench -- --track agent --provider opencode-go --model glm-5.3
 *   pnpm bench -- --track agent --prompt light --provider deepseek --model deepseek-flash states
 *   pnpm bench -- --track chat --provider openai --model gpt-5 interactive-quiz
 *   pnpm bench -- --dry
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DIL_CASES } from "./cases.ts";
import { type PromptProfile, resolvePromptProfile } from "./prompts.ts";
import { createDirectChatRunner } from "./runners/direct-chat.ts";
import { createPiAgentRunner, type EvalThinkingLevel } from "./runners/pi-agent.ts";
import type { BenchmarkRunner, BenchmarkTrack } from "./runners/types.ts";
import { type BenchmarkSummary, type CaseResult, scoreCase, summarize } from "./scoring.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const BENCH_ROOT = join(HERE, "..");
const RECORDINGS = join(BENCH_ROOT, "recordings");
const REPORTS = join(BENCH_ROOT, "reports");
const LATEST_REPORT = join(BENCH_ROOT, "report.json");

interface CliOptions {
  readonly track: BenchmarkTrack;
  readonly promptProfile: PromptProfile;
  readonly provider: string;
  readonly model: string;
  readonly baseUrl?: string;
  readonly thinkingLevel?: EvalThinkingLevel;
  readonly runs: number;
  readonly dry: boolean;
  readonly record: boolean;
  readonly caseIds: readonly string[];
}

function parseOptions(argv: readonly string[]): CliOptions {
  const option = (name: string): string | undefined => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const trackRaw = option("track") ?? process.env.DIL_EVAL_TRACK ?? "agent";
  if (trackRaw !== "agent" && trackRaw !== "chat") {
    throw new Error(`Invalid --track "${trackRaw}". Expected "agent" or "chat".`);
  }
  const { profile: promptProfile } = resolvePromptProfile(option("prompt") ?? process.env.DIL_EVAL_PROMPT);
  const runs = Number(option("runs") ?? process.env.DIL_EVAL_RUNS ?? "1");
  return {
    track: trackRaw,
    promptProfile,
    provider: option("provider") ?? process.env.DIL_EVAL_PROVIDER ?? "deepseek",
    model: option("model") ?? process.env.DIL_EVAL_MODEL ?? "deepseek-flash",
    baseUrl: option("base-url"),
    thinkingLevel: option("thinking") as EvalThinkingLevel | undefined,
    runs: Number.isFinite(runs) && runs > 0 ? Math.floor(runs) : 1,
    dry: argv.includes("--dry"),
    record: argv.includes("--record"),
    caseIds: argv.filter((argument, index) => !argument.startsWith("--") && !argv[index - 1]?.startsWith("--")),
  };
}

function recordingPath(caseId: string, run: number): string {
  const suffix = run === 1 ? "" : `.${run}`;
  return join(RECORDINGS, `${caseId}${suffix}.md`);
}

function writeFile(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

function readRecording(caseId: string): string {
  const path = recordingPath(caseId, 1);
  if (!existsSync(path)) throw new Error(`Missing recording ${path}; run live with --record first`);
  return readFileSync(path, "utf8");
}

function selectCases(options: CliOptions) {
  return DIL_CASES.filter((dilCase) => {
    if (options.caseIds.length > 0) return options.caseIds.includes(dilCase.id);
    return dilCase.track === "both" || dilCase.track === options.track;
  });
}

async function runCases(options: CliOptions, runner: BenchmarkRunner | null): Promise<BenchmarkSummary> {
  const selected = selectCases(options);
  const results: CaseResult[] = [];

  for (const dilCase of selected) {
    if (options.dry) {
      results.push(scoreCase(dilCase, readRecording(dilCase.id)));
      continue;
    }

    for (let run = 1; run <= options.runs; run++) {
      const answered = await (runner as BenchmarkRunner).run(dilCase.prompt, {
        projectRepo: options.track === "agent" ? dilCase.projectRepo : undefined,
        caseId: dilCase.id,
      });
      const result = scoreCase(dilCase, answered.text, answered);
      results.push(result);
      if (options.record) writeFile(recordingPath(dilCase.id, run), `${answered.text}\n`);
      const toolsInfo = answered.toolCallCount !== undefined ? `  tools:${answered.toolCallCount}` : "";
      process.stdout.write(
        `  ${dilCase.id.padEnd(28)} run ${run}  ${String(result.score).padStart(3)}%  (${result.passed}/${result.total})${toolsInfo}  ${result.diagnostics}\n`,
      );
    }
  }

  return summarize(`${options.track}/${options.promptProfile}`, results);
}

function printSummary(summary: BenchmarkSummary, options: CliOptions, runner: BenchmarkRunner | null): void {
  const lines: string[] = [];
  lines.push(
    `# OpenDIL Benchmark — ${runner?.label ?? "recordings"} [${options.track} / ${options.promptProfile}]${options.dry ? " (dry)" : ""}`,
    "",
    "| case | category | score | DIL nodes | diagnostics |",
    "| --- | --- | ---: | ---: | --- |",
  );
  for (const result of summary.cases) {
    lines.push(`| ${result.id} | ${result.category} | ${result.score}% | ${result.dilNodes} | ${result.diagnostics} |`);
  }
  lines.push("", `Total: **${summary.score}%** (${summary.passed}/${summary.total})`, "");
  process.stdout.write(`${lines.join("\n")}\n`);
}

function persistReport(summary: BenchmarkSummary, options: CliOptions, runner: BenchmarkRunner): void {
  const payload = {
    generatedAt: new Date().toISOString(),
    track: options.track,
    promptProfile: options.promptProfile,
    provider: options.provider,
    model: options.model,
    label: runner.label,
    summary,
  };
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const slug = `${options.track}--${options.promptProfile}--${options.provider}-${options.model}`
    .replaceAll("/", "-")
    .replaceAll(" ", "-");
  writeFile(join(REPORTS, `${slug}.json`), json);
  writeFile(LATEST_REPORT, json);
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const { prompt: dilPrompt } = resolvePromptProfile(options.promptProfile);

  let runner: BenchmarkRunner | null = null;
  if (!options.dry) {
    runner =
      options.track === "agent"
        ? await createPiAgentRunner({
            provider: options.provider,
            model: options.model,
            dilPrompt,
            thinkingLevel: options.thinkingLevel,
          })
        : createDirectChatRunner({
            provider: options.provider,
            model: options.model,
            dilPrompt,
            baseUrl: options.baseUrl,
          });
  }

  const summary = await runCases(options, runner);
  printSummary(summary, options, runner);
  if (runner) persistReport(summary, options, runner);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
