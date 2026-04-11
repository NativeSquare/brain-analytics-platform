import { defineTable } from "convex/server";
import { v } from "convex/values";

export const playerInjuries = defineTable({
  teamId: v.id("teams"),
  playerId: v.id("players"),
  date: v.number(),
  injuryType: v.string(),
  severity: v.string(),
  // Story 14.1: Clinical classification fields (all optional for backward compat)
  bodyRegion: v.optional(v.string()),
  mechanism: v.optional(v.string()),
  side: v.optional(v.string()),
  expectedReturnDate: v.optional(v.number()),
  actualReturnDate: v.optional(v.number()),
  // Existing optional fields
  estimatedRecovery: v.optional(v.string()),
  notes: v.optional(v.string()),
  // Status: active | rehab | assessment | cleared (was: current | recovered)
  status: v.string(),
  clearanceDate: v.optional(v.number()),
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_playerId", ["playerId"])
  .index("by_teamId", ["teamId"])
  .index("by_teamId_status", ["teamId", "status"]);
