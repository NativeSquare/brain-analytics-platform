import { describe, it, expect } from "vitest";
import { setupE2E } from "./lib";

describe("Smoke", () => {
  const ctx = setupE2E();

  it("login page loads without errors", async () => {
    await ctx.goto("/login");
    const title = await ctx.stagehand.page.title();
    expect(title).toBeTruthy();
  });

  it("can authenticate as admin via test-auth", async () => {
    await ctx.auth.signInAs({ role: "admin" });
    // After auth, navigate to a protected page
    await ctx.goto("/players");
    // Verify we're not redirected to login
    const url = ctx.stagehand.page.url();
    expect(url).toContain("/players");
  });
});
