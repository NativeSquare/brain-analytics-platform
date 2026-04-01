import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../_generated/dataModel";

// ---------------------------------------------------------------------------
// Mock getAuthUserId
// ---------------------------------------------------------------------------

const { mockGetAuthUserId } = vi.hoisted(() => {
  return { mockGetAuthUserId: vi.fn() };
});

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, getAuthUserId: mockGetAuthUserId };
});

const { default: schema } = await import("../schema");
const modules = import.meta.glob(["../**/*.ts", "!../http.ts"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function seedTeamAndUser(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Test Club",
      slug: "test-club",
    });

    const userId = await ctx.db.insert("users", {
      name: "Test User",
      email: "user@example.com",
      role: "admin" as any,
      status: "active",
      teamId,
    });

    return { userId, teamId };
  });
}

// ---------------------------------------------------------------------------
// saveMatchMapping — upsert logic
// ---------------------------------------------------------------------------

describe("saveMatchMapping", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("inserts a new mapping when none exists", async () => {
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const id = await t.mutation(
      (await import("../wyscoutCache")).saveMatchMapping,
      { statsbombMatchId: "sb-123", wyscoutMatchId: "ws-456" }
    );

    expect(id).toBeDefined();

    // Verify the record was inserted
    const mapping = await t.run(async (ctx) => {
      return await ctx.db
        .query("wyscoutMatchMappings")
        .withIndex("by_statsbombMatchId", (q) =>
          q.eq("statsbombMatchId", "sb-123")
        )
        .first();
    });

    expect(mapping).not.toBeNull();
    expect(mapping!.wyscoutMatchId).toBe("ws-456");
    expect(mapping!.teamId).toBe(teamId);
  });

  it("returns existing ID without creating a duplicate", async () => {
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const id1 = await t.mutation(
      (await import("../wyscoutCache")).saveMatchMapping,
      { statsbombMatchId: "sb-123", wyscoutMatchId: "ws-456" }
    );

    const id2 = await t.mutation(
      (await import("../wyscoutCache")).saveMatchMapping,
      { statsbombMatchId: "sb-123", wyscoutMatchId: "ws-999" }
    );

    expect(id1).toBe(id2);

    // Verify only one record exists
    const mappings = await t.run(async (ctx) => {
      return await ctx.db
        .query("wyscoutMatchMappings")
        .withIndex("by_statsbombMatchId", (q) =>
          q.eq("statsbombMatchId", "sb-123")
        )
        .collect();
    });

    expect(mappings).toHaveLength(1);
    expect(mappings[0].wyscoutMatchId).toBe("ws-456"); // original value kept
  });
});

// ---------------------------------------------------------------------------
// saveVideoCache — upsert logic
// ---------------------------------------------------------------------------

describe("saveVideoCache", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("inserts a new cache entry when none exists", async () => {
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const id = await t.mutation(
      (await import("../wyscoutCache")).saveVideoCache,
      {
        wyscoutMatchId: "ws-100",
        startTimestamp: 1000,
        endTimestamp: 1010,
        quality: "HD",
        videoUrl: "https://example.com/video.mp4",
        expiresAt: Date.now() + 86400000,
      }
    );

    expect(id).toBeDefined();

    const cached = await t.run(async (ctx) => {
      return await ctx.db
        .query("wyscoutVideoCache")
        .withIndex("by_lookup", (q) =>
          q
            .eq("wyscoutMatchId", "ws-100")
            .eq("startTimestamp", 1000)
            .eq("endTimestamp", 1010)
            .eq("quality", "HD")
        )
        .first();
    });

    expect(cached).not.toBeNull();
    expect(cached!.videoUrl).toBe("https://example.com/video.mp4");
    expect(cached!.teamId).toBe(teamId);
  });

  it("updates existing entry instead of creating a duplicate", async () => {
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const args = {
      wyscoutMatchId: "ws-100",
      startTimestamp: 1000,
      endTimestamp: 1010,
      quality: "HD",
    };

    const id1 = await t.mutation(
      (await import("../wyscoutCache")).saveVideoCache,
      {
        ...args,
        videoUrl: "https://example.com/old.mp4",
        expiresAt: Date.now() + 86400000,
      }
    );

    const newExpiry = Date.now() + 172800000;
    const id2 = await t.mutation(
      (await import("../wyscoutCache")).saveVideoCache,
      {
        ...args,
        videoUrl: "https://example.com/new.mp4",
        expiresAt: newExpiry,
      }
    );

    // Same document was patched
    expect(id1).toBe(id2);

    // Verify only one record and it has the updated URL
    const all = await t.run(async (ctx) => {
      return await ctx.db
        .query("wyscoutVideoCache")
        .withIndex("by_lookup", (q) =>
          q
            .eq("wyscoutMatchId", "ws-100")
            .eq("startTimestamp", 1000)
            .eq("endTimestamp", 1010)
            .eq("quality", "HD")
        )
        .collect();
    });

    expect(all).toHaveLength(1);
    expect(all[0].videoUrl).toBe("https://example.com/new.mp4");
    expect(all[0].expiresAt).toBe(newExpiry);
  });

  it("creates separate entries for different qualities", async () => {
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const base = {
      wyscoutMatchId: "ws-100",
      startTimestamp: 1000,
      endTimestamp: 1010,
      videoUrl: "https://example.com/video.mp4",
      expiresAt: Date.now() + 86400000,
    };

    await t.mutation(
      (await import("../wyscoutCache")).saveVideoCache,
      { ...base, quality: "HD" }
    );

    await t.mutation(
      (await import("../wyscoutCache")).saveVideoCache,
      { ...base, quality: "SD" }
    );

    // Verify two separate records
    const allHD = await t.run(async (ctx) => {
      return await ctx.db
        .query("wyscoutVideoCache")
        .withIndex("by_lookup", (q) =>
          q
            .eq("wyscoutMatchId", "ws-100")
            .eq("startTimestamp", 1000)
            .eq("endTimestamp", 1010)
            .eq("quality", "HD")
        )
        .collect();
    });

    const allSD = await t.run(async (ctx) => {
      return await ctx.db
        .query("wyscoutVideoCache")
        .withIndex("by_lookup", (q) =>
          q
            .eq("wyscoutMatchId", "ws-100")
            .eq("startTimestamp", 1000)
            .eq("endTimestamp", 1010)
            .eq("quality", "SD")
        )
        .collect();
    });

    expect(allHD).toHaveLength(1);
    expect(allSD).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// getCachedVideo — expiry logic
// ---------------------------------------------------------------------------

describe("getCachedVideo", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("returns null for expired cache entries", async () => {
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    // Insert an already-expired entry
    await t.mutation(
      (await import("../wyscoutCache")).saveVideoCache,
      {
        wyscoutMatchId: "ws-100",
        startTimestamp: 1000,
        endTimestamp: 1010,
        quality: "HD",
        videoUrl: "https://example.com/expired.mp4",
        expiresAt: Date.now() - 1000, // expired 1 second ago
      }
    );

    const cached = await t.query(
      (await import("../wyscoutCache")).getCachedVideo,
      {
        wyscoutMatchId: "ws-100",
        startTimestamp: 1000,
        endTimestamp: 1010,
        quality: "HD",
      }
    );

    expect(cached).toBeNull();
  });

  it("returns valid cache entries", async () => {
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    await t.mutation(
      (await import("../wyscoutCache")).saveVideoCache,
      {
        wyscoutMatchId: "ws-100",
        startTimestamp: 1000,
        endTimestamp: 1010,
        quality: "HD",
        videoUrl: "https://example.com/valid.mp4",
        expiresAt: Date.now() + 86400000, // expires tomorrow
      }
    );

    const cached = await t.query(
      (await import("../wyscoutCache")).getCachedVideo,
      {
        wyscoutMatchId: "ws-100",
        startTimestamp: 1000,
        endTimestamp: 1010,
        quality: "HD",
      }
    );

    expect(cached).not.toBeNull();
    expect(cached!.videoUrl).toBe("https://example.com/valid.mp4");
  });
});
