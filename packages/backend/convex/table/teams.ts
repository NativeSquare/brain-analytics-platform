import { defineTable } from "convex/server";
import { v } from "convex/values";

export const teams = defineTable({
  name: v.string(),
  slug: v.string(),
  metadata: v.optional(
    v.object({
      logoUrl: v.optional(v.string()),
      timezone: v.optional(v.string()),
      country: v.optional(v.string()),
    })
  ),
}).index("by_slug", ["slug"]);
