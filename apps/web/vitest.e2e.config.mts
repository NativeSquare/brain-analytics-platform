import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 120000,
    hookTimeout: 180000,
    include: ["e2e/**/*.test.ts"],
    maxConcurrency: 1,
    reporters: ["default", "json"],
    outputFile: { json: "test-results/e2e-results.json" },
  },
});
