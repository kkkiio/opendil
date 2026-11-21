export type BenchmarkTrack = "agent" | "chat";

export interface RunnerResult {
  readonly text: string;
  readonly systemPrompt: string;
  readonly toolCallCount?: number;
  readonly toolNames?: readonly string[];
  readonly assistantTurns?: number;
  readonly trajectoryFile?: string;
}

export interface RunnerCallOptions {
  readonly projectRepo?: string;
  readonly caseId?: string;
}

export interface BenchmarkRunner {
  readonly track: BenchmarkTrack;
  readonly label: string;
  run(prompt: string, options?: RunnerCallOptions): Promise<RunnerResult>;
}
