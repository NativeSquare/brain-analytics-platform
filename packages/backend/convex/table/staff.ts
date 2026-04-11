import { defineTable } from "convex/server";
import { v } from "convex/values";

export const staff = defineTable({
  teamId: v.id("teams"),
  userId: v.optional(v.id("users")),
  firstName: v.string(),
  lastName: v.string(),
  photo: v.optional(v.string()),
  jobTitle: v.string(),
  department: v.string(),
  phone: v.optional(v.string()),
  email: v.optional(v.string()),
  bio: v.optional(v.string()),
  dateJoined: v.optional(v.number()),
  status: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_teamId", ["teamId"])
  .index("by_teamId_status", ["teamId", "status"])
  .index("by_teamId_department", ["teamId", "department"])
  .index("by_userId", ["userId"]);
