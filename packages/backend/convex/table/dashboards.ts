import { defineTable } from "convex/server";
import { v } from "convex/values";

export const dashboards = defineTable({
  teamId: v.id("teams"),
  title: v.string(),
  description: v.string(),
  category: v.union(
    v.literal("Match Analysis"),
    v.literal("Season Analysis"),
    v.literal("Player Analysis"),
    v.literal("Tactical"),
    v.literal("Set Pieces"),
    v.literal("Opposition"),
    v.literal("Trends"),
    v.literal("Officials"),
    v.literal("Possession"),
    v.literal("Medical")
  ),
  icon: v.string(),
  slug: v.string(),
  createdAt: v.number(),
})
  .index("by_teamId", ["teamId"])
  .index("by_teamId_slug", ["teamId", "slug"])
  .index("by_teamId_category", ["teamId", "category"]);
