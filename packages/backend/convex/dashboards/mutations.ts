import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAdmin } from "../lib/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const categoryValidator = v.union(
  v.literal("Match Analysis"),
  v.literal("Season Analysis"),
  v.literal("Player Analysis"),
  v.literal("Tactical"),
  v.literal("Set Pieces"),
  v.literal("Opposition"),
  v.literal("Trends"),
  v.literal("Officials"),
  v.literal("Possession")
);

// ---------------------------------------------------------------------------
// toggleRoleDashboardAccess — AC-14
// ---------------------------------------------------------------------------

/**
 * Toggle a role's access to a dashboard. Admin-only.
 * If the assignment exists, delete it. If not, create it.
 */
export const toggleRoleDashboardAccess = mutation({
  args: {
    dashboardSlug: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("coach"),
      v.literal("analyst"),
      v.literal("physio"),
      v.literal("player"),
      v.literal("staff")
    ),
  },
  handler: async (ctx, { dashboardSlug, role }) => {
    const { teamId } = await requireAdmin(ctx);

    const existing = await ctx.db
      .query("roleDashboards")
      .withIndex("by_teamId_role_dashboardSlug", (q) =>
        q
          .eq("teamId", teamId)
          .eq("role", role)
          .eq("dashboardSlug", dashboardSlug)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { assigned: false };
    }

    await ctx.db.insert("roleDashboards", {
      teamId,
      role,
      dashboardSlug,
      createdAt: Date.now(),
    });

    return { assigned: true };
  },
});

// ---------------------------------------------------------------------------
// createDashboard — AC-15
// ---------------------------------------------------------------------------

/**
 * Create a new dashboard entry. Admin-only.
 * Slug is auto-generated from title and must be unique within the team.
 */
export const createDashboard = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: categoryValidator,
    icon: v.string(),
  },
  handler: async (ctx, { title, description, category, icon }) => {
    const { teamId } = await requireAdmin(ctx);

    const slug = generateSlug(title);

    // Check slug uniqueness within team
    const existing = await ctx.db
      .query("dashboards")
      .withIndex("by_teamId_slug", (q) =>
        q.eq("teamId", teamId).eq("slug", slug)
      )
      .first();

    if (existing) {
      throw new ConvexError({
        code: "DUPLICATE" as const,
        message: `A dashboard with the slug "${slug}" already exists.`,
      });
    }

    const dashboardId = await ctx.db.insert("dashboards", {
      teamId,
      title,
      description,
      category,
      icon,
      slug,
      createdAt: Date.now(),
    });

    return dashboardId;
  },
});

// ---------------------------------------------------------------------------
// updateDashboard — AC-16
// ---------------------------------------------------------------------------

/**
 * Update dashboard metadata. Admin-only.
 * If the title changes, the slug is re-generated and must remain unique.
 */
export const updateDashboard = mutation({
  args: {
    dashboardId: v.id("dashboards"),
    title: v.string(),
    description: v.string(),
    category: categoryValidator,
    icon: v.string(),
  },
  handler: async (ctx, { dashboardId, title, description, category, icon }) => {
    const { teamId } = await requireAdmin(ctx);

    const dashboard = await ctx.db.get(dashboardId);
    if (!dashboard || dashboard.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Dashboard not found.",
      });
    }

    const newSlug = generateSlug(title);

    // If slug changed, check uniqueness
    if (newSlug !== dashboard.slug) {
      const conflict = await ctx.db
        .query("dashboards")
        .withIndex("by_teamId_slug", (q) =>
          q.eq("teamId", teamId).eq("slug", newSlug)
        )
        .first();

      if (conflict) {
        throw new ConvexError({
          code: "DUPLICATE" as const,
          message: `A dashboard with the slug "${newSlug}" already exists.`,
        });
      }

      // Update roleDashboards references to the new slug
      const roleAssignments = await ctx.db
        .query("roleDashboards")
        .withIndex("by_teamId_dashboardSlug", (q) =>
          q.eq("teamId", teamId).eq("dashboardSlug", dashboard.slug)
        )
        .collect();

      for (const assignment of roleAssignments) {
        await ctx.db.patch(assignment._id, { dashboardSlug: newSlug });
      }
    }

    await ctx.db.patch(dashboardId, {
      title,
      description,
      category,
      icon,
      slug: newSlug,
    });

    return dashboardId;
  },
});
