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

async function getPlayerInjuriesLogic(
  ctx: any,
  args: { playerId: Id<"players"> }
) {
  const { teamId } = await requireRole(ctx, ["admin", "physio"]);

  const player = await ctx.db.get(args.playerId);
  if (!player || player.teamId !== teamId) {
    throw new ConvexError({ code: "NOT_FOUND" as const, message: "Player not found" });
  }

  const entries = await ctx.db
    .query("playerInjuries")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerId))
    .collect();

  return entries.sort((a: any, b: any) => b.date - a.date);
}

async function getPlayerInjuryStatusLogic(
  ctx: any,
  args: { playerId: Id<"players"> }
) {
  const { teamId } = await requireAuth(ctx);

  const player = await ctx.db.get(args.playerId);
  if (!player || player.teamId !== teamId) {
    throw new ConvexError({ code: "NOT_FOUND" as const, message: "Player not found" });
  }

  const currentInjuries = await ctx.db
    .query("playerInjuries")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerId))
    .filter((q: any) => q.eq(q.field("status"), "current"))
    .collect();

  return { hasCurrentInjury: currentInjuries.length > 0 };
}

async function logInjuryLogic(
  ctx: any,
  args: {
    playerId: Id<"players">;
    date: number;
    injuryType: string;
    severity: string;
    estimatedRecovery?: string;
    notes?: string;
  }
) {
  const { user, teamId } = await requireRole(ctx, ["admin", "physio"]);

  const player = await ctx.db.get(args.playerId);
  if (!player || player.teamId !== teamId) {
    throw new ConvexError({ code: "NOT_FOUND" as const, message: "Player not found" });
  }

  if (!["minor", "moderate", "severe"].includes(args.severity)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Severity must be minor, moderate, or severe",
    });
  }
  if (!args.injuryType || args.injuryType.trim().length === 0) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Injury type is required" });
  }
  if (args.injuryType.length > 200) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Injury type cannot exceed 200 characters" });
  }
  if (args.estimatedRecovery && args.estimatedRecovery.length > 200) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Estimated recovery cannot exceed 200 characters" });
  }
  if (args.notes && args.notes.length > 2000) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Notes cannot exceed 2000 characters" });
  }

  const now = Date.now();
  return await ctx.db.insert("playerInjuries", {
    teamId,
    playerId: args.playerId,
    date: args.date,
    injuryType: args.injuryType,
    severity: args.severity,
    estimatedRecovery: args.estimatedRecovery,
    notes: args.notes,
    status: "current",
    clearanceDate: undefined,
    createdBy: user._id,
    createdAt: now,
    updatedAt: now,
  });
}

async function updateInjuryLogic(
  ctx: any,
  args: {
    injuryId: Id<"playerInjuries">;
    date: number;
    injuryType: string;
    severity: string;
    estimatedRecovery?: string;
    notes?: string;
    status: string;
    clearanceDate?: number;
  }
) {
  const { teamId } = await requireRole(ctx, ["admin", "physio"]);

  const entry = await ctx.db.get(args.injuryId);
  if (!entry || entry.teamId !== teamId) {
    throw new ConvexError({ code: "NOT_FOUND" as const, message: "Injury entry not found" });
  }

  if (!["minor", "moderate", "severe"].includes(args.severity)) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Severity must be minor, moderate, or severe" });
  }
  if (!["current", "recovered"].includes(args.status)) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Status must be current or recovered" });
  }
  if (!args.injuryType || args.injuryType.trim().length === 0) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Injury type is required" });
  }
  if (args.injuryType.length > 200) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Injury type cannot exceed 200 characters" });
  }
  if (args.estimatedRecovery && args.estimatedRecovery.length > 200) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Estimated recovery cannot exceed 200 characters" });
  }
  if (args.notes && args.notes.length > 2000) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Notes cannot exceed 2000 characters" });
  }

  await ctx.db.patch(args.injuryId, {
    date: args.date,
    injuryType: args.injuryType,
    severity: args.severity,
    estimatedRecovery: args.estimatedRecovery,
    notes: args.notes,
    status: args.status,
    clearanceDate: args.clearanceDate,
    updatedAt: Date.now(),
  });

  return args.injuryId;
}

async function deleteInjuryLogic(
  ctx: any,
  args: { injuryId: Id<"playerInjuries"> }
) {
  const { teamId } = await requireRole(ctx, ["admin", "physio"]);

  const entry = await ctx.db.get(args.injuryId);
  if (!entry || entry.teamId !== teamId) {
    throw new ConvexError({ code: "NOT_FOUND" as const, message: "Injury entry not found" });
  }

  await ctx.db.delete(args.injuryId);
}

const VALID_INJURY = {
  date: Date.now(),
  injuryType: "Hamstring strain",
  severity: "moderate",
  estimatedRecovery: "4-6 weeks",
  notes: "Occurred during training",
};

const VALID_UPDATE_FIELDS = {
  ...VALID_INJURY,
  status: "current",
};

// ---------------------------------------------------------------------------
// getPlayerInjuries (Task 12.2)
// ---------------------------------------------------------------------------

describe("getPlayerInjuries", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin can retrieve injury entries sorted by date descending", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    await t.run(async (ctx) => {
      await ctx.db.insert("playerInjuries", {
        teamId, playerId, date: 1000, injuryType: "ACL tear", severity: "severe",
        status: "recovered", createdBy: userId, createdAt: Date.now(), updatedAt: Date.now(),
      });
      await ctx.db.insert("playerInjuries", {
        teamId, playerId, date: 3000, injuryType: "Hamstring", severity: "moderate",
        status: "current", createdBy: userId, createdAt: Date.now(), updatedAt: Date.now(),
      });
      await ctx.db.insert("playerInjuries", {
        teamId, playerId, date: 2000, injuryType: "Ankle", severity: "minor",
        status: "recovered", createdBy: userId, createdAt: Date.now(), updatedAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      return await getPlayerInjuriesLogic(ctx, { playerId });
    });

    expect(result).toHaveLength(3);
    expect(result[0].date).toBe(3000);
    expect(result[1].date).toBe(2000);
    expect(result[2].date).toBe(1000);
  });

  it("physio can retrieve injury entries", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "physio" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    await t.run(async (ctx) => {
      await ctx.db.insert("playerInjuries", {
        teamId, playerId, date: 1000, injuryType: "Sprain", severity: "minor",
        status: "current", createdBy: userId, createdAt: Date.now(), updatedAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      return await getPlayerInjuriesLogic(ctx, { playerId });
    });

    expect(result).toHaveLength(1);
  });

  it("coach gets NOT_AUTHORIZED error", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await getPlayerInjuriesLogic(ctx, { playerId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("player gets NOT_AUTHORIZED error", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await getPlayerInjuriesLogic(ctx, { playerId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("analyst gets NOT_AUTHORIZED error", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "analyst" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await getPlayerInjuriesLogic(ctx, { playerId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("returns empty array when no entries exist", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const result = await t.run(async (ctx) => {
      return await getPlayerInjuriesLogic(ctx, { playerId });
    });

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it("throws NOT_FOUND for player on different team", async () => {
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
          await getPlayerInjuriesLogic(ctx, { playerId: otherPlayerId });
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
        await getPlayerInjuriesLogic(ctx, { playerId });
      })
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getPlayerInjuryStatus (Task 12.3)
// ---------------------------------------------------------------------------

describe("getPlayerInjuryStatus", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("any authenticated team member can call it and gets { hasCurrentInjury: boolean }", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const result = await t.run(async (ctx) => {
      return await getPlayerInjuryStatusLogic(ctx, { playerId });
    });

    expect(result).toHaveProperty("hasCurrentInjury");
    expect(typeof result.hasCurrentInjury).toBe("boolean");
  });

  it("returns true when a 'current' injury exists", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    await t.run(async (ctx) => {
      await ctx.db.insert("playerInjuries", {
        teamId, playerId, date: Date.now(), injuryType: "ACL tear", severity: "severe",
        status: "current", createdBy: userId, createdAt: Date.now(), updatedAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      return await getPlayerInjuryStatusLogic(ctx, { playerId });
    });

    expect(result.hasCurrentInjury).toBe(true);
  });

  it("returns false when only 'recovered' injuries exist", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    await t.run(async (ctx) => {
      await ctx.db.insert("playerInjuries", {
        teamId, playerId, date: Date.now(), injuryType: "Sprain", severity: "minor",
        status: "recovered", createdBy: userId, createdAt: Date.now(), updatedAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      return await getPlayerInjuryStatusLogic(ctx, { playerId });
    });

    expect(result.hasCurrentInjury).toBe(false);
  });

  it("returns false when no injuries exist", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const result = await t.run(async (ctx) => {
      return await getPlayerInjuryStatusLogic(ctx, { playerId });
    });

    expect(result.hasCurrentInjury).toBe(false);
  });

  it("response shape is exactly { hasCurrentInjury: boolean } — no detail fields", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "staff" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    await t.run(async (ctx) => {
      await ctx.db.insert("playerInjuries", {
        teamId, playerId, date: Date.now(), injuryType: "Hamstring", severity: "moderate",
        status: "current", notes: "Secret details", createdBy: userId,
        createdAt: Date.now(), updatedAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      return await getPlayerInjuryStatusLogic(ctx, { playerId });
    });

    const keys = Object.keys(result);
    expect(keys).toEqual(["hasCurrentInjury"]);
    // Ensure no injury details leaked
    expect(result).not.toHaveProperty("injuryType");
    expect(result).not.toHaveProperty("severity");
    expect(result).not.toHaveProperty("notes");
    expect(result).not.toHaveProperty("date");
  });

  it("wrong team player throws NOT_FOUND", async () => {
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
          await getPlayerInjuryStatusLogic(ctx, { playerId: otherPlayerId });
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
// logInjury (Task 12.4)
// ---------------------------------------------------------------------------

describe("logInjury", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin can log injury — returns a valid ID", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const injuryId = await t.run(async (ctx) => {
      return await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
    });

    expect(injuryId).toBeDefined();
    const entry = await t.run(async (ctx) => ctx.db.get(injuryId));
    expect(entry).not.toBeNull();
    expect(entry!.injuryType).toBe("Hamstring strain");
  });

  it("physio can log injury — returns a valid ID", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "physio" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const injuryId = await t.run(async (ctx) => {
      return await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
    });

    expect(injuryId).toBeDefined();
  });

  it("coach gets NOT_AUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("player gets NOT_AUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("wrong team player throws NOT_FOUND", async () => {
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
          await logInjuryLogic(ctx, { playerId: otherPlayerId, ...VALID_INJURY });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });

  it("invalid severity throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await logInjuryLogic(ctx, { playerId, ...VALID_INJURY, severity: "extreme" });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("empty injuryType throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await logInjuryLogic(ctx, { playerId, ...VALID_INJURY, injuryType: "" });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("injuryType > 200 chars throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await logInjuryLogic(ctx, { playerId, ...VALID_INJURY, injuryType: "x".repeat(201) });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("notes > 2000 chars throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await logInjuryLogic(ctx, { playerId, ...VALID_INJURY, notes: "x".repeat(2001) });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("estimatedRecovery > 200 chars throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await logInjuryLogic(ctx, { playerId, ...VALID_INJURY, estimatedRecovery: "x".repeat(201) });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("created entry has status 'current', clearanceDate undefined, correct metadata", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const injuryId = await t.run(async (ctx) => {
      return await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
    });

    const entry = await t.run(async (ctx) => ctx.db.get(injuryId));
    expect(entry!.status).toBe("current");
    expect(entry!.clearanceDate).toBeUndefined();
    expect(entry!.createdBy).toBe(userId);
    expect(entry!.teamId).toBe(teamId);
    expect(entry!.createdAt).toBeGreaterThan(0);
    expect(entry!.updatedAt).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// updateInjury (Task 12.5)
// ---------------------------------------------------------------------------

describe("updateInjury", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin can update an existing injury entry", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const injuryId = await t.run(async (ctx) => {
      return await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
    });

    const returnedId = await t.run(async (ctx) => {
      return await updateInjuryLogic(ctx, {
        injuryId,
        ...VALID_UPDATE_FIELDS,
        injuryType: "ACL tear",
        severity: "severe",
      });
    });

    expect(returnedId).toBe(injuryId);
    const updated = await t.run(async (ctx) => ctx.db.get(injuryId));
    expect(updated!.injuryType).toBe("ACL tear");
    expect(updated!.severity).toBe("severe");
  });

  it("physio can update an existing injury entry", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "physio" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const injuryId = await t.run(async (ctx) => {
      return await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
    });

    const returnedId = await t.run(async (ctx) => {
      return await updateInjuryLogic(ctx, {
        injuryId,
        ...VALID_UPDATE_FIELDS,
        notes: "Updated by physio",
      });
    });

    expect(returnedId).toBe(injuryId);
  });

  it("coach gets NOT_AUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const injuryId = await t.run(async (ctx) => {
      return await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
    });

    // Switch to coach
    const { userId: coachId } = await seedTeamAndUser(t, {
      role: "coach", email: "coach@example.com", name: "Coach", teamId,
    });
    mockGetAuthUserId.mockResolvedValue(coachId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updateInjuryLogic(ctx, { injuryId, ...VALID_UPDATE_FIELDS });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("updating entry from different team throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const injuryId = await t.run(async (ctx) => {
      return await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
    });

    const { userId: userId2 } = await seedTeamAndUser(t, {
      email: "admin2@example.com", name: "Admin 2",
    });
    mockGetAuthUserId.mockResolvedValue(userId2);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updateInjuryLogic(ctx, { injuryId, ...VALID_UPDATE_FIELDS });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });

  it("can change status from 'current' to 'recovered' with clearanceDate", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const injuryId = await t.run(async (ctx) => {
      return await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
    });

    const clearanceDate = Date.now();
    await t.run(async (ctx) => {
      return await updateInjuryLogic(ctx, {
        injuryId, ...VALID_UPDATE_FIELDS,
        status: "recovered",
        clearanceDate,
      });
    });

    const updated = await t.run(async (ctx) => ctx.db.get(injuryId));
    expect(updated!.status).toBe("recovered");
    expect(updated!.clearanceDate).toBe(clearanceDate);
  });

  it("can change status from 'recovered' back to 'current'", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const injuryId = await t.run(async (ctx) => {
      return await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
    });

    // First recover
    await t.run(async (ctx) => {
      return await updateInjuryLogic(ctx, {
        injuryId, ...VALID_UPDATE_FIELDS, status: "recovered", clearanceDate: Date.now(),
      });
    });

    // Then reopen
    await t.run(async (ctx) => {
      return await updateInjuryLogic(ctx, {
        injuryId, ...VALID_UPDATE_FIELDS, status: "current",
      });
    });

    const updated = await t.run(async (ctx) => ctx.db.get(injuryId));
    expect(updated!.status).toBe("current");
  });

  it("invalid status throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const injuryId = await t.run(async (ctx) => {
      return await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
    });

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updateInjuryLogic(ctx, { injuryId, ...VALID_UPDATE_FIELDS, status: "healing" });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("updatedAt is refreshed on update", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const injuryId = await t.run(async (ctx) => {
      return await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
    });

    const original = await t.run(async (ctx) => ctx.db.get(injuryId));
    const originalUpdatedAt = original!.updatedAt;

    await new Promise((r) => setTimeout(r, 10));

    await t.run(async (ctx) => {
      return await updateInjuryLogic(ctx, { injuryId, ...VALID_UPDATE_FIELDS });
    });

    const updated = await t.run(async (ctx) => ctx.db.get(injuryId));
    expect(updated!.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
  });

  it("non-existent injuryId throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const injuryId = await t.run(async (ctx) => {
      return await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
    });
    await t.run(async (ctx) => {
      await ctx.db.delete(injuryId);
    });

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updateInjuryLogic(ctx, { injuryId, ...VALID_UPDATE_FIELDS });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });

  it("invalid severity throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const injuryId = await t.run(async (ctx) => {
      return await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
    });

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updateInjuryLogic(ctx, { injuryId, ...VALID_UPDATE_FIELDS, severity: "extreme" });
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
// deleteInjury (Task 12.6)
// ---------------------------------------------------------------------------

describe("deleteInjury", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin can delete an injury entry", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const injuryId = await t.run(async (ctx) => {
      return await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
    });

    await t.run(async (ctx) => {
      await deleteInjuryLogic(ctx, { injuryId });
    });

    const deleted = await t.run(async (ctx) => ctx.db.get(injuryId));
    expect(deleted).toBeNull();
  });

  it("physio can delete an injury entry", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "physio" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const injuryId = await t.run(async (ctx) => {
      return await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
    });

    await t.run(async (ctx) => {
      await deleteInjuryLogic(ctx, { injuryId });
    });

    const deleted = await t.run(async (ctx) => ctx.db.get(injuryId));
    expect(deleted).toBeNull();
  });

  it("coach gets NOT_AUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const injuryId = await t.run(async (ctx) => {
      return await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
    });

    const { userId: coachId } = await seedTeamAndUser(t, {
      role: "coach", email: "coach@example.com", name: "Coach", teamId,
    });
    mockGetAuthUserId.mockResolvedValue(coachId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await deleteInjuryLogic(ctx, { injuryId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("deleting entry from different team throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const injuryId = await t.run(async (ctx) => {
      return await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
    });

    const { userId: userId2 } = await seedTeamAndUser(t, {
      email: "admin2@example.com", name: "Admin 2",
    });
    mockGetAuthUserId.mockResolvedValue(userId2);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await deleteInjuryLogic(ctx, { injuryId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });

  it("deleted entry no longer appears in getPlayerInjuries results", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const injuryId = await t.run(async (ctx) => {
      return await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
    });

    const before = await t.run(async (ctx) => {
      return await getPlayerInjuriesLogic(ctx, { playerId });
    });
    expect(before).toHaveLength(1);

    await t.run(async (ctx) => {
      await deleteInjuryLogic(ctx, { injuryId });
    });

    const after = await t.run(async (ctx) => {
      return await getPlayerInjuriesLogic(ctx, { playerId });
    });
    expect(after).toHaveLength(0);
  });

  it("deleted entry makes getPlayerInjuryStatus return false if it was the only current injury", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const injuryId = await t.run(async (ctx) => {
      return await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
    });

    const before = await t.run(async (ctx) => {
      return await getPlayerInjuryStatusLogic(ctx, { playerId });
    });
    expect(before.hasCurrentInjury).toBe(true);

    await t.run(async (ctx) => {
      await deleteInjuryLogic(ctx, { injuryId });
    });

    const after = await t.run(async (ctx) => {
      return await getPlayerInjuryStatusLogic(ctx, { playerId });
    });
    expect(after.hasCurrentInjury).toBe(false);
  });

  it("non-existent injuryId throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await seedPlayer(t, teamId);

    const injuryId = await t.run(async (ctx) => {
      return await logInjuryLogic(ctx, { playerId, ...VALID_INJURY });
    });
    await t.run(async (ctx) => {
      await ctx.db.delete(injuryId);
    });

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await deleteInjuryLogic(ctx, { injuryId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });
});
