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
      name: overrides.name ?? "Test User",
      email: overrides.email ?? "user@example.com",
      role: (overrides.role as any) ?? "admin",
      status: "active",
      teamId,
    });

    return { userId, teamId };
  });
}

async function insertPlayer(
  t: ReturnType<typeof convexTest>,
  data: {
    teamId: Id<"teams">;
    firstName: string;
    lastName: string;
    position: string;
    status: string;
    userId?: Id<"users">;
  }
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("players", {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  });
}

async function insertContract(
  t: ReturnType<typeof convexTest>,
  data: {
    teamId: Id<"teams">;
    playerId: Id<"players">;
    fileId: Id<"_storage">;
    extractionStatus?: "pending" | "processing" | "completed" | "failed";
    extractedData?: {
      salary?: string;
      bonuses?: string;
      clauses?: string;
      duration?: string;
      terminationTerms?: string;
      governingLaw?: string;
    };
  }
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("contracts", {
      teamId: data.teamId,
      playerId: data.playerId,
      fileId: data.fileId,
      extractionStatus: data.extractionStatus ?? "completed",
      extractedData: data.extractedData,
      createdAt: now,
      updatedAt: now,
    });
  });
}

/**
 * Upload a fake file to storage and return its Id.
 */
async function uploadFakeFile(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const blob = new Blob(["fake-pdf-content"], { type: "application/pdf" });
    return await ctx.storage.store(blob);
  });
}

// ===========================================================================
// canViewContract — AC1, AC3, AC4, AC5, AC7 (Task 4.2)
// ===========================================================================

describe("canViewContract", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin user → returns true for any player in same team", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const result = await t.query(
      (await import("../queries")).canViewContract,
      { playerId }
    );
    expect(result).toBe(true);
  });

  it("player user viewing own profile → returns true", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Self",
      lastName: "Player",
      position: "Midfielder",
      status: "active",
      userId,
    });

    const result = await t.query(
      (await import("../queries")).canViewContract,
      { playerId }
    );
    expect(result).toBe(true);
  });

  it("player user viewing other player → returns false", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create "self" player record linked to current user
    await insertPlayer(t, {
      teamId,
      firstName: "Self",
      lastName: "Player",
      position: "Midfielder",
      status: "active",
      userId,
    });

    // Create another user's player
    const otherUserId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Other",
        email: "other@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      })
    );

    const otherPlayerId = await insertPlayer(t, {
      teamId,
      firstName: "Other",
      lastName: "Player",
      position: "Defender",
      status: "active",
      userId: otherUserId,
    });

    const result = await t.query(
      (await import("../queries")).canViewContract,
      { playerId: otherPlayerId }
    );
    expect(result).toBe(false);
  });

  it("coach → returns false", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const result = await t.query(
      (await import("../queries")).canViewContract,
      { playerId }
    );
    expect(result).toBe(false);
  });

  it("analyst → returns false", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "analyst" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const result = await t.query(
      (await import("../queries")).canViewContract,
      { playerId }
    );
    expect(result).toBe(false);
  });

  it("physio → returns false", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "physio" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const result = await t.query(
      (await import("../queries")).canViewContract,
      { playerId }
    );
    expect(result).toBe(false);
  });

  it("staff → returns false", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "staff" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const result = await t.query(
      (await import("../queries")).canViewContract,
      { playerId }
    );
    expect(result).toBe(false);
  });

  it("admin from different team → returns false", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create player in a different team
    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Club", slug: "other-club" })
    );

    const playerId = await insertPlayer(t, {
      teamId: otherTeamId,
      firstName: "Other",
      lastName: "Player",
      position: "Defender",
      status: "active",
    });

    const result = await t.query(
      (await import("../queries")).canViewContract,
      { playerId }
    );
    expect(result).toBe(false);
  });
});

// ===========================================================================
// getContract — AC2, AC4, AC5, AC6 (Task 4.3)
// ===========================================================================

describe("getContract", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin → returns full contract with readOnly: false", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const fileId = await uploadFakeFile(t);
    await insertContract(t, {
      teamId,
      playerId,
      fileId,
      extractionStatus: "completed",
      extractedData: {
        salary: "€1M/year",
        bonuses: "10% win bonus",
        duration: "3 years",
      },
    });

    const result = await t.query(
      (await import("../queries")).getContract,
      { playerId }
    );

    expect(result).not.toBeNull();
    expect(result!.readOnly).toBe(false);
    expect(result!.extractedData).toEqual({
      salary: "€1M/year",
      bonuses: "10% win bonus",
      duration: "3 years",
    });
    expect(result!.extractionStatus).toBe("completed");
  });

  it("player-self → returns contract with readOnly: true", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Self",
      lastName: "Player",
      position: "Midfielder",
      status: "active",
      userId,
    });

    const fileId = await uploadFakeFile(t);
    await insertContract(t, {
      teamId,
      playerId,
      fileId,
      extractionStatus: "completed",
      extractedData: { salary: "€500K/year" },
    });

    const result = await t.query(
      (await import("../queries")).getContract,
      { playerId }
    );

    expect(result).not.toBeNull();
    expect(result!.readOnly).toBe(true);
    expect(result!.extractedData).toEqual({ salary: "€500K/year" });
  });

  it("player-other → returns null", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create self player record
    await insertPlayer(t, {
      teamId,
      firstName: "Self",
      lastName: "Player",
      position: "Midfielder",
      status: "active",
      userId,
    });

    // Create another player with a contract
    const otherUserId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Other",
        email: "other@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      })
    );

    const otherPlayerId = await insertPlayer(t, {
      teamId,
      firstName: "Other",
      lastName: "Player",
      position: "Defender",
      status: "active",
      userId: otherUserId,
    });

    const fileId = await uploadFakeFile(t);
    await insertContract(t, {
      teamId,
      playerId: otherPlayerId,
      fileId,
    });

    const result = await t.query(
      (await import("../queries")).getContract,
      { playerId: otherPlayerId }
    );

    expect(result).toBeNull();
  });

  it("coach → returns null (not an error)", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const fileId = await uploadFakeFile(t);
    await insertContract(t, { teamId, playerId, fileId });

    const result = await t.query(
      (await import("../queries")).getContract,
      { playerId }
    );

    expect(result).toBeNull();
  });

  it("physio → returns null", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "physio" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const fileId = await uploadFakeFile(t);
    await insertContract(t, { teamId, playerId, fileId });

    const result = await t.query(
      (await import("../queries")).getContract,
      { playerId }
    );

    expect(result).toBeNull();
  });

  it("analyst → returns null", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "analyst" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const fileId = await uploadFakeFile(t);
    await insertContract(t, { teamId, playerId, fileId });

    const result = await t.query(
      (await import("../queries")).getContract,
      { playerId }
    );

    expect(result).toBeNull();
  });

  it("staff → returns null", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "staff" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const fileId = await uploadFakeFile(t);
    await insertContract(t, { teamId, playerId, fileId });

    const result = await t.query(
      (await import("../queries")).getContract,
      { playerId }
    );

    expect(result).toBeNull();
  });

  it("wrong team admin → returns null (cross-tenant isolation)", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create player in a different team
    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Club", slug: "other-club" })
    );

    const playerId = await insertPlayer(t, {
      teamId: otherTeamId,
      firstName: "Other",
      lastName: "Player",
      position: "Defender",
      status: "active",
    });

    const fileId = await uploadFakeFile(t);
    await insertContract(t, {
      teamId: otherTeamId,
      playerId,
      fileId,
    });

    const result = await t.query(
      (await import("../queries")).getContract,
      { playerId }
    );

    expect(result).toBeNull();
  });

  it("returns null when no contract exists", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const result = await t.query(
      (await import("../queries")).getContract,
      { playerId }
    );

    expect(result).toBeNull();
  });
});

// ===========================================================================
// getContractDownloadUrl — AC2, AC4 (Task 4.4)
// ===========================================================================

describe("getContractDownloadUrl", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin → returns signed URL", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const fileId = await uploadFakeFile(t);
    await insertContract(t, { teamId, playerId, fileId });

    const result = await t.query(
      (await import("../queries")).getContractDownloadUrl,
      { playerId }
    );

    expect(result).not.toBeNull();
    expect(typeof result).toBe("string");
  });

  it("player-self → returns signed URL", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Self",
      lastName: "Player",
      position: "Midfielder",
      status: "active",
      userId,
    });

    const fileId = await uploadFakeFile(t);
    await insertContract(t, { teamId, playerId, fileId });

    const result = await t.query(
      (await import("../queries")).getContractDownloadUrl,
      { playerId }
    );

    expect(result).not.toBeNull();
    expect(typeof result).toBe("string");
  });

  it("non-admin/non-self → returns null", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const fileId = await uploadFakeFile(t);
    await insertContract(t, { teamId, playerId, fileId });

    const result = await t.query(
      (await import("../queries")).getContractDownloadUrl,
      { playerId }
    );

    expect(result).toBeNull();
  });

  it("player viewing other player's contract → returns null", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create self player
    await insertPlayer(t, {
      teamId,
      firstName: "Self",
      lastName: "Player",
      position: "Midfielder",
      status: "active",
      userId,
    });

    // Create other player with contract
    const otherUserId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Other",
        email: "other@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      })
    );

    const otherPlayerId = await insertPlayer(t, {
      teamId,
      firstName: "Other",
      lastName: "Player",
      position: "Defender",
      status: "active",
      userId: otherUserId,
    });

    const fileId = await uploadFakeFile(t);
    await insertContract(t, { teamId, playerId: otherPlayerId, fileId });

    const result = await t.query(
      (await import("../queries")).getContractDownloadUrl,
      { playerId: otherPlayerId }
    );

    expect(result).toBeNull();
  });

  it("cross-team admin → returns null", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Club", slug: "other-club" })
    );

    const playerId = await insertPlayer(t, {
      teamId: otherTeamId,
      firstName: "Other",
      lastName: "Player",
      position: "Defender",
      status: "active",
    });

    const fileId = await uploadFakeFile(t);
    await insertContract(t, { teamId: otherTeamId, playerId, fileId });

    const result = await t.query(
      (await import("../queries")).getContractDownloadUrl,
      { playerId }
    );

    expect(result).toBeNull();
  });
});

// ===========================================================================
// Mutation Guards — Task 4.5
//
// Uses the inline-mirror-handler pattern from status-and-self-service.test.ts:
// Mirror functions replicate the actual mutation handler logic so that tests
// exercise the full code path (auth check + DB operations), not just the
// auth helper in isolation.
// ===========================================================================

const { requireRole: requireRoleFn } = await import("../../lib/auth");

function getErrorCode(error: unknown): string | undefined {
  if (error instanceof ConvexError) {
    return (error.data as any).code;
  }
  return undefined;
}

/** Mirrors uploadContract mutation handler */
async function uploadContractLogic(
  ctx: any,
  args: { playerId: Id<"players">; fileId: Id<"_storage"> }
) {
  const { teamId } = await requireRoleFn(ctx, ["admin"]);

  const player = await ctx.db.get(args.playerId);
  if (!player || player.teamId !== teamId) {
    throw new ConvexError({ code: "NOT_FOUND" as const, message: "Player not found." });
  }

  const existing = await ctx.db
    .query("contracts")
    .withIndex("by_teamId_playerId", (q: any) =>
      q.eq("teamId", teamId).eq("playerId", args.playerId)
    )
    .first();

  const now = Date.now();
  if (existing) {
    await ctx.db.patch(existing._id, {
      fileId: args.fileId,
      extractionStatus: "pending",
      extractedData: undefined,
      extractionError: undefined,
      updatedAt: now,
    });
    return existing._id;
  }

  return await ctx.db.insert("contracts", {
    teamId,
    playerId: args.playerId,
    fileId: args.fileId,
    extractionStatus: "pending",
    createdAt: now,
    updatedAt: now,
  });
}

/** Mirrors updateContractFields mutation handler */
async function updateContractFieldsLogic(
  ctx: any,
  args: { playerId: Id<"players">; extractedData: Record<string, string | undefined> }
) {
  const { teamId } = await requireRoleFn(ctx, ["admin"]);

  const player = await ctx.db.get(args.playerId);
  if (!player || player.teamId !== teamId) {
    throw new ConvexError({ code: "NOT_FOUND" as const, message: "Player not found." });
  }

  const contract = await ctx.db
    .query("contracts")
    .withIndex("by_teamId_playerId", (q: any) =>
      q.eq("teamId", teamId).eq("playerId", args.playerId)
    )
    .first();

  if (!contract) {
    throw new ConvexError({ code: "NOT_FOUND" as const, message: "No contract found for this player." });
  }

  await ctx.db.patch(contract._id, {
    extractedData: args.extractedData,
    updatedAt: Date.now(),
  });

  return contract._id;
}

describe("uploadContract mutation guard", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin → succeeds", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const fileId = await uploadFakeFile(t);

    const result = await t.mutation(
      (await import("../mutations")).uploadContract,
      { playerId, fileId }
    );

    expect(result).toBeDefined();
  });

  it("player → rejects with NOT_AUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
      userId,
    });

    const fileId = await uploadFakeFile(t);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await uploadContractLogic(ctx, { playerId, fileId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("coach → rejects with NOT_AUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const fileId = await uploadFakeFile(t);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await uploadContractLogic(ctx, { playerId, fileId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("physio → rejects with NOT_AUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "physio" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const fileId = await uploadFakeFile(t);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await uploadContractLogic(ctx, { playerId, fileId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("staff → rejects with NOT_AUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "staff" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const fileId = await uploadFakeFile(t);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await uploadContractLogic(ctx, { playerId, fileId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });
});

describe("updateContractFields mutation guard", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin → succeeds", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const fileId = await uploadFakeFile(t);
    await insertContract(t, { teamId, playerId, fileId });

    const result = await t.mutation(
      (await import("../mutations")).updateContractFields,
      {
        playerId,
        extractedData: { salary: "€2M/year" },
      }
    );

    expect(result).toBeDefined();
  });

  it("player → rejects with NOT_AUTHORIZED (even for own contract)", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
      userId,
    });

    const fileId = await uploadFakeFile(t);
    await insertContract(t, { teamId, playerId, fileId });

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updateContractFieldsLogic(ctx, {
            playerId,
            extractedData: { salary: "€999M/year" },
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("analyst → rejects with NOT_AUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "analyst" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const fileId = await uploadFakeFile(t);
    await insertContract(t, { teamId, playerId, fileId });

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updateContractFieldsLogic(ctx, {
            playerId,
            extractedData: { salary: "€999M/year" },
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });
});
