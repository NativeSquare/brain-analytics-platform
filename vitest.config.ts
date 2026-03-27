import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "apps/*/tests/**", // Playwright E2E tests
    ],
    projects: [
      "packages/backend/vitest.config.ts",
    ],
  },
});
