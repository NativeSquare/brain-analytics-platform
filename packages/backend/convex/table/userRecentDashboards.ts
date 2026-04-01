import { defineTable } from "convex/server";
import { v } from "convex/values";

export const userRecentDashboards = defineTable({
  userId: v.id("users"),
  dashboardId: v.string(),
  teamId: v.id("teams"),
  openedAt: v.number(),
})
  .index("by_userId_teamId", ["userId", "teamId"])
  .index("by_userId_dashboardId", ["userId", "dashboardId"])
  .index("by_teamId", ["teamId"]);
