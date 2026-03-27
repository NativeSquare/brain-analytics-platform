import { defineTable } from "convex/server";
import { v } from "convex/values";

export const folders = defineTable({
  teamId: v.id("teams"),
  name: v.string(),
  parentId: v.optional(v.id("folders")),
  createdBy: v.id("users"),
  createdAt: v.number(),
  permittedRoles: v.optional(v.array(v.string())),
  isDeleted: v.optional(v.boolean()),
})
  .index("by_teamId", ["teamId"])
  .index("by_teamId_parentId", ["teamId", "parentId"]);
