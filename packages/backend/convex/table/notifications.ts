import { defineTable } from "convex/server";
import { v } from "convex/values";

export const notifications = defineTable({
  userId: v.id("users"),
  teamId: v.id("teams"),
  type: v.string(),
  title: v.string(),
  message: v.string(),
  read: v.boolean(),
  createdAt: v.number(),
  relatedEntityId: v.optional(v.string()),
})
  .index("by_userId_teamId", ["userId", "teamId"])
  .index("by_userId_read", ["userId", "read"]);
