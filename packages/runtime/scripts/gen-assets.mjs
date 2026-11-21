import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(dir, "../src");

const frameHtml = readFileSync(resolve(srcDir, "sandbox-frame.html"), "utf8");
const workerSource = readFileSync(resolve(srcDir, "sandbox-worker.cjs"), "utf8");

const output = `// Generated from sandbox-frame.html and sandbox-worker.js — do not edit manually.
export const SANDBOX_FRAME_HTML = ${JSON.stringify(frameHtml)};
export const SANDBOX_WORKER_SOURCE = ${JSON.stringify(workerSource)};
`;

writeFileSync(resolve(srcDir, "sandbox-assets.gen.ts"), output, "utf8");
