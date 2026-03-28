import { Stagehand } from "@browserbasehq/stagehand";
import { beforeAll, afterAll } from "vitest";

export interface E2EContext {
  stagehand: Stagehand;
  goto: (path: string) => Promise<void>;
  auth: {
    signInAs: (options?: { email?: string; name?: string; role?: string }) => Promise<void>;
  };
}

/**
 * Sets up Stagehand for E2E tests with auth support.
 * Returns a context object populated after beforeAll runs.
 *
 * Usage:
 *   const ctx = setupE2E();
 *   it("test", async () => {
 *     await ctx.auth.signInAs({ role: "admin" });
 *     await ctx.goto("/players");
 *     await ctx.stagehand.page.act("click Add Player button");
 *   });
 */
export function setupE2E(): E2EContext {
  const ctx = {} as E2EContext;

  beforeAll(async () => {
    const BASE_URL = "http://localhost:4500";
    const stagehand = new Stagehand({
      env: "LOCAL",
      modelName: process.env.STAGEHAND_MODEL || "openai/gpt-4o-mini",
      modelClientOptions: {
        apiKey: process.env.OPENAI_API_KEY,
      },
      localBrowserLaunchOptions: {
        headless: true,
      },
      verbose: 0,
    });
    await stagehand.init();
    ctx.stagehand = stagehand;

    const makeUrl = (path: string) => {
      const base = BASE_URL.replace(/\/$/, "");
      return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : "/" + path}`;
    };

    ctx.goto = async (path: string) => {
      await stagehand.page.goto(makeUrl(path), { waitUntil: "domcontentloaded" });
    };

    ctx.auth = {
      signInAs: async ({ email = "admin@test.com", name = "Test Admin", role = "admin" } = {}) => {
        await stagehand.page.goto(makeUrl("/test-auth"), { waitUntil: "domcontentloaded" });

        const emailInput = await stagehand.page.locator('[data-testid="test-auth-email"]');
        await emailInput.fill(email);

        const nameInput = await stagehand.page.locator('[data-testid="test-auth-name"]');
        await nameInput.fill(name);

        const roleSelect = await stagehand.page.locator('[data-testid="test-auth-role"]');
        await roleSelect.selectOption(role);

        const submitBtn = await stagehand.page.locator('[data-testid="test-auth-submit"]');
        await submitBtn.click();

        await stagehand.page.waitForFunction(
          () => {
            const el = document.querySelector('[data-testid="test-auth-status"]');
            return el?.textContent === "Authenticated!" || el?.textContent?.startsWith("Error:");
          },
          { timeout: 15000 },
        );

        const statusEl = await stagehand.page.locator('[data-testid="test-auth-status"]');
        const statusText = await statusEl.textContent();
        if (statusText !== "Authenticated!") {
          throw new Error(`Test auth failed: ${statusText}`);
        }
      },
    };
  });

  afterAll(async () => {
    if (ctx.stagehand) await ctx.stagehand.close();
  });

  return ctx;
}
