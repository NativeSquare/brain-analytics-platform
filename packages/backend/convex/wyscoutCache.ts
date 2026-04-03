import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";

// ---------------------------------------------------------------------------
// getMatchMapping — look up cached StatsBomb -> Wyscout mapping
// ---------------------------------------------------------------------------

export const getMatchMapping = query({
  args: { statsbombMatchId: v.string() },
  handler: async (ctx, { statsbombMatchId }) => {
    await requireAuth(ctx);

    const mapping = await ctx.db
      .query("wyscoutMatchMappings")
      .withIndex("by_statsbombMatchId", (q) =>
        q.eq("statsbombMatchId", statsbombMatchId)
      )
      .first();

    return mapping ?? null;
  },
});

// ---------------------------------------------------------------------------
// saveMatchMapping — insert a new StatsBomb -> Wyscout mapping
// ---------------------------------------------------------------------------

export const saveMatchMapping = mutation({
  args: {
    statsbombMatchId: v.string(),
    wyscoutMatchId: v.string(),
  },
  handler: async (ctx, { statsbombMatchId, wyscoutMatchId }) => {
    const { teamId } = await requireAuth(ctx);

    // Idempotent: skip if already exists
    const existing = await ctx.db
      .query("wyscoutMatchMappings")
      .withIndex("by_statsbombMatchId", (q) =>
        q.eq("statsbombMatchId", statsbombMatchId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("wyscoutMatchMappings", {
      statsbombMatchId,
      wyscoutMatchId,
      teamId,
      createdAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// getCachedVideo — look up cached video URL by compound key
// ---------------------------------------------------------------------------

export const getCachedVideo = query({
  args: {
    wyscoutMatchId: v.string(),
    startTimestamp: v.number(),
    endTimestamp: v.number(),
    quality: v.string(),
  },
  handler: async (ctx, { wyscoutMatchId, startTimestamp, endTimestamp, quality }) => {
    await requireAuth(ctx);

    const cached = await ctx.db
      .query("wyscoutVideoCache")
      .withIndex("by_lookup", (q) =>
        q
          .eq("wyscoutMatchId", wyscoutMatchId)
          .eq("startTimestamp", startTimestamp)
          .eq("endTimestamp", endTimestamp)
          .eq("quality", quality)
      )
      .first();

    if (!cached) return null;

    // Check expiry
    if (cached.expiresAt <= Date.now()) {
      return null;
    }

    return cached;
  },
});

// ---------------------------------------------------------------------------
// saveVideoCache — upsert a video cache entry
// ---------------------------------------------------------------------------

export const saveVideoCache = mutation({
  args: {
    wyscoutMatchId: v.string(),
    startTimestamp: v.number(),
    endTimestamp: v.number(),
    quality: v.string(),
    videoUrl: v.string(),
    expiresAt: v.number(),
    storageId: v.optional(v.id("_storage")),
    muxAssetId: v.optional(v.string()),
    muxPlaybackId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { wyscoutMatchId, startTimestamp, endTimestamp, quality, videoUrl, expiresAt, storageId, muxAssetId, muxPlaybackId }
  ) => {
    const { teamId } = await requireAuth(ctx);

    // Upsert: update if exists, insert if not
    const existing = await ctx.db
      .query("wyscoutVideoCache")
      .withIndex("by_lookup", (q) =>
        q
          .eq("wyscoutMatchId", wyscoutMatchId)
          .eq("startTimestamp", startTimestamp)
          .eq("endTimestamp", endTimestamp)
          .eq("quality", quality)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        videoUrl,
        expiresAt,
        storageId,
        muxAssetId,
        muxPlaybackId,
      });
      return existing._id;
    }

    return await ctx.db.insert("wyscoutVideoCache", {
      wyscoutMatchId,
      startTimestamp,
      endTimestamp,
      quality,
      videoUrl,
      expiresAt,
      teamId,
      createdAt: Date.now(),
      storageId,
      muxAssetId,
      muxPlaybackId,
    });
  },
});
