import { defineTable } from "convex/server";
import { v } from "convex/values";

export const calendarEventSeries = defineTable({
  teamId: v.id("teams"),
  frequency: v.union(
    v.literal("daily"),
    v.literal("weekly"),
    v.literal("biweekly"),
    v.literal("monthly"),
  ),
  interval: v.number(),
  endDate: v.number(),
  ownerId: v.id("users"),
  createdAt: v.number(),
}).index("by_teamId", ["teamId"]);
