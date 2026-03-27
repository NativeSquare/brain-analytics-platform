import { defineTable } from "convex/server";
import { v } from "convex/values";

export const documentUserPermissions = defineTable({
  teamId: v.id("teams"),
  targetType: v.union(v.literal("folder"), v.literal("document")),
  targetId: v.string(),
  userId: v.id("users"),
  grantedBy: v.id("users"),
  createdAt: v.number(),
})
  .index("by_targetId", ["targetId"])
  .index("by_userId_teamId", ["userId", "teamId"]);
