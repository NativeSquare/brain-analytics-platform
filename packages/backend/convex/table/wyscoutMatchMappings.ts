import { defineTable } from "convex/server";
import { v } from "convex/values";

export const wyscoutMatchMappings = defineTable({
  statsbombMatchId: v.string(),
  wyscoutMatchId: v.string(),
  teamId: v.id("teams"),
  createdAt: v.number(),
}).index("by_statsbombMatchId", ["statsbombMatchId"]);
