import { defineTable } from "convex/server";
import { v } from "convex/values";

export const players = defineTable({
  teamId: v.id("teams"),
  userId: v.optional(v.id("users")),
  firstName: v.string(),
  lastName: v.string(),
  photo: v.optional(v.string()),
  dateOfBirth: v.optional(v.number()),
  nationality: v.optional(v.string()),
  position: v.string(),
  squadNumber: v.optional(v.number()),
  preferredFoot: v.optional(v.string()),
  heightCm: v.optional(v.number()),
  weightKg: v.optional(v.number()),
  phone: v.optional(v.string()),
  personalEmail: v.optional(v.string()),
  address: v.optional(v.string()),
  emergencyContactName: v.optional(v.string()),
  emergencyContactRelationship: v.optional(v.string()),
  emergencyContactPhone: v.optional(v.string()),
  status: v.string(),
  externalProviderLinks: v.optional(
    v.array(v.object({ provider: v.string(), accountId: v.string() }))
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_teamId", ["teamId"])
  .index("by_teamId_status", ["teamId", "status"])
  .index("by_teamId_squadNumber", ["teamId", "squadNumber"])
  .index("by_userId", ["userId"]);
