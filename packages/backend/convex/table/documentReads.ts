import { defineTable } from "convex/server";
import { v } from "convex/values";

export const documentReads = defineTable({
  teamId: v.id("teams"),
  documentId: v.id("documents"),
  userId: v.id("users"),
  readAt: v.number(),
})
  .index("by_documentId", ["documentId"])
  .index("by_userId_documentId", ["userId", "documentId"]);
