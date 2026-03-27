import { internalMutation } from "./_generated/server";

/**
 * Seed default data: creates the "Default Club" team and patches the first admin user.
 *
 * Idempotent — safe to run multiple times.
 *
 * How to run:
 *   - Via Convex Dashboard → "Run Function" → seed:seedDefaultData
 *   - Via CLI: npx convex run seed:seedDefaultData
 */
export const seedDefaultData = internalMutation({
  args: {},
  handler: async (ctx) => {
    // 1. Check if team already exists (idempotency)
    const existingTeam = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", "default-club"))
      .first();

    let teamId = existingTeam?._id;

    // 2. Create team if it doesn't exist
    if (!teamId) {
      teamId = await ctx.db.insert("teams", {
        name: "Default Club",
        slug: "default-club",
      });
    }

    // 3. Find the first admin user that has no teamId and patch them
    const allUsers = await ctx.db.query("users").collect();
    const adminWithoutTeam = allUsers.find(
      (u) => u.role === "admin" && !u.teamId
    );

    if (adminWithoutTeam) {
      await ctx.db.patch(adminWithoutTeam._id, {
        teamId,
        role: "admin",
        status: "active",
      });
    }
  },
});
