import { DIL_SYSTEM_PROMPT } from "@kkkiio/dil-core/prompt";

export type PromptProfile = "full" | "light";

const DIL_LIGHT_PROMPT = `You may use DIL (Dynamic Interface Language), a Markdown superset for visual explanations and interactive cards.

Core tags:
- Layout: <box>, <row>, <col>, <grid columns={n}>, <grid-item>, <divider/>
- Typography & icons: <title>, <text>, <caption>, <badge>, <icon name="arrow-right"/>
- Diagrams: <svg viewBox="..."> with <rect>, <path>, <line>, <circle>, <text>, <defs>/<marker>
- Controls & state: {@body const [x, setX] = DIL.useState(init)}, <button onClick={...}>, <radio-group value={x} onChange={setX}>, <radio value="...">, <textarea value={x} onChange={setX}/>
- Control flow: {#each items as item, i}...{/each}, {#if cond}...{:else}...{/if}, {expr}

Common attributes: border, radius="sm|md|lg|xl|full", padding={2}, gap={2}, background="surface-secondary|muted|success|warning|danger|info", color="secondary|success|warning|danger|info", width, align, justify.
Do not place Markdown block syntax (fences, tables) inside DIL elements; inline Markdown (**bold**, \`code\`) is allowed.`;

export const PROMPT_PROFILES: Readonly<Record<PromptProfile, string>> = {
  full: DIL_SYSTEM_PROMPT,
  light: DIL_LIGHT_PROMPT,
};

export function resolvePromptProfile(name: string | undefined): {
  readonly profile: PromptProfile;
  readonly prompt: string;
} {
  if (!name || name === "full") return { profile: "full", prompt: PROMPT_PROFILES.full };
  if (name === "light") return { profile: "light", prompt: PROMPT_PROFILES.light };
  throw new Error(`Unknown prompt profile "${name}". Available: ${Object.keys(PROMPT_PROFILES).join(", ")}`);
}
