import { test, expect } from "@playwright/test";

test("smoke: page loads", async ({ page }) => {
  const baseUrl = process.env.BASE_URL || "http://localhost:4500";
  await page.goto(baseUrl);
  await expect(page).not.toHaveTitle("");
  await page.screenshot({ path: "test-results/smoke-screenshot.png" });
});
