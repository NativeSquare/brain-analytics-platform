import { defineTable } from "convex/server";
import { v } from "convex/values";

export const certifications = defineTable({
  teamId: v.id("teams"),
  staffId: v.id("users"),
  name: v.string(),
  issuingBody: v.string(),
  issueDate: v.number(),
  expiryDate: v.optional(v.number()),
  documentId: v.optional(v.id("_storage")),
  notes: v.optional(v.string()),
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_staffId", ["staffId"])
  .index("by_teamId", ["teamId"])
  .index("by_teamId_expiryDate", ["teamId", "expiryDate"]);
