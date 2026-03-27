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
const { requireRole } = await import("../../lib/auth");
const { getAuthUserId } = await import("@convex-dev/auth/server");

const modules = import.meta.glob(["../../**/*.ts", "!../../http.ts"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward"];

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

// ---------------------------------------------------------------------------
// Inline mutation logic for convex-test compatibility (t.run pattern)
// ---------------------------------------------------------------------------

/** Mirrors createPlayer handler in mutations.ts */
async function createPlayerLogic(
  ctx: any,
  args: {
    firstName: string;
    lastName: string;
    position: string;
    photo?: string;
    dateOfBirth?: number;
    nationality?: string;
    squadNumber?: number;
    preferredFoot?: string;
    heightCm?: number;
    weightKg?: number;
    phone?: string;
    personalEmail?: string;
    address?: string;
    emergencyContactName?: string;
    emergencyContactRelationship?: string;
    emergencyContactPhone?: string;
  }
) {
  const { teamId } = await requireRole(ctx, ["admin"]);

  if (!VALID_POSITIONS.includes(args.position)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: `Invalid position "${args.position}". Must be one of: ${VALID_POSITIONS.join(", ")}.`,
    });
  }

  if (args.squadNumber !== undefined) {
    const existing = await ctx.db
      .query("players")
      .withIndex("by_teamId_squadNumber", (q: any) =>
        q.eq("teamId", teamId).eq("squadNumber", args.squadNumber)
      )
      .first();
    if (existing) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: `Squad number ${args.squadNumber} is already assigned to ${existing.firstName} ${existing.lastName}.`,
      });
    }
  }

  const now = Date.now();
  return await ctx.db.insert("players", {
    teamId,
    firstName: args.firstName,
    lastName: args.lastName,
    photo: args.photo,
    dateOfBirth: args.dateOfBirth,
    nationality: args.nationality,
    position: args.position,
    squadNumber: args.squadNumber,
    preferredFoot: args.preferredFoot,
    heightCm: args.heightCm,
    weightKg: args.weightKg,
    phone: args.phone,
    personalEmail: args.personalEmail,
    address: args.address,
    emergencyContactName: args.emergencyContactName,
    emergencyContactRelationship: args.emergencyContactRelationship,
    emergencyContactPhone: args.emergencyContactPhone,
    status: "active",
    userId: undefined,
    createdAt: now,
    updatedAt: now,
  });
}

/** Mirrors invitePlayer handler (without scheduler call for test safety) */
async function invitePlayerLogic(
  ctx: any,
  args: { playerId: Id<"players"> }
) {
  const { teamId } = await requireRole(ctx, ["admin"]);

  const player = await ctx.db.get(args.playerId);
  if (!player) {
    throw new ConvexError({
      code: "NOT_FOUND" as const,
      message: "Player not found.",
    });
  }

  if (player.teamId !== teamId) {
    throw new ConvexError({
      code: "NOT_AUTHORIZED" as const,
      message: "Player does not belong to your team.",
    });
  }

  if (!player.personalEmail) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message:
        "Player does not have a personal email address. Add an email before sending an invitation.",
    });
  }

  // Invalidate any existing pending invites
  const existingInvites = await ctx.db
    .query("playerInvites")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerId))
    .collect();

  for (const invite of existingInvites) {
    if (invite.status === "pending") {
      await ctx.db.patch(invite._id, { status: "expired" });
    }
  }

  const token = crypto.randomUUID();
  const now = Date.now();

  return await ctx.db.insert("playerInvites", {
    teamId,
    playerId: args.playerId,
    email: player.personalEmail,
    token,
    status: "pending",
    createdAt: now,
    expiresAt: now + 7 * 24 * 60 * 60 * 1000,
  });
}

/** Mirrors acceptPlayerInvite handler */
async function acceptPlayerInviteLogic(
  ctx: any,
  args: { token: string }
) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError({
      code: "NOT_AUTHENTICATED" as const,
      message: "Not authenticated. Please sign up first.",
    });
  }

  const user = await ctx.db.get(userId);
  if (!user) {
    throw new ConvexError({
      code: "NOT_AUTHENTICATED" as const,
      message: "User not found.",
    });
  }

  const invite = await ctx.db
    .query("playerInvites")
    .withIndex("by_token", (q: any) => q.eq("token", args.token))
    .first();

  if (!invite) {
    throw new ConvexError({
      code: "NOT_FOUND" as const,
      message: "Invalid invitation token.",
    });
  }

  if (invite.status !== "pending") {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "This invitation has already been used.",
    });
  }

  if (invite.expiresAt < Date.now()) {
    await ctx.db.patch(invite._id, { status: "expired" });
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message:
        "This invitation has expired. Please ask your club admin to send a new one.",
    });
  }

  const player = await ctx.db.get(invite.playerId);
  if (!player) {
    throw new ConvexError({
      code: "NOT_FOUND" as const,
      message: "Player profile not found.",
    });
  }

  await ctx.db.patch(userId, {
    role: "player",
    teamId: player.teamId,
    name: `${player.firstName} ${player.lastName}`,
    status: "active",
    hasCompletedOnboarding: true,
  });

  await ctx.db.patch(invite.playerId, {
    userId,
    updatedAt: Date.now(),
  });

  await ctx.db.patch(invite._id, { status: "accepted" });

  return { success: true, userId };
}

// ---------------------------------------------------------------------------
// createPlayer
// ---------------------------------------------------------------------------

describe("createPlayer", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin can create a player with all required fields and returns a valid ID", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) => {
      return await createPlayerLogic(ctx, {
        firstName: "Marcus",
        lastName: "Rashford",
        position: "Forward",
      });
    });

    expect(playerId).toBeDefined();

    // Verify inserted data
    const player = await t.run(async (ctx) => ctx.db.get(playerId));
    expect(player).not.toBeNull();
    expect(player!.firstName).toBe("Marcus");
    expect(player!.lastName).toBe("Rashford");
    expect(player!.position).toBe("Forward");
    expect(player!.status).toBe("active");
    expect(player!.userId).toBeUndefined();
    expect(player!.teamId).toBe(teamId);
    expect(player!.createdAt).toBeGreaterThan(0);
    expect(player!.updatedAt).toBeGreaterThan(0);
  });

  it("non-admin user gets NOT_AUTHORIZED error", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await createPlayerLogic(ctx, {
            firstName: "Test",
            lastName: "Player",
            position: "Forward",
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("unauthenticated user gets NOT_AUTHENTICATED error", async () => {
    const t = convexTest(schema, modules);
    mockGetAuthUserId.mockResolvedValue(null);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await createPlayerLogic(ctx, {
            firstName: "Test",
            lastName: "Player",
            position: "Forward",
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHENTICATED");
  });

  it("invalid position throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await createPlayerLogic(ctx, {
            firstName: "Test",
            lastName: "Player",
            position: "Striker", // Invalid
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("duplicate squadNumber within the same team throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    // First player with squad number 10
    await t.run(async (ctx) => {
      return await createPlayerLogic(ctx, {
        firstName: "First",
        lastName: "Player",
        position: "Forward",
        squadNumber: 10,
      });
    });

    // Second player with same squad number
    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await createPlayerLogic(ctx, {
            firstName: "Second",
            lastName: "Player",
            position: "Midfielder",
            squadNumber: 10,
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("same squadNumber on different teams succeeds", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create player on first team with squad number 10
    await t.run(async (ctx) => {
      return await createPlayerLogic(ctx, {
        firstName: "First",
        lastName: "Player",
        position: "Forward",
        squadNumber: 10,
      });
    });

    // Create a second team and admin
    const { userId: userId2 } = await seedTeamAndUser(t, {
      email: "admin2@example.com",
      name: "Admin 2",
    });
    mockGetAuthUserId.mockResolvedValue(userId2);

    // Should succeed on different team
    const playerId = await t.run(async (ctx) => {
      return await createPlayerLogic(ctx, {
        firstName: "Second",
        lastName: "Player",
        position: "Midfielder",
        squadNumber: 10,
      });
    });

    expect(playerId).toBeDefined();
  });

  it("player is created with status active and userId undefined", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) => {
      return await createPlayerLogic(ctx, {
        firstName: "Test",
        lastName: "Player",
        position: "Goalkeeper",
      });
    });

    const player = await t.run(async (ctx) => ctx.db.get(playerId));
    expect(player!.status).toBe("active");
    expect(player!.userId).toBeUndefined();
  });

  it("optional fields are stored correctly when provided", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) => {
      return await createPlayerLogic(ctx, {
        firstName: "Marcus",
        lastName: "Rashford",
        position: "Forward",
        squadNumber: 10,
        nationality: "England",
        preferredFoot: "Right",
        heightCm: 180,
        weightKg: 70,
        phone: "+44 123",
        personalEmail: "marcus@test.com",
        address: "123 Street",
        emergencyContactName: "Parent",
        emergencyContactRelationship: "Father",
        emergencyContactPhone: "+44 456",
      });
    });

    const player = await t.run(async (ctx) => ctx.db.get(playerId));
    expect(player!.squadNumber).toBe(10);
    expect(player!.nationality).toBe("England");
    expect(player!.preferredFoot).toBe("Right");
    expect(player!.heightCm).toBe(180);
    expect(player!.weightKg).toBe(70);
    expect(player!.phone).toBe("+44 123");
    expect(player!.personalEmail).toBe("marcus@test.com");
    expect(player!.address).toBe("123 Street");
    expect(player!.emergencyContactName).toBe("Parent");
    expect(player!.emergencyContactRelationship).toBe("Father");
    expect(player!.emergencyContactPhone).toBe("+44 456");
  });

  it("optional fields are undefined when omitted", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) => {
      return await createPlayerLogic(ctx, {
        firstName: "Test",
        lastName: "Player",
        position: "Defender",
      });
    });

    const player = await t.run(async (ctx) => ctx.db.get(playerId));
    expect(player!.squadNumber).toBeUndefined();
    expect(player!.nationality).toBeUndefined();
    expect(player!.preferredFoot).toBeUndefined();
    expect(player!.heightCm).toBeUndefined();
    expect(player!.weightKg).toBeUndefined();
    expect(player!.phone).toBeUndefined();
    expect(player!.personalEmail).toBeUndefined();
    expect(player!.address).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// invitePlayer
// ---------------------------------------------------------------------------

describe("invitePlayer", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin can invite a player who has a personalEmail", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create a player with email
    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Marcus",
        lastName: "Rashford",
        position: "Forward",
        status: "active",
        personalEmail: "marcus@test.com",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const inviteId = await t.run(async (ctx) => {
      return await invitePlayerLogic(ctx, { playerId });
    });

    expect(inviteId).toBeDefined();

    // Verify invite record
    const invite = await t.run(async (ctx) => ctx.db.get(inviteId));
    expect(invite).not.toBeNull();
    expect(invite!.status).toBe("pending");
    expect(invite!.email).toBe("marcus@test.com");
    expect(invite!.teamId).toBe(teamId);
    expect(invite!.playerId).toBe(playerId);
    expect(invite!.token).toBeDefined();
    expect(invite!.token.length).toBeGreaterThan(0);
  });

  it("non-admin user gets NOT_AUTHORIZED error", async () => {
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
        personalEmail: "test@test.com",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await invitePlayerLogic(ctx, { playerId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("inviting a player without personalEmail throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "No",
        lastName: "Email",
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
          await invitePlayerLogic(ctx, { playerId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("re-inviting a player expires the previous pending invite and creates a new one", async () => {
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
        personalEmail: "test@test.com",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    // First invite
    const inviteId1 = await t.run(async (ctx) => {
      return await invitePlayerLogic(ctx, { playerId });
    });

    // Re-invite
    const inviteId2 = await t.run(async (ctx) => {
      return await invitePlayerLogic(ctx, { playerId });
    });

    expect(inviteId2).not.toBe(inviteId1);

    // First invite should be expired
    const invite1 = await t.run(async (ctx) => ctx.db.get(inviteId1));
    expect(invite1!.status).toBe("expired");

    // Second invite should be pending
    const invite2 = await t.run(async (ctx) => ctx.db.get(inviteId2));
    expect(invite2!.status).toBe("pending");
  });

  it("invite expiresAt is 7 days from creation", async () => {
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
        personalEmail: "test@test.com",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const inviteId = await t.run(async (ctx) => {
      return await invitePlayerLogic(ctx, { playerId });
    });

    const invite = await t.run(async (ctx) => ctx.db.get(inviteId));
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(invite!.expiresAt - invite!.createdAt).toBe(sevenDays);
  });
});

// ---------------------------------------------------------------------------
// validatePlayerInvite
// ---------------------------------------------------------------------------

describe("validatePlayerInvite", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("valid pending token returns player details", async () => {
    const t = convexTest(schema, modules);
    const teamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Test Club", slug: "test-club" })
    );

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Marcus",
        lastName: "Rashford",
        position: "Forward",
        status: "active",
        personalEmail: "marcus@test.com",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    await t.run(async (ctx) =>
      ctx.db.insert("playerInvites", {
        teamId,
        playerId,
        email: "marcus@test.com",
        token: "valid-token-123",
        status: "pending",
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      })
    );

    const result = await t.query(
      (await import("../queries")).validatePlayerInvite,
      { token: "valid-token-123" }
    );

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.firstName).toBe("Marcus");
      expect(result.lastName).toBe("Rashford");
      expect(result.email).toBe("marcus@test.com");
    }
  });

  it("non-existent token returns valid:false, reason:not_found", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(
      (await import("../queries")).validatePlayerInvite,
      { token: "does-not-exist" }
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("not_found");
    }
  });

  it("already accepted token returns valid:false, reason:already_used", async () => {
    const t = convexTest(schema, modules);
    const teamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Test Club", slug: "test-club" })
    );

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

    await t.run(async (ctx) =>
      ctx.db.insert("playerInvites", {
        teamId,
        playerId,
        email: "test@test.com",
        token: "accepted-token",
        status: "accepted",
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      })
    );

    const result = await t.query(
      (await import("../queries")).validatePlayerInvite,
      { token: "accepted-token" }
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("already_used");
    }
  });

  it("expired token returns valid:false, reason:expired", async () => {
    const t = convexTest(schema, modules);
    const teamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Test Club", slug: "test-club" })
    );

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

    await t.run(async (ctx) =>
      ctx.db.insert("playerInvites", {
        teamId,
        playerId,
        email: "test@test.com",
        token: "expired-token",
        status: "pending",
        createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
        expiresAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
      })
    );

    const result = await t.query(
      (await import("../queries")).validatePlayerInvite,
      { token: "expired-token" }
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("expired");
    }
  });
});

// ---------------------------------------------------------------------------
// acceptPlayerInvite
// ---------------------------------------------------------------------------

describe("acceptPlayerInvite", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("valid token creates user linkage, sets invite to accepted", async () => {
    const t = convexTest(schema, modules);
    const teamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Test Club", slug: "test-club" })
    );

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Marcus",
        lastName: "Rashford",
        position: "Forward",
        status: "active",
        personalEmail: "marcus@test.com",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const inviteId = await t.run(async (ctx) =>
      ctx.db.insert("playerInvites", {
        teamId,
        playerId,
        email: "marcus@test.com",
        token: "accept-token",
        status: "pending",
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      })
    );

    // Create a user (simulating what @convex-dev/auth does on signUp)
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "marcus@test.com",
        name: "Marcus Rashford",
        status: "active",
      })
    );
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) => {
      return await acceptPlayerInviteLogic(ctx, { token: "accept-token" });
    });

    expect(result.success).toBe(true);
    expect(result.userId).toBe(userId);

    // Verify user was updated
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user!.role).toBe("player");
    expect(user!.teamId).toBe(teamId);

    // Verify player was linked
    const player = await t.run(async (ctx) => ctx.db.get(playerId));
    expect(player!.userId).toBe(userId);

    // Verify invite was accepted
    const invite = await t.run(async (ctx) => ctx.db.get(inviteId));
    expect(invite!.status).toBe("accepted");
  });

  it("invalid token throws NOT_FOUND error", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "test@test.com",
        name: "Test",
        status: "active",
      })
    );
    mockGetAuthUserId.mockResolvedValue(userId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await acceptPlayerInviteLogic(ctx, { token: "invalid-token" });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });

  it("expired token throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const teamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Test Club", slug: "test-club" })
    );

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

    await t.run(async (ctx) =>
      ctx.db.insert("playerInvites", {
        teamId,
        playerId,
        email: "test@test.com",
        token: "expired-accept-token",
        status: "pending",
        createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
        expiresAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
      })
    );

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "test@test.com",
        name: "Test",
        status: "active",
      })
    );
    mockGetAuthUserId.mockResolvedValue(userId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await acceptPlayerInviteLogic(ctx, {
            token: "expired-accept-token",
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("created user has role player and correct teamId", async () => {
    const t = convexTest(schema, modules);
    const teamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Test Club", slug: "test-club" })
    );

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("players", {
        teamId,
        firstName: "Test",
        lastName: "Player",
        position: "Defender",
        status: "active",
        personalEmail: "test@test.com",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    await t.run(async (ctx) =>
      ctx.db.insert("playerInvites", {
        teamId,
        playerId,
        email: "test@test.com",
        token: "role-test-token",
        status: "pending",
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      })
    );

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "test@test.com",
        name: "Test Player",
        status: "active",
      })
    );
    mockGetAuthUserId.mockResolvedValue(userId);

    await t.run(async (ctx) => {
      await acceptPlayerInviteLogic(ctx, { token: "role-test-token" });
    });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user!.role).toBe("player");
    expect(user!.teamId).toBe(teamId);
  });

  it("unauthenticated user gets NOT_AUTHENTICATED error", async () => {
    const t = convexTest(schema, modules);
    mockGetAuthUserId.mockResolvedValue(null);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await acceptPlayerInviteLogic(ctx, { token: "any-token" });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHENTICATED");
  });
});
