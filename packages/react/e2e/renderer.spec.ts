import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { build } from "esbuild";

let bundle: string;

test.beforeAll(async () => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL("./host.tsx", import.meta.url))],
    bundle: true,
    write: false,
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  bundle = result.outputFiles[0].text;
});

for (const mode of ["sandbox", "direct"]) {
  test(`${mode}: a streamed card remains interactive and restores saved state`, async ({ page }) => {
    await page.route("http://dil.test/**", (route) =>
      route.request().url().endsWith("/host.js")
        ? route.fulfill({ contentType: "text/javascript", body: bundle })
        : route.fulfill({
            contentType: "text/html",
            body: '<!doctype html><title>Inventory</title><div id="app"></div><script src="/host.js"></script>',
          }),
    );

    await page.goto(`http://dil.test/?mode=${mode}`);
    await expect(page.getByText("Checked items: 0")).toBeVisible();
    await page.getByRole("button", { name: "Check item" }).click();
    await expect(page.getByText("Checked items: 1")).toBeVisible();

    await page.getByRole("button", { name: "More output" }).click();
    await expect(page.getByText("Checking the inventory")).toBeVisible();
    await expect(page.getByText("Checked items: 1")).toBeVisible();

    await page.getByRole("button", { name: "Finish output" }).click();
    await expect(page.getByText("Inventory complete")).toBeVisible();
    await page.getByRole("button", { name: "Check item" }).click();
    await expect(page.getByText("Checked items: 2")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Checked items: 2")).toBeVisible();
    await page.getByRole("button", { name: "Check item" }).click();
    await expect(page.getByText("Checked items: 3")).toBeVisible();
  });
}
