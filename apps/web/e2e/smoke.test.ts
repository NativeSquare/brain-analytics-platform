import { describe, it, expect } from "vitest";
import { setupE2E } from "./lib";

describe("Smoke", () => {
  const ctx = setupE2E();

  it("login page loads without errors", async () => {
    await ctx.goto("http://localhost:4500/login");
    const title = await ctx.stagehand.page.title();
    expect(title).toBeTruthy();
    console.log("Title:", title);
  });

  it("can observe elements on login page", async () => {
    await ctx.goto("http://localhost:4500/login");
    const actions = await ctx.stagehand.page.observe("find all buttons and links on the page");
    console.log("Found actions:", actions.length);
    expect(actions.length).toBeGreaterThan(0);
  });
});
