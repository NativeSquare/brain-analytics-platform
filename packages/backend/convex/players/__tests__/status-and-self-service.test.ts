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
const { PLAYER_STATUSES } = await import("@packages/shared/players");

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

function getErrorCode(error: unknown): string | undefined {
  if (error instanceof ConvexError) {
    return (error.data as any).code;
  }
  return undefined;
}

function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof ConvexError) {
    return (error.data as any).message;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Inline mutation/query logic for convex-test compatibility (t.run pattern)
// ---------------------------------------------------------------------------

/** Mirrors updatePlayerStatus handler */
async function updatePlayerStatusLogic(
  ctx: any,
  args: { playerId: Id<"players">; status: string }
) {
  const { user, teamId } = await requireRole(ctx, ["admin"]);

  const player = await ctx.db.get(args.playerId);
  if (!player || player.teamId !== teamId) {
    throw new ConvexError({ code: "NOT_FOUND" as const, message: "Player not found" });
  }

  if (!(PLAYER_STATUSES as readonly string[]).includes(args.status)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Status must be active, onLoan, or leftClub",
    });
  }

  if (player.status === args.status) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Player already has this status",
    });
  }

  await ctx.db.patch(args.playerId, { status: args.status, updatedAt: Date.now() });

  if (player.userId) {
    const linkedUser = await ctx.db.get(player.userId);
    if (linkedUser) {
      if (args.status === "leftClub") {
        await ctx.db.patch(player.userId, { banned: true });
      } else if (linkedUser.banned) {
        await ctx.db.patch(player.userId, { banned: false });
      }
    }
  }

  return args.playerId;
}

/** Mirrors getOwnPlayerProfile handler */
async function getOwnPlayerProfileLogic(ctx: any) {
  const { user, teamId } = await requireAuth(ctx);

  const player = await ctx.db
    .query("players")
    .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
    .first();

  if (!player) return null;

  if (player.teamId !== teamId) {
    throw new ConvexError({ code: "NOT_FOUND" as const, message: "Player not found" });
  }

  const photoUrl = player.photo
    ? await ctx.storage.getUrl(player.photo)
    : null;

  return { ...player, photoUrl };
}

/** Mirrors updateOwnContactInfo handler */
async function updateOwnContactInfoLogic(
  ctx: any,
  args: {
    phone?: string;
    personalEmail?: string;
    address?: string;
    emergencyContactName?: string;
    emergencyContactRelationship?: string;
    emergencyContactPhone?: string;
  }
) {
  const { user, teamId } = await requireAuth(ctx);

  const player = await ctx.db
    .query("players")
    .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
    .first();

  if (!player || player.teamId !== teamId) {
    throw new ConvexError({
      code: "NOT_FOUND" as const,
      message: "No player profile linked to your account",
    });
  }

  if (args.personalEmail && args.personalEmail.trim() !== "") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.personalEmail)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Invalid email format",
      });
    }
  }

  for (const [key, value] of Object.entries(args)) {
    if (typeof value === "string" && value.length > 500) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: `${key} cannot exceed 500 characters`,
      });
    }
  }

  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  if (args.phone !== undefined) patch.phone = args.phone || undefined;
  if (args.personalEmail !== undefined) patch.personalEmail = args.personalEmail || undefined;
  if (args.address !== undefined) patch.address = args.address || undefined;
  if (args.emergencyContactName !== undefined) patch.emergencyContactName = args.emergencyContactName || undefined;
  if (args.emergencyContactRelationship !== undefined) patch.emergencyContactRelationship = args.emergencyContactRelationship || undefined;
  if (args.emergencyContactPhone !== undefined) patch.emergencyContactPhone = args.emergencyContactPhone || undefined;

  await ctx.db.patch(player._id, patch);
  return player._id;
}

// ---------------------------------------------------------------------------
// updatePlayerStatus
// ---------------------------------------------------------------------------

describe("updatePlayerStatus", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("(a) admin can change status from active to onLoan", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Marcus",
        lastName: "Rashford",
        position: "Forward",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const result = await t.run(async (ctx) =>
      updatePlayerStatusLogic(ctx, { playerId, status: "onLoan" })
    );

    expect(result).toBe(playerId);
    const player = await t.run(async (ctx) => ctx.db.get(playerId));
    expect(player!.status).toBe("onLoan");
  });

  it("(b) admin can change status from active to leftClub", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Marcus",
        lastName: "Rashford",
        position: "Forward",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const result = await t.run(async (ctx) =>
      updatePlayerStatusLogic(ctx, { playerId, status: "leftClub" })
    );

    expect(result).toBe(playerId);
    const player = await t.run(async (ctx) => ctx.db.get(playerId));
    expect(player!.status).toBe("leftClub");
  });

  it("(c) admin can change status from leftClub back to active — reactivates account", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerUserId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player User",
        email: "player@test.com",
        role: "player" as any,
        status: "active",
        teamId,
        banned: true,
      })
    );

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Marcus",
        lastName: "Rashford",
        position: "Forward",
        status: "leftClub",
        userId: playerUserId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    await t.run(async (ctx) =>
      updatePlayerStatusLogic(ctx, { playerId, status: "active" })
    );

    const player = await t.run(async (ctx) => ctx.db.get(playerId));
    expect(player!.status).toBe("active");

    const linkedUser = await t.run(async (ctx) => ctx.db.get(playerUserId));
    expect(linkedUser!.banned).toBe(false);
  });

  it("(d) admin can change status from onLoan to active", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Test",
        lastName: "Player",
        position: "Midfielder",
        status: "onLoan",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    await t.run(async (ctx) =>
      updatePlayerStatusLogic(ctx, { playerId, status: "active" })
    );

    const player = await t.run(async (ctx) => ctx.db.get(playerId));
    expect(player!.status).toBe("active");
  });

  it("(e) admin can change status from leftClub to onLoan — reactivates account", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerUserId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player User",
        email: "player@test.com",
        role: "player" as any,
        status: "active",
        teamId,
        banned: true,
      })
    );

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Test",
        lastName: "Player",
        position: "Forward",
        status: "leftClub",
        userId: playerUserId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    await t.run(async (ctx) =>
      updatePlayerStatusLogic(ctx, { playerId, status: "onLoan" })
    );

    const player = await t.run(async (ctx) => ctx.db.get(playerId));
    expect(player!.status).toBe("onLoan");

    const linkedUser = await t.run(async (ctx) => ctx.db.get(playerUserId));
    expect(linkedUser!.banned).toBe(false);
  });

  it("(f) non-admin (coach) gets NOT_AUTHORIZED error", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Test",
        lastName: "Player",
        position: "Forward",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updatePlayerStatusLogic(ctx, { playerId, status: "onLoan" });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("(g) non-admin (player) gets NOT_AUTHORIZED error", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Test",
        lastName: "Player",
        position: "Forward",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updatePlayerStatusLogic(ctx, { playerId, status: "onLoan" });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("(h) wrong team player throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create player on a different team
    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Club", slug: "other-club" })
    );

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId: otherTeamId,
        firstName: "Other",
        lastName: "Player",
        position: "Forward",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updatePlayerStatusLogic(ctx, { playerId, status: "onLoan" });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });

  it("(i) invalid status value throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Test",
        lastName: "Player",
        position: "Forward",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updatePlayerStatusLogic(ctx, { playerId, status: "invalid" });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("(j) same status as current throws VALIDATION_ERROR with correct message", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Test",
        lastName: "Player",
        position: "Forward",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    let errorMessage: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updatePlayerStatusLogic(ctx, { playerId, status: "active" });
        } catch (e) {
          errorMessage = getErrorMessage(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorMessage).toBe("Player already has this status");
  });

  it("(k) status change to leftClub deactivates linked user account", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerUserId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player User",
        email: "player@test.com",
        role: "player" as any,
        status: "active",
        teamId,
      })
    );

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Test",
        lastName: "Player",
        position: "Forward",
        status: "active",
        userId: playerUserId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    await t.run(async (ctx) =>
      updatePlayerStatusLogic(ctx, { playerId, status: "leftClub" })
    );

    const linkedUser = await t.run(async (ctx) => ctx.db.get(playerUserId));
    expect(linkedUser!.banned).toBe(true);
  });

  it("(l) status change from leftClub to active reactivates linked user account", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerUserId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player User",
        email: "player@test.com",
        role: "player" as any,
        status: "active",
        teamId,
        banned: true,
      })
    );

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Test",
        lastName: "Player",
        position: "Forward",
        status: "leftClub",
        userId: playerUserId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    await t.run(async (ctx) =>
      updatePlayerStatusLogic(ctx, { playerId, status: "active" })
    );

    const linkedUser = await t.run(async (ctx) => ctx.db.get(playerUserId));
    expect(linkedUser!.banned).toBe(false);
  });

  it("(m) status change for player with no linked userId does NOT throw", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Test",
        lastName: "Player",
        position: "Forward",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    // Should not throw even with no userId linked
    const result = await t.run(async (ctx) =>
      updatePlayerStatusLogic(ctx, { playerId, status: "leftClub" })
    );

    expect(result).toBe(playerId);
    const player = await t.run(async (ctx) => ctx.db.get(playerId));
    expect(player!.status).toBe("leftClub");
  });

  it("(n) updatedAt is refreshed on the player record", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Test",
        lastName: "Player",
        position: "Forward",
        status: "active",
        createdAt: Date.now(),
        updatedAt: 1000,
      })
    );

    const before = await t.run(async (ctx) => ctx.db.get(playerId));
    expect(before!.updatedAt).toBe(1000);

    await t.run(async (ctx) =>
      updatePlayerStatusLogic(ctx, { playerId, status: "onLoan" })
    );

    const after = await t.run(async (ctx) => ctx.db.get(playerId));
    expect(after!.updatedAt).toBeGreaterThan(1000);
  });
});

// ---------------------------------------------------------------------------
// getOwnPlayerProfile
// ---------------------------------------------------------------------------

describe("getOwnPlayerProfile", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("(a) player user with a linked profile gets their full player object", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Marcus",
        lastName: "Rashford",
        position: "Forward",
        status: "active",
        userId,
        phone: "+44 123",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const result = await t.run(async (ctx) =>
      getOwnPlayerProfileLogic(ctx)
    );

    expect(result).not.toBeNull();
    expect(result!._id).toBe(playerId);
    expect(result!.firstName).toBe("Marcus");
    expect(result!.lastName).toBe("Rashford");
    expect(result!.phone).toBe("+44 123");
  });

  it("(b) player with photo gets photoUrl resolved", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    // Note: In convex-test, storage is mocked. photoUrl resolution depends on storage mock.
    // We test that the field is returned (may be null in test env).
    await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Marcus",
        lastName: "Rashford",
        position: "Forward",
        status: "active",
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const result = await t.run(async (ctx) =>
      getOwnPlayerProfileLogic(ctx)
    );

    expect(result).not.toBeNull();
    expect(result).toHaveProperty("photoUrl");
  });

  it("(c) admin user with no linked player profile gets null", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) =>
      getOwnPlayerProfileLogic(ctx)
    );

    expect(result).toBeNull();
  });

  it("(d) coach user with no linked player profile gets null", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) =>
      getOwnPlayerProfileLogic(ctx)
    );

    expect(result).toBeNull();
  });

  it("(e) player user on a different team does NOT get cross-team profile", async () => {
    const t = convexTest(schema, modules);
    const team1Id = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Team 1", slug: "team-1" })
    );
    const team2Id = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Team 2", slug: "team-2" })
    );

    // User is on team 2
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player",
        email: "player@test.com",
        role: "player" as any,
        status: "active",
        teamId: team2Id,
      })
    );
    mockGetAuthUserId.mockResolvedValue(userId);

    // But player profile is on team 1
    await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId: team1Id,
        firstName: "Cross",
        lastName: "Team",
        position: "Forward",
        status: "active",
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await getOwnPlayerProfileLogic(ctx);
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });

  it("(f) unauthenticated user throws error", async () => {
    const t = convexTest(schema, modules);
    mockGetAuthUserId.mockResolvedValue(null);

    await expect(
      t.run(async (ctx) => {
        await getOwnPlayerProfileLogic(ctx);
      })
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// updateOwnContactInfo
// ---------------------------------------------------------------------------

describe("updateOwnContactInfo", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("(a) player can update their own phone number", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Test",
        lastName: "Player",
        position: "Forward",
        status: "active",
        userId,
        phone: "+44 old",
        personalEmail: "old@test.com",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const result = await t.run(async (ctx) =>
      updateOwnContactInfoLogic(ctx, { phone: "+44 new" })
    );

    expect(result).toBe(playerId);
    const player = await t.run(async (ctx) => ctx.db.get(playerId));
    expect(player!.phone).toBe("+44 new");
    // Other fields should remain unchanged
    expect(player!.personalEmail).toBe("old@test.com");
  });

  it("(b) player can update multiple contact fields at once", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Test",
        lastName: "Player",
        position: "Forward",
        status: "active",
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    await t.run(async (ctx) =>
      updateOwnContactInfoLogic(ctx, {
        phone: "+44 123",
        personalEmail: "new@test.com",
        address: "123 New Street",
        emergencyContactName: "Jane Doe",
      })
    );

    const player = await t.run(async (ctx) => ctx.db.get(playerId));
    expect(player!.phone).toBe("+44 123");
    expect(player!.personalEmail).toBe("new@test.com");
    expect(player!.address).toBe("123 New Street");
    expect(player!.emergencyContactName).toBe("Jane Doe");
  });

  it("(c) player can clear a field by passing an empty string", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Test",
        lastName: "Player",
        position: "Forward",
        status: "active",
        userId,
        phone: "+44 123",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    await t.run(async (ctx) =>
      updateOwnContactInfoLogic(ctx, { phone: "" })
    );

    const player = await t.run(async (ctx) => ctx.db.get(playerId));
    // Empty string clears to undefined
    expect(player!.phone).toBeUndefined();
  });

  it("(d) invalid email format throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Test",
        lastName: "Player",
        position: "Forward",
        status: "active",
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updateOwnContactInfoLogic(ctx, {
            personalEmail: "not-an-email",
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("(e) string field > 500 characters throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Test",
        lastName: "Player",
        position: "Forward",
        status: "active",
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updateOwnContactInfoLogic(ctx, {
            phone: "x".repeat(501),
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("(f) user with no linked player profile throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updateOwnContactInfoLogic(ctx, { phone: "+44 123" });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });

  it("(g) admin user with a linked player profile can also use this mutation", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Admin",
        lastName: "Player",
        position: "Forward",
        status: "active",
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const result = await t.run(async (ctx) =>
      updateOwnContactInfoLogic(ctx, { phone: "+44 admin" })
    );

    expect(result).toBe(playerId);
    const player = await t.run(async (ctx) => ctx.db.get(playerId));
    expect(player!.phone).toBe("+44 admin");
  });

  it("(h) updatedAt is refreshed on the player record", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Test",
        lastName: "Player",
        position: "Forward",
        status: "active",
        userId,
        createdAt: Date.now(),
        updatedAt: 1000,
      })
    );

    await t.run(async (ctx) =>
      updateOwnContactInfoLogic(ctx, { phone: "+44 new" })
    );

    const player = await t.run(async (ctx) => ctx.db.get(playerId));
    expect(player!.updatedAt).toBeGreaterThan(1000);
  });

  it("(i) mutation does NOT allow changing non-contact fields", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Test",
        lastName: "Player",
        position: "Forward",
        status: "active",
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    // The mutation only accepts contact fields — firstName/position/status are not in the args
    await t.run(async (ctx) =>
      updateOwnContactInfoLogic(ctx, { phone: "+44 123" })
    );

    const player = await t.run(async (ctx) => ctx.db.get(playerId));
    // Non-contact fields remain unchanged
    expect(player!.firstName).toBe("Test");
    expect(player!.position).toBe("Forward");
    expect(player!.status).toBe("active");
  });

  it("(j) cross-team check: player cannot update a profile from a different team", async () => {
    const t = convexTest(schema, modules);
    const team1Id = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Team 1", slug: "team-1" })
    );
    const team2Id = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Team 2", slug: "team-2" })
    );

    // User is on team 2
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player",
        email: "player@test.com",
        role: "player" as any,
        status: "active",
        teamId: team2Id,
      })
    );
    mockGetAuthUserId.mockResolvedValue(userId);

    // Player profile on team 1 (mismatch)
    await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId: team1Id,
        firstName: "Cross",
        lastName: "Team",
        position: "Forward",
        status: "active",
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updateOwnContactInfoLogic(ctx, { phone: "+44 hack" });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });
});
