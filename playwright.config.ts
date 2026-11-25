import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./packages/react/e2e",
  use: { browserName: "chromium" },
  reporter: "list",
});
