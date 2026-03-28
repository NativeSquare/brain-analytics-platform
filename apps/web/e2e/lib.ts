import { Stagehand } from "@browserbasehq/stagehand";
import { beforeAll, afterAll } from "vitest";

export interface E2EContext {
  stagehand: Stagehand;
  goto: (path: string) => Promise<void>;
}

/**
 * Sets up Stagehand for E2E tests.
 * Returns a context object that is populated after beforeAll runs.
 * Access stagehand/goto inside it() blocks — they'll be initialized by then.
 */
export function setupE2E(): E2EContext {
  const BASE_URL = process.env.BASE_URL || "http://localhost:4500";
  // Use a mutable context so references stay valid after beforeAll populates them
  const ctx = {} as E2EContext;

  beforeAll(async () => {
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
    ctx.goto = async (path: string) => {
      const base = BASE_URL.replace(/\/$/, "");
      const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : "/" + path}`;
      await stagehand.page.goto(url, { waitUntil: "domcontentloaded" });
    };
  });

  afterAll(async () => {
    if (ctx.stagehand) {
      await ctx.stagehand.close();
    }
  });

  return ctx;
}
