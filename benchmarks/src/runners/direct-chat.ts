/**
 * Direct Chat track runner: calls any OpenAI-compatible Chat Completions endpoint
 * directly via native `fetch` (no coding-agent tools or Docker container required).
 */

import { apiKeyFor } from "./pi-agent.ts";
import type { BenchmarkRunner } from "./types.ts";

const DEFAULT_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
};

export interface DirectChatRunnerOptions {
  readonly provider: string;
  readonly model: string;
  readonly dilPrompt: string;
  readonly baseUrl?: string;
}

export function createDirectChatRunner(options: DirectChatRunnerOptions): BenchmarkRunner {
  const apiKey = apiKeyFor(options.provider);
  const baseUrl = (
    options.baseUrl ??
    process.env.DIL_EVAL_BASE_URL ??
    process.env.OPENAI_BASE_URL ??
    DEFAULT_BASE_URLS[options.provider] ??
    ""
  ).replace(/\/+$/, "");

  if (!baseUrl) {
    throw new Error(
      `No base URL for direct-chat provider "${options.provider}". Pass --base-url or set DIL_EVAL_BASE_URL.`,
    );
  }

  return {
    track: "chat",
    label: `${options.provider}/${options.model}`,
    async run(prompt) {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: options.model,
          messages: [
            { role: "system", content: options.dilPrompt },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => response.statusText);
        throw new Error(`Chat completions request failed (${response.status}): ${detail}`);
      }

      const payload = (await response.json()) as {
        readonly choices?: readonly { readonly message?: { readonly content?: string } }[];
      };
      const text = payload.choices?.[0]?.message?.content ?? "";
      return {
        text,
        systemPrompt: options.dilPrompt,
        assistantTurns: 1,
      };
    },
  };
}
