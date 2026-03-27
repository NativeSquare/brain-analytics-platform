import { defineTable } from "convex/server";
import { v } from "convex/values";

export const playerFitness = defineTable({
  teamId: v.id("teams"),
  playerId: v.id("players"),
  date: v.number(),
  weightKg: v.optional(v.number()),
  bodyFatPercentage: v.optional(v.number()),
  notes: v.optional(v.string()),
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_playerId", ["playerId"])
  .index("by_teamId", ["teamId"]);
