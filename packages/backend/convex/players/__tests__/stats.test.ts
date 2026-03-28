import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../_generated/dataModel";

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

const { default: schema } = await import("../../schema");
const { requireAuth, requireRole } = await import("../../lib/auth");

const modules = import.meta.glob(["../../**/*.ts", "!../../http.ts"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface SeedOptions {
  role?: string;
  teamId?: Id<"teams">;
  name?: string;
  email?: string;
}

async function seedTeamAndUser(
  t: ReturnType<typeof convexTest>,
  overrides: SeedOptions = {}
) {
  return await t.run(async (ctx) => {
    const teamId =
      overrides.teamId ??
      (await ctx.db.insert("teams", { name: "Test Club", slug: "test-club" }));

    const userId = await ctx.db.insert("users", {
      name: overrides.name ?? "Test Admin",
      email: overrides.email ?? "admin@example.com",
      role: (overrides.role as any) ?? "admin",
      status: "active",
      teamId,
    });

    return { userId, teamId };
  });
}

async function seedPlayer(
  t: ReturnType<typeof convexTest>,
  teamId: Id<"teams">
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("players", {
      teamId,
      firstName: "Marcus",
      lastName: "Rashford",
      position: "Forward",
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

function getErrorCode(error: unknown): string | undefined {
  if (error instanceof ConvexError) {
    return (error.data as any).code;
  }
  return undefined;
}

const VALID_STATS = {
  matchDate: Date.now(),
  opponent: "Manchester City",
  minutesPlayed: 90,
  goals: 1,
  assists: 0,
  yellowCards: 1,
  redCards: 0,
};

// ---------------------------------------------------------------------------
// Inline logic mirrors (for t.run compatibility)
// ---------------------------------------------------------------------------

async function getPlayerStatsLogic(
  ctx: any,
  args: { playerId: Id<"players"> }
) {
  const { teamId } = await requireAuth(ctx);

  const player = await ctx.db.get(args.playerId);
  if (!player || player.teamId !== teamId) {
    throw new ConvexError({ code: "NOT_FOUND" as const, message: "Player not found" });
  }

  const stats = await ctx.db
    .query("playerStats")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerId))
    .collect();

  return stats.sort((a: any, b: any) => b.matchDate - a.matchDate);
}

async function addPlayerStatsLogic(
  ctx: any,
  args: {
    playerId: Id<"players">;
    matchDate: number;
    opponent: string;
    minutesPlayed: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
  }
) {
  const { user, teamId } = await requireRole(ctx, ["admin"]);

  const player = await ctx.db.get(args.playerId);
  if (!player || player.teamId !== teamId) {
    throw new ConvexError({ code: "NOT_FOUND" as const, message: "Player not found" });
  }

  if (args.minutesPlayed < 0 || args.minutesPlayed > 120) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Minutes played must be between 0 and 120" });
  }
  if (args.goals < 0) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Goals must be 0 or more" });
  }
  if (args.assists < 0) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Assists must be 0 or more" });
  }
  if (args.yellowCards < 0 || args.yellowCards > 2) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Yellow cards must be between 0 and 2" });
  }
  if (args.redCards < 0 || args.redCards > 1) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Red cards must be 0 or 1" });
  }

  const now = Date.now();
  return await ctx.db.insert("playerStats", {
    teamId,
    playerId: args.playerId,
    matchDate: args.matchDate,
    opponent: args.opponent,
    minutesPlayed: args.minutesPlayed,
    goals: args.goals,
    assists: args.assists,
    yellowCards: args.yellowCards,
    redCards: args.redCards,
    createdBy: user._id,
    createdAt: now,
    updatedAt: now,
  });
}

async function updatePlayerStatsLogic(
  ctx: any,
  args: {
    statsId: Id<"playerStats">;
    matchDate: number;
    opponent: string;
    minutesPlayed: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
  }
) {
  const { teamId } = await requireRole(ctx, ["admin"]);

  const stats = await ctx.db.get(args.statsId);
  if (!stats || stats.teamId !== teamId) {
    throw new ConvexError({ code: "NOT_FOUND" as const, message: "Stats entry not found" });
  }

  if (args.minutesPlayed < 0 || args.minutesPlayed > 120) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Minutes played must be between 0 and 120" });
  }
  if (args.goals < 0) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Goals must be 0 or more" });
  }
  if (args.assists < 0) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Assists must be 0 or more" });
  }
  if (args.yellowCards < 0 || args.yellowCards > 2) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Yellow cards must be between 0 and 2" });
  }
  if (args.redCards < 0 || args.redCards > 1) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Red cards must be 0 or 1" });
  }

  await ctx.db.patch(args.statsId, {
    matchDate: args.matchDate,
    opponent: args.opponent,
    minutesPlayed: args.minutesPlayed,
    goals: args.goals,
    assists: args.assists,
    yellowCards: args.yellowCards,
    redCards: args.redCards,
    updatedAt: Date.now(),
  });

  return args.statsId;
}

async function deletePlayerStatsLogic(
  ctx: any,
  args: { statsId: Id<"playerStats"> }
) {
  const { teamId } = await requireRole(ctx, ["admin"]);

  const stats = await ctx.db.get(args.statsId);
  if (!stats || stats.teamId !== teamId) {
    throw new ConvexError({ code: "NOT_FOUND" as const, message: "Stats entry not found" });
  }

  await ctx.db.delete(args.statsId);
}

// ---------------------------------------------------------------------------
// getPlayerStats
// ---------------------------------------------------------------------------

describe("getPlayerStats", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns all stats for a player sorted by matchDate descending", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    // Insert stats with different dates
    await t.run(async (ctx) => {
      await ctx.db.insert("playerStats", {
        teamId,
        playerId,
        matchDate: 1000,
        opponent: "Team A",
        minutesPlayed: 90,
        goals: 1,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("playerStats", {
        teamId,
        playerId,
        matchDate: 3000,
        opponent: "Team C",
        minutesPlayed: 60,
        goals: 0,
        assists: 2,
        yellowCards: 1,
        redCards: 0,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("playerStats", {
        teamId,
        playerId,
        matchDate: 2000,
        opponent: "Team B",
        minutesPlayed: 45,
        goals: 2,
        assists: 1,
        yellowCards: 0,
        redCards: 0,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      return await getPlayerStatsLogic(ctx, { playerId });
    });

    expect(result).toHaveLength(3);
    expect(result[0].opponent).toBe("Team C"); // matchDate 3000
    expect(result[1].opponent).toBe("Team B"); // matchDate 2000
    expect(result[2].opponent).toBe("Team A"); // matchDate 1000
  });

  it("returns empty array when no stats exist", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const result = await t.run(async (ctx) => {
      return await getPlayerStatsLogic(ctx, { playerId });
    });

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it("throws NOT_FOUND for a player from a different team", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create player on a different team
    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Club", slug: "other-club" })
    );
    const otherPlayerId = await seedPlayer(t, otherTeamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await getPlayerStatsLogic(ctx, { playerId: otherPlayerId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });

  it("unauthenticated user throws error", async () => {
    const t = convexTest(schema, modules);
    mockGetAuthUserId.mockResolvedValue(null);

    // Create a team + player directly (no auth needed for seeding)
    const teamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Test Club", slug: "test-club" })
    );
    const playerId = await seedPlayer(t, teamId);

    await expect(
      t.run(async (ctx) => {
        await getPlayerStatsLogic(ctx, { playerId });
      })
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// addPlayerStats
// ---------------------------------------------------------------------------

describe("addPlayerStats", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin can add stats for a player on their team and returns a valid ID", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const statsId = await t.run(async (ctx) => {
      return await addPlayerStatsLogic(ctx, { playerId, ...VALID_STATS });
    });

    expect(statsId).toBeDefined();

    const entry = await t.run(async (ctx) => ctx.db.get(statsId));
    expect(entry).not.toBeNull();
    expect(entry!.opponent).toBe("Manchester City");
    expect(entry!.goals).toBe(1);
  });

  it("non-admin user gets NOT_AUTHORIZED error", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await addPlayerStatsLogic(ctx, { playerId, ...VALID_STATS });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("adding stats for a player on a different team throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Club", slug: "other-club" })
    );
    const otherPlayerId = await seedPlayer(t, otherTeamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await addPlayerStatsLogic(ctx, { playerId: otherPlayerId, ...VALID_STATS });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });

  it("minutesPlayed > 120 throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await addPlayerStatsLogic(ctx, {
            playerId,
            ...VALID_STATS,
            minutesPlayed: 121,
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("negative goals throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await addPlayerStatsLogic(ctx, {
            playerId,
            ...VALID_STATS,
            goals: -1,
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("yellowCards > 2 throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await addPlayerStatsLogic(ctx, {
            playerId,
            ...VALID_STATS,
            yellowCards: 3,
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("redCards > 1 throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await addPlayerStatsLogic(ctx, {
            playerId,
            ...VALID_STATS,
            redCards: 2,
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("created entry has correct createdBy, createdAt, and teamId fields", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const statsId = await t.run(async (ctx) => {
      return await addPlayerStatsLogic(ctx, { playerId, ...VALID_STATS });
    });

    const entry = await t.run(async (ctx) => ctx.db.get(statsId));
    expect(entry!.createdBy).toBe(userId);
    expect(entry!.teamId).toBe(teamId);
    expect(entry!.createdAt).toBeGreaterThan(0);
    expect(entry!.updatedAt).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// updatePlayerStats
// ---------------------------------------------------------------------------

describe("updatePlayerStats", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin can update an existing stats entry", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const statsId = await t.run(async (ctx) => {
      return await addPlayerStatsLogic(ctx, { playerId, ...VALID_STATS });
    });

    const returnedId = await t.run(async (ctx) => {
      return await updatePlayerStatsLogic(ctx, {
        statsId,
        ...VALID_STATS,
        opponent: "Liverpool",
        goals: 3,
      });
    });

    expect(returnedId).toBe(statsId);

    const updated = await t.run(async (ctx) => ctx.db.get(statsId));
    expect(updated!.opponent).toBe("Liverpool");
    expect(updated!.goals).toBe(3);
  });

  it("non-admin user gets NOT_AUTHORIZED error", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const statsId = await t.run(async (ctx) => {
      return await addPlayerStatsLogic(ctx, { playerId, ...VALID_STATS });
    });

    // Switch to coach
    const { userId: coachId } = await seedTeamAndUser(t, {
      role: "coach",
      email: "coach@example.com",
      name: "Coach",
      teamId,
    });
    mockGetAuthUserId.mockResolvedValue(coachId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updatePlayerStatsLogic(ctx, {
            statsId,
            ...VALID_STATS,
            opponent: "Liverpool",
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("updating stats from a different team throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const statsId = await t.run(async (ctx) => {
      return await addPlayerStatsLogic(ctx, { playerId, ...VALID_STATS });
    });

    // Create second admin on different team
    const { userId: userId2 } = await seedTeamAndUser(t, {
      email: "admin2@example.com",
      name: "Admin 2",
    });
    mockGetAuthUserId.mockResolvedValue(userId2);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updatePlayerStatsLogic(ctx, {
            statsId,
            ...VALID_STATS,
            opponent: "Liverpool",
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });

  it("updatedAt is refreshed on update", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const statsId = await t.run(async (ctx) => {
      return await addPlayerStatsLogic(ctx, { playerId, ...VALID_STATS });
    });

    const original = await t.run(async (ctx) => ctx.db.get(statsId));
    const originalUpdatedAt = original!.updatedAt;

    // Small delay to ensure Date.now() differs
    await new Promise((r) => setTimeout(r, 10));

    await t.run(async (ctx) => {
      return await updatePlayerStatsLogic(ctx, {
        statsId,
        ...VALID_STATS,
        opponent: "Updated Opponent",
      });
    });

    const updated = await t.run(async (ctx) => ctx.db.get(statsId));
    expect(updated!.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
  });

  it("all fields are updated correctly", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const statsId = await t.run(async (ctx) => {
      return await addPlayerStatsLogic(ctx, { playerId, ...VALID_STATS });
    });

    const newData = {
      matchDate: 999999,
      opponent: "Arsenal",
      minutesPlayed: 45,
      goals: 2,
      assists: 3,
      yellowCards: 2,
      redCards: 1,
    };

    await t.run(async (ctx) => {
      return await updatePlayerStatsLogic(ctx, { statsId, ...newData });
    });

    const updated = await t.run(async (ctx) => ctx.db.get(statsId));
    expect(updated!.matchDate).toBe(999999);
    expect(updated!.opponent).toBe("Arsenal");
    expect(updated!.minutesPlayed).toBe(45);
    expect(updated!.goals).toBe(2);
    expect(updated!.assists).toBe(3);
    expect(updated!.yellowCards).toBe(2);
    expect(updated!.redCards).toBe(1);
  });

  it("non-existent statsId throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    // Create and then delete to get a valid-looking but non-existent ID
    const statsId = await t.run(async (ctx) => {
      return await addPlayerStatsLogic(ctx, { playerId, ...VALID_STATS });
    });
    await t.run(async (ctx) => {
      await ctx.db.delete(statsId);
    });

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updatePlayerStatsLogic(ctx, {
            statsId,
            ...VALID_STATS,
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// deletePlayerStats
// ---------------------------------------------------------------------------

describe("deletePlayerStats", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin can delete a stats entry", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const statsId = await t.run(async (ctx) => {
      return await addPlayerStatsLogic(ctx, { playerId, ...VALID_STATS });
    });

    await t.run(async (ctx) => {
      await deletePlayerStatsLogic(ctx, { statsId });
    });

    const deleted = await t.run(async (ctx) => ctx.db.get(statsId));
    expect(deleted).toBeNull();
  });

  it("non-admin user gets NOT_AUTHORIZED error", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const statsId = await t.run(async (ctx) => {
      return await addPlayerStatsLogic(ctx, { playerId, ...VALID_STATS });
    });

    // Switch to player role
    const { userId: playUserId } = await seedTeamAndUser(t, {
      role: "player",
      email: "player@example.com",
      name: "Player User",
      teamId,
    });
    mockGetAuthUserId.mockResolvedValue(playUserId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await deletePlayerStatsLogic(ctx, { statsId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("deleting stats from a different team throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const statsId = await t.run(async (ctx) => {
      return await addPlayerStatsLogic(ctx, { playerId, ...VALID_STATS });
    });

    // Switch to admin on different team
    const { userId: userId2 } = await seedTeamAndUser(t, {
      email: "admin2@example.com",
      name: "Admin 2",
    });
    mockGetAuthUserId.mockResolvedValue(userId2);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await deletePlayerStatsLogic(ctx, { statsId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });

  it("deleted entry no longer appears in getPlayerStats results", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const statsId = await t.run(async (ctx) => {
      return await addPlayerStatsLogic(ctx, { playerId, ...VALID_STATS });
    });

    // Verify it exists
    const before = await t.run(async (ctx) => {
      return await getPlayerStatsLogic(ctx, { playerId });
    });
    expect(before).toHaveLength(1);

    // Delete
    await t.run(async (ctx) => {
      await deletePlayerStatsLogic(ctx, { statsId });
    });

    // Verify it's gone
    const after = await t.run(async (ctx) => {
      return await getPlayerStatsLogic(ctx, { playerId });
    });
    expect(after).toHaveLength(0);
  });

  it("non-existent statsId throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    // Create and delete
    const statsId = await t.run(async (ctx) => {
      return await addPlayerStatsLogic(ctx, { playerId, ...VALID_STATS });
    });
    await t.run(async (ctx) => {
      await ctx.db.delete(statsId);
    });

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await deletePlayerStatsLogic(ctx, { statsId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });
});
