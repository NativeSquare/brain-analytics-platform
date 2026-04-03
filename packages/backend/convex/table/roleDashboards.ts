import { defineTable } from "convex/server";
import { v } from "convex/values";

export const roleDashboards = defineTable({
  teamId: v.id("teams"),
  role: v.union(
    v.literal("admin"),
    v.literal("coach"),
    v.literal("analyst"),
    v.literal("physio"),
    v.literal("player"),
    v.literal("staff")
  ),
  dashboardSlug: v.string(),
  createdAt: v.number(),
})
  .index("by_teamId", ["teamId"])
  .index("by_teamId_role", ["teamId", "role"])
  .index("by_teamId_dashboardSlug", ["teamId", "dashboardSlug"])
  .index("by_teamId_role_dashboardSlug", ["teamId", "role", "dashboardSlug"]);
