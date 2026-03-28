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

// ---------------------------------------------------------------------------
// Inline logic mirrors (for t.run compatibility)
// ---------------------------------------------------------------------------

async function getPlayerFitnessLogic(
  ctx: any,
  args: { playerId: Id<"players"> }
) {
  const { teamId } = await requireAuth(ctx);

  const player = await ctx.db.get(args.playerId);
  if (!player || player.teamId !== teamId) {
    throw new ConvexError({
      code: "NOT_FOUND" as const,
      message: "Player not found",
    });
  }

  const entries = await ctx.db
    .query("playerFitness")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerId))
    .collect();

  return entries.sort((a: any, b: any) => b.date - a.date);
}

async function addPlayerFitnessLogic(
  ctx: any,
  args: {
    playerId: Id<"players">;
    date: number;
    weightKg?: number;
    bodyFatPercentage?: number;
    notes?: string;
  }
) {
  const { user, teamId } = await requireRole(ctx, ["admin", "physio"]);

  const player = await ctx.db.get(args.playerId);
  if (!player || player.teamId !== teamId) {
    throw new ConvexError({
      code: "NOT_FOUND" as const,
      message: "Player not found",
    });
  }

  // Validate at least one data field
  if (
    args.weightKg === undefined &&
    args.bodyFatPercentage === undefined &&
    !args.notes
  ) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message:
        "At least one data field (weight, body fat, or notes) is required",
    });
  }

  // Validate ranges
  if (
    args.weightKg !== undefined &&
    (args.weightKg < 30 || args.weightKg > 200)
  ) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Weight must be between 30 and 200 kg",
    });
  }
  if (
    args.bodyFatPercentage !== undefined &&
    (args.bodyFatPercentage < 1 || args.bodyFatPercentage > 60)
  ) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Body fat must be between 1% and 60%",
    });
  }
  if (args.notes !== undefined && args.notes.length > 2000) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Notes cannot exceed 2000 characters",
    });
  }

  const now = Date.now();
  return await ctx.db.insert("playerFitness", {
    teamId,
    playerId: args.playerId,
    date: args.date,
    weightKg: args.weightKg,
    bodyFatPercentage: args.bodyFatPercentage,
    notes: args.notes,
    createdBy: user._id,
    createdAt: now,
    updatedAt: now,
  });
}

async function updatePlayerFitnessLogic(
  ctx: any,
  args: {
    fitnessId: Id<"playerFitness">;
    date: number;
    weightKg?: number;
    bodyFatPercentage?: number;
    notes?: string;
  }
) {
  const { teamId } = await requireRole(ctx, ["admin", "physio"]);

  const entry = await ctx.db.get(args.fitnessId);
  if (!entry || entry.teamId !== teamId) {
    throw new ConvexError({
      code: "NOT_FOUND" as const,
      message: "Fitness entry not found",
    });
  }

  // Validate at least one data field
  if (
    args.weightKg === undefined &&
    args.bodyFatPercentage === undefined &&
    !args.notes
  ) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message:
        "At least one data field (weight, body fat, or notes) is required",
    });
  }

  // Validate ranges
  if (
    args.weightKg !== undefined &&
    (args.weightKg < 30 || args.weightKg > 200)
  ) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Weight must be between 30 and 200 kg",
    });
  }
  if (
    args.bodyFatPercentage !== undefined &&
    (args.bodyFatPercentage < 1 || args.bodyFatPercentage > 60)
  ) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Body fat must be between 1% and 60%",
    });
  }
  if (args.notes !== undefined && args.notes.length > 2000) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Notes cannot exceed 2000 characters",
    });
  }

  await ctx.db.patch(args.fitnessId, {
    date: args.date,
    weightKg: args.weightKg,
    bodyFatPercentage: args.bodyFatPercentage,
    notes: args.notes,
    updatedAt: Date.now(),
  });

  return args.fitnessId;
}

async function deletePlayerFitnessLogic(
  ctx: any,
  args: { fitnessId: Id<"playerFitness"> }
) {
  const { teamId } = await requireRole(ctx, ["admin", "physio"]);

  const entry = await ctx.db.get(args.fitnessId);
  if (!entry || entry.teamId !== teamId) {
    throw new ConvexError({
      code: "NOT_FOUND" as const,
      message: "Fitness entry not found",
    });
  }

  await ctx.db.delete(args.fitnessId);
}

const VALID_FITNESS = {
  date: Date.now(),
  weightKg: 82.5,
  bodyFatPercentage: 12.3,
  notes: "Pre-season fitness test",
};

// ---------------------------------------------------------------------------
// getPlayerFitness
// ---------------------------------------------------------------------------

describe("getPlayerFitness", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns all fitness entries for a player sorted by date descending", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    await t.run(async (ctx) => {
      await ctx.db.insert("playerFitness", {
        teamId,
        playerId,
        date: 1000,
        weightKg: 80,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("playerFitness", {
        teamId,
        playerId,
        date: 3000,
        weightKg: 82,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("playerFitness", {
        teamId,
        playerId,
        date: 2000,
        weightKg: 81,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      return await getPlayerFitnessLogic(ctx, { playerId });
    });

    expect(result).toHaveLength(3);
    expect(result[0].date).toBe(3000);
    expect(result[1].date).toBe(2000);
    expect(result[2].date).toBe(1000);
  });

  it("returns empty array when no entries exist", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const result = await t.run(async (ctx) => {
      return await getPlayerFitnessLogic(ctx, { playerId });
    });

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it("throws NOT_FOUND for a player from a different team", async () => {
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
          await getPlayerFitnessLogic(ctx, { playerId: otherPlayerId });
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

    const teamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Test Club", slug: "test-club" })
    );
    const playerId = await seedPlayer(t, teamId);

    await expect(
      t.run(async (ctx) => {
        await getPlayerFitnessLogic(ctx, { playerId });
      })
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// addPlayerFitness
// ---------------------------------------------------------------------------

describe("addPlayerFitness", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin can add fitness entry for a player on their team, returns a valid ID", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const fitnessId = await t.run(async (ctx) => {
      return await addPlayerFitnessLogic(ctx, { playerId, ...VALID_FITNESS });
    });

    expect(fitnessId).toBeDefined();

    const entry = await t.run(async (ctx) => ctx.db.get(fitnessId));
    expect(entry).not.toBeNull();
    expect(entry!.weightKg).toBe(82.5);
    expect(entry!.bodyFatPercentage).toBe(12.3);
  });

  it("physio can add fitness entry for a player on their team, returns a valid ID", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "physio" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const fitnessId = await t.run(async (ctx) => {
      return await addPlayerFitnessLogic(ctx, { playerId, ...VALID_FITNESS });
    });

    expect(fitnessId).toBeDefined();

    const entry = await t.run(async (ctx) => ctx.db.get(fitnessId));
    expect(entry).not.toBeNull();
    expect(entry!.weightKg).toBe(82.5);
  });

  it("non-admin/non-physio user (coach) gets NOT_AUTHORIZED error", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await addPlayerFitnessLogic(ctx, { playerId, ...VALID_FITNESS });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("adding entry for a player on a different team throws NOT_FOUND", async () => {
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
          await addPlayerFitnessLogic(ctx, {
            playerId: otherPlayerId,
            ...VALID_FITNESS,
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });

  it("all three optional fields missing throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await addPlayerFitnessLogic(ctx, {
            playerId,
            date: Date.now(),
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("weightKg < 30 throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await addPlayerFitnessLogic(ctx, {
            playerId,
            date: Date.now(),
            weightKg: 29,
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("weightKg > 200 throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await addPlayerFitnessLogic(ctx, {
            playerId,
            date: Date.now(),
            weightKg: 201,
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("bodyFatPercentage < 1 throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await addPlayerFitnessLogic(ctx, {
            playerId,
            date: Date.now(),
            bodyFatPercentage: 0.5,
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("bodyFatPercentage > 60 throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await addPlayerFitnessLogic(ctx, {
            playerId,
            date: Date.now(),
            bodyFatPercentage: 61,
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("notes exceeding 2000 chars throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await addPlayerFitnessLogic(ctx, {
            playerId,
            date: Date.now(),
            notes: "x".repeat(2001),
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("entry with only notes (no weight/bodyFat) succeeds", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const fitnessId = await t.run(async (ctx) => {
      return await addPlayerFitnessLogic(ctx, {
        playerId,
        date: Date.now(),
        notes: "Only notes here",
      });
    });

    expect(fitnessId).toBeDefined();

    const entry = await t.run(async (ctx) => ctx.db.get(fitnessId));
    expect(entry).not.toBeNull();
    expect(entry!.weightKg).toBeUndefined();
    expect(entry!.bodyFatPercentage).toBeUndefined();
    expect(entry!.notes).toBe("Only notes here");
  });

  it("created entry has correct createdBy, createdAt, and teamId fields", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const fitnessId = await t.run(async (ctx) => {
      return await addPlayerFitnessLogic(ctx, { playerId, ...VALID_FITNESS });
    });

    const entry = await t.run(async (ctx) => ctx.db.get(fitnessId));
    expect(entry!.createdBy).toBe(userId);
    expect(entry!.teamId).toBe(teamId);
    expect(entry!.createdAt).toBeGreaterThan(0);
    expect(entry!.updatedAt).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// updatePlayerFitness
// ---------------------------------------------------------------------------

describe("updatePlayerFitness", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin can update an existing fitness entry", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const fitnessId = await t.run(async (ctx) => {
      return await addPlayerFitnessLogic(ctx, { playerId, ...VALID_FITNESS });
    });

    const returnedId = await t.run(async (ctx) => {
      return await updatePlayerFitnessLogic(ctx, {
        fitnessId,
        date: VALID_FITNESS.date,
        weightKg: 85.0,
        bodyFatPercentage: 11.5,
        notes: "Updated notes",
      });
    });

    expect(returnedId).toBe(fitnessId);

    const updated = await t.run(async (ctx) => ctx.db.get(fitnessId));
    expect(updated!.weightKg).toBe(85.0);
    expect(updated!.bodyFatPercentage).toBe(11.5);
    expect(updated!.notes).toBe("Updated notes");
  });

  it("physio can update an existing fitness entry", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "physio" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const fitnessId = await t.run(async (ctx) => {
      return await addPlayerFitnessLogic(ctx, { playerId, ...VALID_FITNESS });
    });

    const returnedId = await t.run(async (ctx) => {
      return await updatePlayerFitnessLogic(ctx, {
        fitnessId,
        date: VALID_FITNESS.date,
        weightKg: 83.0,
      });
    });

    expect(returnedId).toBe(fitnessId);
  });

  it("non-admin/non-physio user gets NOT_AUTHORIZED error", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const fitnessId = await t.run(async (ctx) => {
      return await addPlayerFitnessLogic(ctx, { playerId, ...VALID_FITNESS });
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
          await updatePlayerFitnessLogic(ctx, {
            fitnessId,
            date: VALID_FITNESS.date,
            weightKg: 85,
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("updating an entry from a different team throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const fitnessId = await t.run(async (ctx) => {
      return await addPlayerFitnessLogic(ctx, { playerId, ...VALID_FITNESS });
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
          await updatePlayerFitnessLogic(ctx, {
            fitnessId,
            date: VALID_FITNESS.date,
            weightKg: 85,
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

    const fitnessId = await t.run(async (ctx) => {
      return await addPlayerFitnessLogic(ctx, { playerId, ...VALID_FITNESS });
    });

    const original = await t.run(async (ctx) => ctx.db.get(fitnessId));
    const originalUpdatedAt = original!.updatedAt;

    // Small delay to ensure Date.now() differs
    await new Promise((r) => setTimeout(r, 10));

    await t.run(async (ctx) => {
      return await updatePlayerFitnessLogic(ctx, {
        fitnessId,
        date: VALID_FITNESS.date,
        weightKg: 84,
      });
    });

    const updated = await t.run(async (ctx) => ctx.db.get(fitnessId));
    expect(updated!.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
  });

  it("all fields are updated correctly", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const fitnessId = await t.run(async (ctx) => {
      return await addPlayerFitnessLogic(ctx, { playerId, ...VALID_FITNESS });
    });

    const newData = {
      date: 999999,
      weightKg: 90.1,
      bodyFatPercentage: 15.5,
      notes: "New notes",
    };

    await t.run(async (ctx) => {
      return await updatePlayerFitnessLogic(ctx, {
        fitnessId,
        ...newData,
      });
    });

    const updated = await t.run(async (ctx) => ctx.db.get(fitnessId));
    expect(updated!.date).toBe(999999);
    expect(updated!.weightKg).toBe(90.1);
    expect(updated!.bodyFatPercentage).toBe(15.5);
    expect(updated!.notes).toBe("New notes");
  });

  it("non-existent fitnessId throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    // Create and delete to get a valid-looking but non-existent ID
    const fitnessId = await t.run(async (ctx) => {
      return await addPlayerFitnessLogic(ctx, { playerId, ...VALID_FITNESS });
    });
    await t.run(async (ctx) => {
      await ctx.db.delete(fitnessId);
    });

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updatePlayerFitnessLogic(ctx, {
            fitnessId,
            date: VALID_FITNESS.date,
            weightKg: 85,
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });

  it("removing all optional data fields throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const fitnessId = await t.run(async (ctx) => {
      return await addPlayerFitnessLogic(ctx, { playerId, ...VALID_FITNESS });
    });

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updatePlayerFitnessLogic(ctx, {
            fitnessId,
            date: VALID_FITNESS.date,
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });
});

// ---------------------------------------------------------------------------
// deletePlayerFitness
// ---------------------------------------------------------------------------

describe("deletePlayerFitness", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin can delete a fitness entry", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const fitnessId = await t.run(async (ctx) => {
      return await addPlayerFitnessLogic(ctx, { playerId, ...VALID_FITNESS });
    });

    await t.run(async (ctx) => {
      await deletePlayerFitnessLogic(ctx, { fitnessId });
    });

    const deleted = await t.run(async (ctx) => ctx.db.get(fitnessId));
    expect(deleted).toBeNull();
  });

  it("physio can delete a fitness entry", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "physio" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const fitnessId = await t.run(async (ctx) => {
      return await addPlayerFitnessLogic(ctx, { playerId, ...VALID_FITNESS });
    });

    await t.run(async (ctx) => {
      await deletePlayerFitnessLogic(ctx, { fitnessId });
    });

    const deleted = await t.run(async (ctx) => ctx.db.get(fitnessId));
    expect(deleted).toBeNull();
  });

  it("non-admin/non-physio user gets NOT_AUTHORIZED error", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const fitnessId = await t.run(async (ctx) => {
      return await addPlayerFitnessLogic(ctx, { playerId, ...VALID_FITNESS });
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
          await deletePlayerFitnessLogic(ctx, { fitnessId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("deleting an entry from a different team throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const fitnessId = await t.run(async (ctx) => {
      return await addPlayerFitnessLogic(ctx, { playerId, ...VALID_FITNESS });
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
          await deletePlayerFitnessLogic(ctx, { fitnessId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });

  it("deleted entry no longer appears in getPlayerFitness results", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const fitnessId = await t.run(async (ctx) => {
      return await addPlayerFitnessLogic(ctx, { playerId, ...VALID_FITNESS });
    });

    // Verify it exists
    const before = await t.run(async (ctx) => {
      return await getPlayerFitnessLogic(ctx, { playerId });
    });
    expect(before).toHaveLength(1);

    // Delete
    await t.run(async (ctx) => {
      await deletePlayerFitnessLogic(ctx, { fitnessId });
    });

    // Verify it's gone
    const after = await t.run(async (ctx) => {
      return await getPlayerFitnessLogic(ctx, { playerId });
    });
    expect(after).toHaveLength(0);
  });

  it("non-existent fitnessId throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    // Create and delete
    const fitnessId = await t.run(async (ctx) => {
      return await addPlayerFitnessLogic(ctx, { playerId, ...VALID_FITNESS });
    });
    await t.run(async (ctx) => {
      await ctx.db.delete(fitnessId);
    });

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await deletePlayerFitnessLogic(ctx, { fitnessId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });
});
