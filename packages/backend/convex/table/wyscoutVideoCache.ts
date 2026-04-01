import { defineTable } from "convex/server";
import { v } from "convex/values";

export const wyscoutVideoCache = defineTable({
  wyscoutMatchId: v.string(),
  startTimestamp: v.number(),
  endTimestamp: v.number(),
  quality: v.string(),
  storageId: v.optional(v.id("_storage")),
  videoUrl: v.string(),
  expiresAt: v.number(),
  teamId: v.id("teams"),
  createdAt: v.number(),
}).index("by_lookup", [
  "wyscoutMatchId",
  "startTimestamp",
  "endTimestamp",
  "quality",
]);
