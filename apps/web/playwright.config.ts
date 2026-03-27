import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["json", { outputFile: "test-results/results.json" }], ["html"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:4500",
    trace: "on-first-retry",
    headless: true,
    screenshot: "on",
  },
  webServer: {
    command: "npx next dev -p 4500",
    url: "http://localhost:4500",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
