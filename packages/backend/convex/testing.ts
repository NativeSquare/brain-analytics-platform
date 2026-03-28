/**
 * Test-only mutations and queries. Guarded by IS_TEST env var.
 * Used by E2E tests to create test users and seed data.
 */
import { mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

function assertTestMode() {
  if (process.env.IS_TEST !== "true") {
    throw new Error("Test-only function called outside of test mode");
  }
}

/**
 * Find a user by email (test-only, no auth required).
 */
export const findUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    assertTestMode();
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

/**
 * Create a test user with the given email, name, and role.
 * Also ensures a default team exists and assigns the user to it.
 */
export const createTestUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    assertTestMode();

    // Ensure default team exists
    let team = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", "default-club"))
      .first();

    if (!team) {
      const teamId = await ctx.db.insert("teams", {
        name: "Default Club",
        slug: "default-club",
      });
      team = await ctx.db.get(teamId);
    }

    // Create user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      fullName: args.name,
      role: args.role as any,
      status: "active",
      teamId: team!._id,
      emailVerificationTime: Date.now(),
    });

    return userId;
  },
});
