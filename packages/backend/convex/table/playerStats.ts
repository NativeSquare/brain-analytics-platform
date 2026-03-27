import { defineTable } from "convex/server";
import { v } from "convex/values";

export const playerStats = defineTable({
  teamId: v.id("teams"),
  playerId: v.id("players"),
  matchDate: v.number(),
  opponent: v.string(),
  minutesPlayed: v.number(),
  goals: v.number(),
  assists: v.number(),
  yellowCards: v.number(),
  redCards: v.number(),
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_playerId", ["playerId"])
  .index("by_teamId", ["teamId"]);
