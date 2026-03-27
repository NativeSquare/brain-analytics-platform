import { defineTable } from "convex/server";
import { v } from "convex/values";

export const playerInjuries = defineTable({
  teamId: v.id("teams"),
  playerId: v.id("players"),
  date: v.number(),
  injuryType: v.string(),
  severity: v.string(),
  estimatedRecovery: v.optional(v.string()),
  notes: v.optional(v.string()),
  status: v.string(),
  clearanceDate: v.optional(v.number()),
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_playerId", ["playerId"])
  .index("by_teamId", ["teamId"]);
