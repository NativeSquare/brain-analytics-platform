import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    "process.env.BASE_URL": JSON.stringify(process.env.BASE_URL || "http://localhost:4500"),
  },
  test: {
    // globalSetup removed — dev server must be started externally or via CI
    testTimeout: 120000,
    hookTimeout: 180000,
    include: ["e2e/**/*.test.ts"],
    maxConcurrency: 1,
    reporters: ["default", "json"],
    outputFile: { json: "test-results/e2e-results.json" },
  },
});
