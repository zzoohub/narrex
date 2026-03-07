import { test, expect } from "@playwright/test";

test("@smoke app loads and renders", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/.+/);
});
