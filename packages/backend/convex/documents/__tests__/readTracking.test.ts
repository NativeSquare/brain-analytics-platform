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
const modules = import.meta.glob("../../**/*.ts");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface SeedOptions {
  role?: string;
  teamId?: Id<"teams">;
  name?: string;
  fullName?: string;
  email?: string;
  status?: string;
}

async function seedTeamAndUser(
  t: ReturnType<typeof convexTest>,
  overrides: SeedOptions = {},
) {
  return await t.run(async (ctx) => {
    const teamId =
      overrides.teamId ??
      (await ctx.db.insert("teams", { name: "Test Club", slug: "test-club" }));

    const userId = await ctx.db.insert("users", {
      name: overrides.name ?? "Test User",
      fullName: overrides.fullName,
      email: overrides.email ?? "user@example.com",
      role: (overrides.role as any) ?? "admin",
      status: (overrides.status as any) ?? "active",
      teamId,
    });

    return { userId, teamId };
  });
}

async function insertFolder(
  t: ReturnType<typeof convexTest>,
  teamId: Id<"teams">,
  createdBy: Id<"users">,
  overrides: Record<string, any> = {},
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("folders", {
      teamId,
      name: overrides.name ?? "Test Folder",
      createdBy,
      createdAt: Date.now(),
      ...overrides,
    });
  });
}

async function insertDocument(
  t: ReturnType<typeof convexTest>,
  teamId: Id<"teams">,
  folderId: Id<"folders">,
  ownerId: Id<"users">,
  overrides: Record<string, any> = {},
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("documents", {
      teamId,
      folderId,
      name: overrides.name ?? "Test Document",
      ownerId,
      createdAt: overrides.createdAt ?? Date.now(),
      updatedAt: overrides.updatedAt ?? Date.now(),
      ...overrides,
    });
  });
}

async function insertUserPermission(
  t: ReturnType<typeof convexTest>,
  teamId: Id<"teams">,
  targetType: "folder" | "document",
  targetId: string,
  userId: Id<"users">,
  grantedBy: Id<"users">,
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("documentUserPermissions", {
      teamId,
      targetType,
      targetId,
      userId,
      grantedBy,
      createdAt: Date.now(),
    });
  });
}

function extractErrorCode(error: unknown): string {
  if (!(error instanceof ConvexError)) throw error;
  const rawData = error.data;
  const errData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
  return errData.code;
}

// ===========================================================================
// trackRead
// ===========================================================================

describe("trackRead", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("creates a documentReads record with correct fields", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await insertFolder(t, teamId, userId);
    const docId = await insertDocument(t, teamId, folderId, userId);

    const result = await t.mutation(
      (await import("../mutations")).trackRead,
      { documentId: docId },
    );

    expect(result).toEqual({ success: true });

    // Verify the record
    const reads = await t.run(async (ctx) => {
      return await ctx.db
        .query("documentReads")
        .withIndex("by_userId_documentId", (q) =>
          q.eq("userId", userId).eq("documentId", docId),
        )
        .collect();
    });

    expect(reads).toHaveLength(1);
    expect(reads[0]!.teamId).toBe(teamId);
    expect(reads[0]!.documentId).toBe(docId);
    expect(reads[0]!.userId).toBe(userId);
    expect(reads[0]!.readAt).toBeTypeOf("number");
  });

  it("updates readAt on second call instead of creating duplicate", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await insertFolder(t, teamId, userId);
    const docId = await insertDocument(t, teamId, folderId, userId);

    // First call
    await t.mutation(
      (await import("../mutations")).trackRead,
      { documentId: docId },
    );

    const firstReads = await t.run(async (ctx) => {
      return await ctx.db
        .query("documentReads")
        .withIndex("by_userId_documentId", (q) =>
          q.eq("userId", userId).eq("documentId", docId),
        )
        .collect();
    });
    const firstReadAt = firstReads[0]!.readAt;

    // Second call
    await t.mutation(
      (await import("../mutations")).trackRead,
      { documentId: docId },
    );

    const secondReads = await t.run(async (ctx) => {
      return await ctx.db
        .query("documentReads")
        .withIndex("by_userId_documentId", (q) =>
          q.eq("userId", userId).eq("documentId", docId),
        )
        .collect();
    });

    // Only one record, readAt updated
    expect(secondReads).toHaveLength(1);
    expect(secondReads[0]!.readAt).toBeGreaterThanOrEqual(firstReadAt);
  });

  it("different user tracking same document creates separate record", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
      name: "Admin User",
      email: "admin@example.com",
    });
    const { userId: coachId } = await seedTeamAndUser(t, {
      role: "coach",
      teamId,
      name: "Coach User",
      email: "coach@example.com",
    });

    const folderId = await insertFolder(t, teamId, adminId);
    const docId = await insertDocument(t, teamId, folderId, adminId);

    // Admin tracks read
    mockGetAuthUserId.mockResolvedValue(adminId);
    await t.mutation(
      (await import("../mutations")).trackRead,
      { documentId: docId },
    );

    // Coach tracks read
    mockGetAuthUserId.mockResolvedValue(coachId);
    await t.mutation(
      (await import("../mutations")).trackRead,
      { documentId: docId },
    );

    const reads = await t.run(async (ctx) => {
      return await ctx.db
        .query("documentReads")
        .withIndex("by_documentId", (q) => q.eq("documentId", docId))
        .collect();
    });

    expect(reads).toHaveLength(2);
  });

  it("rejects user without document access (NOT_AUTHORIZED)", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
      name: "Admin",
      email: "admin@example.com",
    });
    const { userId: playerId } = await seedTeamAndUser(t, {
      role: "player",
      teamId,
      name: "Player",
      email: "player@example.com",
    });

    // Create a restricted folder/document
    const folderId = await insertFolder(t, teamId, adminId, {
      permittedRoles: ["coach"],
    });
    const docId = await insertDocument(t, teamId, folderId, adminId);

    mockGetAuthUserId.mockResolvedValue(playerId);

    const err = await t
      .mutation(
        (await import("../mutations")).trackRead,
        { documentId: docId },
      )
      .catch((e: unknown) => e);

    expect(extractErrorCode(err)).toBe("NOT_AUTHORIZED");
  });

  it("rejects document from different team (NOT_FOUND)", async () => {
    const t = convexTest(schema, modules);
    const { userId: user1Id, teamId: team1Id } = await seedTeamAndUser(t, {
      name: "User1",
      email: "user1@example.com",
    });

    const team2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("teams", { name: "Other Club", slug: "other-club" });
    });
    const { userId: user2Id } = await seedTeamAndUser(t, {
      teamId: team2Id,
      name: "User2",
      email: "user2@example.com",
    });

    const folderId = await insertFolder(t, team2Id, user2Id);
    const docId = await insertDocument(t, team2Id, folderId, user2Id);

    mockGetAuthUserId.mockResolvedValue(user1Id);

    const err = await t
      .mutation(
        (await import("../mutations")).trackRead,
        { documentId: docId },
      )
      .catch((e: unknown) => e);

    expect(extractErrorCode(err)).toBe("NOT_FOUND");
  });

  it("rejects unauthenticated request", async () => {
    const t = convexTest(schema, modules);
    mockGetAuthUserId.mockResolvedValue(null);

    const { userId, teamId } = await seedTeamAndUser(t);
    const folderId = await insertFolder(t, teamId, userId);
    const docId = await insertDocument(t, teamId, folderId, userId);

    const err = await t
      .mutation(
        (await import("../mutations")).trackRead,
        { documentId: docId },
      )
      .catch((e: unknown) => e);

    expect(extractErrorCode(err)).toBe("NOT_AUTHENTICATED");
  });
});

// ===========================================================================
// getReadStats
// ===========================================================================

describe("getReadStats", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns correct uniqueReaders count for each document", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
      name: "Admin",
      email: "admin@example.com",
      fullName: "Admin User",
    });
    const { userId: coachId } = await seedTeamAndUser(t, {
      role: "coach",
      teamId,
      name: "Coach",
      email: "coach@example.com",
      fullName: "Coach User",
    });

    const folderId = await insertFolder(t, teamId, adminId);
    const doc1Id = await insertDocument(t, teamId, folderId, adminId, {
      name: "Doc 1",
    });
    const doc2Id = await insertDocument(t, teamId, folderId, adminId, {
      name: "Doc 2",
    });

    // Seed read records directly
    await t.run(async (ctx) => {
      await ctx.db.insert("documentReads", {
        teamId,
        documentId: doc1Id,
        userId: adminId,
        readAt: Date.now() - 1000,
      });
      await ctx.db.insert("documentReads", {
        teamId,
        documentId: doc1Id,
        userId: coachId,
        readAt: Date.now(),
      });
      // doc2 has no reads
    });

    mockGetAuthUserId.mockResolvedValue(adminId);

    const stats = await t.query(
      (await import("../queries")).getReadStats,
      { documentIds: [doc1Id, doc2Id] },
    );

    expect(stats[doc1Id]!.uniqueReaders).toBe(2);
    expect(stats[doc2Id]!.uniqueReaders).toBe(0);
  });

  it("returns reads sorted by most recent first", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
      name: "Admin",
      email: "admin@example.com",
      fullName: "Admin User",
    });
    const { userId: coachId } = await seedTeamAndUser(t, {
      role: "coach",
      teamId,
      name: "Coach",
      email: "coach@example.com",
      fullName: "Coach User",
    });

    const folderId = await insertFolder(t, teamId, adminId);
    const docId = await insertDocument(t, teamId, folderId, adminId);

    const olderTime = Date.now() - 10000;
    const newerTime = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("documentReads", {
        teamId,
        documentId: docId,
        userId: adminId,
        readAt: olderTime,
      });
      await ctx.db.insert("documentReads", {
        teamId,
        documentId: docId,
        userId: coachId,
        readAt: newerTime,
      });
    });

    mockGetAuthUserId.mockResolvedValue(adminId);

    const stats = await t.query(
      (await import("../queries")).getReadStats,
      { documentIds: [docId] },
    );

    const reads = stats[docId]!.reads;
    expect(reads).toHaveLength(2);
    // Most recent first
    expect(reads[0]!.readAt).toBe(newerTime);
    expect(reads[1]!.readAt).toBe(olderTime);
  });

  it("returns empty reads array for documents with zero reads", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
    });

    const folderId = await insertFolder(t, teamId, adminId);
    const docId = await insertDocument(t, teamId, folderId, adminId);

    mockGetAuthUserId.mockResolvedValue(adminId);

    const stats = await t.query(
      (await import("../queries")).getReadStats,
      { documentIds: [docId] },
    );

    expect(stats[docId]!.uniqueReaders).toBe(0);
    expect(stats[docId]!.reads).toEqual([]);
  });

  it("rejects non-admin (NOT_AUTHORIZED)", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
      name: "Admin",
      email: "admin@example.com",
    });
    const { userId: coachId } = await seedTeamAndUser(t, {
      role: "coach",
      teamId,
      name: "Coach",
      email: "coach@example.com",
    });

    const folderId = await insertFolder(t, teamId, adminId);
    const docId = await insertDocument(t, teamId, folderId, adminId);

    mockGetAuthUserId.mockResolvedValue(coachId);

    const err = await t
      .query(
        (await import("../queries")).getReadStats,
        { documentIds: [docId] },
      )
      .catch((e: unknown) => e);

    expect(extractErrorCode(err)).toBe("NOT_AUTHORIZED");
  });
});

// ===========================================================================
// getUsersWithAccessCount
// ===========================================================================

describe("getUsersWithAccessCount", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("unrestricted document returns total active team members count", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
      name: "Admin",
      email: "admin@example.com",
    });
    // Add more active users
    await seedTeamAndUser(t, {
      role: "coach",
      teamId,
      name: "Coach",
      email: "coach@example.com",
    });
    await seedTeamAndUser(t, {
      role: "player",
      teamId,
      name: "Player",
      email: "player@example.com",
    });
    // Deactivated user should NOT be counted
    await seedTeamAndUser(t, {
      role: "staff",
      teamId,
      name: "Deactivated",
      email: "deactivated@example.com",
      status: "deactivated",
    });

    const folderId = await insertFolder(t, teamId, adminId);
    // No permittedRoles = unrestricted
    const docId = await insertDocument(t, teamId, folderId, adminId);

    mockGetAuthUserId.mockResolvedValue(adminId);

    const result = await t.query(
      (await import("../queries")).getUsersWithAccessCount,
      { documentId: docId },
    );

    // 3 active users (admin, coach, player)
    expect(result.totalWithAccess).toBe(3);
  });

  it("restricted document returns count of matching roles + admins", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
      name: "Admin",
      email: "admin@example.com",
    });
    await seedTeamAndUser(t, {
      role: "coach",
      teamId,
      name: "Coach",
      email: "coach@example.com",
    });
    await seedTeamAndUser(t, {
      role: "player",
      teamId,
      name: "Player",
      email: "player@example.com",
    });

    const folderId = await insertFolder(t, teamId, adminId);
    // Restricted to coach only
    const docId = await insertDocument(t, teamId, folderId, adminId, {
      permittedRoles: ["coach"],
    });

    mockGetAuthUserId.mockResolvedValue(adminId);

    const result = await t.query(
      (await import("../queries")).getUsersWithAccessCount,
      { documentId: docId },
    );

    // admin (always) + coach = 2
    expect(result.totalWithAccess).toBe(2);
  });

  it("includes individual permission users in count", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
      name: "Admin",
      email: "admin@example.com",
    });
    const { userId: playerId } = await seedTeamAndUser(t, {
      role: "player",
      teamId,
      name: "Player",
      email: "player@example.com",
    });
    await seedTeamAndUser(t, {
      role: "staff",
      teamId,
      name: "Staff",
      email: "staff@example.com",
    });

    const folderId = await insertFolder(t, teamId, adminId);
    // Restricted to coach role (no coaches exist) but player has individual grant
    const docId = await insertDocument(t, teamId, folderId, adminId, {
      permittedRoles: ["coach"],
    });

    await insertUserPermission(
      t,
      teamId,
      "document",
      docId as string,
      playerId,
      adminId,
    );

    mockGetAuthUserId.mockResolvedValue(adminId);

    const result = await t.query(
      (await import("../queries")).getUsersWithAccessCount,
      { documentId: docId },
    );

    // admin (always) + player (individual grant) = 2
    expect(result.totalWithAccess).toBe(2);
  });

  it("inherits folder permissions when document permittedRoles is undefined", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
      name: "Admin",
      email: "admin@example.com",
    });
    await seedTeamAndUser(t, {
      role: "coach",
      teamId,
      name: "Coach",
      email: "coach@example.com",
    });
    await seedTeamAndUser(t, {
      role: "player",
      teamId,
      name: "Player",
      email: "player@example.com",
    });

    // Folder restricted to coach
    const folderId = await insertFolder(t, teamId, adminId, {
      permittedRoles: ["coach"],
    });
    // Document inherits (no permittedRoles)
    const docId = await insertDocument(t, teamId, folderId, adminId);

    mockGetAuthUserId.mockResolvedValue(adminId);

    const result = await t.query(
      (await import("../queries")).getUsersWithAccessCount,
      { documentId: docId },
    );

    // admin + coach = 2 (inherited from folder)
    expect(result.totalWithAccess).toBe(2);
  });

  it("rejects non-admin (NOT_AUTHORIZED)", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
      name: "Admin",
      email: "admin@example.com",
    });
    const { userId: coachId } = await seedTeamAndUser(t, {
      role: "coach",
      teamId,
      name: "Coach",
      email: "coach@example.com",
    });

    const folderId = await insertFolder(t, teamId, adminId);
    const docId = await insertDocument(t, teamId, folderId, adminId);

    mockGetAuthUserId.mockResolvedValue(coachId);

    const err = await t
      .query(
        (await import("../queries")).getUsersWithAccessCount,
        { documentId: docId },
      )
      .catch((e: unknown) => e);

    expect(extractErrorCode(err)).toBe("NOT_AUTHORIZED");
  });
});

// ===========================================================================
// getReadersDetail
// ===========================================================================

describe("getReadersDetail", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns readers list with correct user info and timestamps", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
      name: "Admin",
      fullName: "Admin User",
      email: "admin@example.com",
    });
    const { userId: coachId } = await seedTeamAndUser(t, {
      role: "coach",
      teamId,
      name: "Coach",
      fullName: "Coach User",
      email: "coach@example.com",
    });

    const folderId = await insertFolder(t, teamId, adminId);
    const docId = await insertDocument(t, teamId, folderId, adminId, {
      name: "My Document",
    });

    const readTime = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert("documentReads", {
        teamId,
        documentId: docId,
        userId: coachId,
        readAt: readTime,
      });
    });

    mockGetAuthUserId.mockResolvedValue(adminId);

    const detail = await t.query(
      (await import("../queries")).getReadersDetail,
      { documentId: docId },
    );

    expect(detail.documentName).toBe("My Document");
    expect(detail.readers).toHaveLength(1);
    expect(detail.readers[0]!.userId).toBe(coachId);
    expect(detail.readers[0]!.fullName).toBe("Coach User");
    expect(detail.readers[0]!.role).toBe("coach");
    expect(detail.readers[0]!.readAt).toBe(readTime);
  });

  it("returns nonReaders list (users with access but no read record)", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
      name: "Admin",
      fullName: "Admin User",
      email: "admin@example.com",
    });
    const { userId: coachId } = await seedTeamAndUser(t, {
      role: "coach",
      teamId,
      name: "Coach",
      fullName: "Coach User",
      email: "coach@example.com",
    });
    const { userId: playerId } = await seedTeamAndUser(t, {
      role: "player",
      teamId,
      name: "Player",
      fullName: "Player User",
      email: "player@example.com",
    });

    const folderId = await insertFolder(t, teamId, adminId);
    const docId = await insertDocument(t, teamId, folderId, adminId);

    // Only coach has read
    await t.run(async (ctx) => {
      await ctx.db.insert("documentReads", {
        teamId,
        documentId: docId,
        userId: coachId,
        readAt: Date.now(),
      });
    });

    mockGetAuthUserId.mockResolvedValue(adminId);

    const detail = await t.query(
      (await import("../queries")).getReadersDetail,
      { documentId: docId },
    );

    // Unrestricted doc: all 3 users have access
    expect(detail.readers).toHaveLength(1);
    expect(detail.readers[0]!.userId).toBe(coachId);

    // Admin and player haven't read
    expect(detail.nonReaders).toHaveLength(2);
    const nonReaderIds = detail.nonReaders.map(
      (nr: { userId: string }) => nr.userId,
    );
    expect(nonReaderIds).toContain(adminId);
    expect(nonReaderIds).toContain(playerId);
  });

  it("rejects non-admin (NOT_AUTHORIZED)", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
      name: "Admin",
      email: "admin@example.com",
    });
    const { userId: coachId } = await seedTeamAndUser(t, {
      role: "coach",
      teamId,
      name: "Coach",
      email: "coach@example.com",
    });

    const folderId = await insertFolder(t, teamId, adminId);
    const docId = await insertDocument(t, teamId, folderId, adminId);

    mockGetAuthUserId.mockResolvedValue(coachId);

    const err = await t
      .query(
        (await import("../queries")).getReadersDetail,
        { documentId: docId },
      )
      .catch((e: unknown) => e);

    expect(extractErrorCode(err)).toBe("NOT_AUTHORIZED");
  });
});
