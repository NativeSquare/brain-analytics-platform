import { defineTable } from "convex/server";
import { v } from "convex/values";

export const documents = defineTable({
  teamId: v.id("teams"),
  folderId: v.id("folders"),
  name: v.string(),
  filename: v.optional(v.string()),
  extension: v.optional(v.string()),
  storageId: v.optional(v.string()),
  videoUrl: v.optional(v.string()),
  mimeType: v.optional(v.string()),
  fileSize: v.optional(v.number()),
  ownerId: v.id("users"),
  permittedRoles: v.optional(v.array(v.string())),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_teamId", ["teamId"])
  .index("by_folderId", ["folderId"])
  .index("by_teamId_folderId", ["teamId", "folderId"]);
