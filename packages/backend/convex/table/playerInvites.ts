import { defineTable } from "convex/server";
import { v } from "convex/values";

export const playerInvites = defineTable({
  teamId: v.id("teams"),
  playerId: v.id("players"),
  email: v.string(),
  token: v.string(),
  status: v.string(), // "pending" | "accepted" | "expired"
  createdAt: v.number(),
  expiresAt: v.number(),
})
  .index("by_token", ["token"])
  .index("by_playerId", ["playerId"])
  .index("by_teamId", ["teamId"]);
