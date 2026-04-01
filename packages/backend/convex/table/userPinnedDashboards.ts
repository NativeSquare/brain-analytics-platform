import { defineTable } from "convex/server";
import { v } from "convex/values";

export const userPinnedDashboards = defineTable({
  userId: v.id("users"),
  dashboardId: v.string(),
  teamId: v.id("teams"),
  pinnedAt: v.number(),
})
  .index("by_userId_teamId", ["userId", "teamId"])
  .index("by_userId_dashboardId", ["userId", "dashboardId"])
  .index("by_teamId", ["teamId"]);
