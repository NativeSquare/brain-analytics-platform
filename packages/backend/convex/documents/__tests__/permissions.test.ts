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
  overrides: SeedOptions = {},
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
// checkAccess — tested via getFolders query behavior
// ===========================================================================

describe("checkAccess (via getFolders)", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin always has access regardless of permittedRoles", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    await insertFolder(t, teamId, userId, {
      name: "Restricted",
      permittedRoles: ["coach"],
    });
    await insertFolder(t, teamId, userId, {
      name: "Empty Roles",
      permittedRoles: [],
    });

    const result = await t.query(
      (await import("../queries")).getFolders,
      {},
    );

    expect(result.length).toBe(2);
  });

  it("user with matching role has access", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t);

    const coachId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
        role: "coach" as any,
        status: "active",
        teamId,
      }),
    );
    mockGetAuthUserId.mockResolvedValue(coachId);

    await insertFolder(t, teamId, adminId, {
      name: "For Coaches",
      permittedRoles: ["coach", "analyst"],
    });

    const result = await t.query(
      (await import("../queries")).getFolders,
      {},
    );

    expect(result.length).toBe(1);
    expect(result[0].name).toBe("For Coaches");
  });

  it("user without matching role is denied", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player",
        email: "player@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      }),
    );
    mockGetAuthUserId.mockResolvedValue(playerId);

    await insertFolder(t, teamId, adminId, {
      name: "Coaches Only",
      permittedRoles: ["coach"],
    });

    const result = await t.query(
      (await import("../queries")).getFolders,
      {},
    );

    expect(result.length).toBe(0);
  });

  it("user with individual permission has access even when role is excluded", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player",
        email: "player@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      }),
    );
    mockGetAuthUserId.mockResolvedValue(playerId);

    const folderId = await insertFolder(t, teamId, adminId, {
      name: "Coaches Only",
      permittedRoles: ["coach"],
    });

    // Grant individual access to the player
    await insertUserPermission(
      t,
      teamId,
      "folder",
      folderId as string,
      playerId,
      adminId,
    );

    const result = await t.query(
      (await import("../queries")).getFolders,
      {},
    );

    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Coaches Only");
  });

  it("unrestricted access (permittedRoles: undefined) grants all users access", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player",
        email: "player@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      }),
    );
    mockGetAuthUserId.mockResolvedValue(playerId);

    await insertFolder(t, teamId, adminId, { name: "Open Folder" });

    const result = await t.query(
      (await import("../queries")).getFolders,
      {},
    );

    expect(result.length).toBe(1);
  });
});

// ===========================================================================
// checkDocumentAccess — inheritance tests via getFolderContents
// ===========================================================================

describe("checkDocumentAccess (inheritance via getFolderContents)", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("document with permittedRoles: undefined uses folder permissions", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t);

    const coachId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
        role: "coach" as any,
        status: "active",
        teamId,
      }),
    );
    mockGetAuthUserId.mockResolvedValue(coachId);

    // Folder restricted to coaches
    const folderId = await insertFolder(t, teamId, adminId, {
      name: "Coach Folder",
      permittedRoles: ["coach"],
    });

    // Document inherits (permittedRoles undefined)
    await insertDocument(t, teamId, folderId, adminId, {
      name: "Inherited Doc",
    });

    const result = await t.query(
      (await import("../queries")).getFolderContents,
      { folderId },
    );

    expect(result.documents.length).toBe(1);
    expect(result.documents[0].name).toBe("Inherited Doc");
  });

  it("document with own permittedRoles overrides folder permissions", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t);

    const coachId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
        role: "coach" as any,
        status: "active",
        teamId,
      }),
    );
    mockGetAuthUserId.mockResolvedValue(coachId);

    // Folder allows coaches
    const folderId = await insertFolder(t, teamId, adminId, {
      name: "Coach Folder",
      permittedRoles: ["coach"],
    });

    // Document overrides to analyst-only
    await insertDocument(t, teamId, folderId, adminId, {
      name: "Analyst Only Doc",
      permittedRoles: ["analyst"],
    });

    const result = await t.query(
      (await import("../queries")).getFolderContents,
      { folderId },
    );

    // Coach should NOT see this doc (it overrides with analyst-only)
    expect(result.documents.length).toBe(0);
  });

  it("user with folder-level individual permission can access inherited document", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player",
        email: "player@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      }),
    );
    mockGetAuthUserId.mockResolvedValue(playerId);

    // Folder restricted to coaches
    const folderId = await insertFolder(t, teamId, adminId, {
      name: "Coach Folder",
      permittedRoles: ["coach"],
    });

    // Inherit from folder
    await insertDocument(t, teamId, folderId, adminId, {
      name: "Inherited Doc",
    });

    // Grant player individual access to the folder
    await insertUserPermission(
      t,
      teamId,
      "folder",
      folderId as string,
      playerId,
      adminId,
    );

    const result = await t.query(
      (await import("../queries")).getFolderContents,
      { folderId },
    );

    expect(result.documents.length).toBe(1);
  });

  it("user with document-level individual permission can access overridden document", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player",
        email: "player@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      }),
    );
    mockGetAuthUserId.mockResolvedValue(playerId);

    const folderId = await insertFolder(t, teamId, adminId, {
      name: "Coach Folder",
      permittedRoles: ["coach"],
    });

    // Document overrides to analyst-only
    const docId = await insertDocument(t, teamId, folderId, adminId, {
      name: "Analyst Doc",
      permittedRoles: ["analyst"],
    });

    // Grant player individual access to the document
    await insertUserPermission(
      t,
      teamId,
      "document",
      docId as string,
      playerId,
      adminId,
    );

    const result = await t.query(
      (await import("../queries")).getFolderContents,
      { folderId },
    );

    expect(result.documents.length).toBe(1);
    expect(result.documents[0].name).toBe("Analyst Doc");
  });

  it("admin sees all documents regardless of permissions", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(adminId);

    const folderId = await insertFolder(t, teamId, adminId, {
      name: "Restricted Folder",
      permittedRoles: ["coach"],
    });

    await insertDocument(t, teamId, folderId, adminId, {
      name: "Inherited",
    });
    await insertDocument(t, teamId, folderId, adminId, {
      name: "Override",
      permittedRoles: ["analyst"],
    });
    await insertDocument(t, teamId, folderId, adminId, {
      name: "Empty Roles",
      permittedRoles: [],
    });

    const result = await t.query(
      (await import("../queries")).getFolderContents,
      { folderId },
    );

    expect(result.documents.length).toBe(3);
  });
});

// ===========================================================================
// setFolderPermissions
// ===========================================================================

describe("setFolderPermissions", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin sets role permissions — permittedRoles updated on folder", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await insertFolder(t, teamId, userId, {
      name: "My Folder",
    });

    await t.mutation(
      (await import("../mutations")).setFolderPermissions,
      {
        folderId,
        permittedRoles: ["coach", "analyst"],
        userIds: [],
      },
    );

    const folder = await t.run(async (ctx) => ctx.db.get(folderId));
    expect(folder!.permittedRoles).toEqual(["coach", "analyst"]);
  });

  it("admin adds individual users — documentUserPermissions records created", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, { role: "admin" });

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player",
        email: "player@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      }),
    );
    mockGetAuthUserId.mockResolvedValue(adminId);

    const folderId = await insertFolder(t, teamId, adminId, {
      name: "Folder",
    });

    await t.mutation(
      (await import("../mutations")).setFolderPermissions,
      {
        folderId,
        permittedRoles: ["coach"],
        userIds: [playerId],
      },
    );

    const perms = await t.run(async (ctx) =>
      ctx.db
        .query("documentUserPermissions")
        .withIndex("by_targetId", (q) => q.eq("targetId", folderId as string))
        .collect(),
    );

    expect(perms.length).toBe(1);
    expect(perms[0].userId).toBe(playerId);
    expect(perms[0].targetType).toBe("folder");
    expect(perms[0].grantedBy).toBe(adminId);
  });

  it("updating permissions replaces previous user permissions", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, { role: "admin" });

    const player1 = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player 1",
        email: "p1@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      }),
    );
    const player2 = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player 2",
        email: "p2@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      }),
    );
    mockGetAuthUserId.mockResolvedValue(adminId);

    const folderId = await insertFolder(t, teamId, adminId, {
      name: "Folder",
    });

    // First set: player1
    await t.mutation(
      (await import("../mutations")).setFolderPermissions,
      {
        folderId,
        permittedRoles: ["coach"],
        userIds: [player1],
      },
    );

    // Second set: player2 (should replace player1)
    await t.mutation(
      (await import("../mutations")).setFolderPermissions,
      {
        folderId,
        permittedRoles: ["coach"],
        userIds: [player2],
      },
    );

    const perms = await t.run(async (ctx) =>
      ctx.db
        .query("documentUserPermissions")
        .withIndex("by_targetId", (q) => q.eq("targetId", folderId as string))
        .collect(),
    );

    expect(perms.length).toBe(1);
    expect(perms[0].userId).toBe(player2);
  });

  it("non-admin receives NOT_AUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player",
        email: "player@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      }),
    );
    mockGetAuthUserId.mockResolvedValue(playerId);

    const folderId = await insertFolder(t, teamId, adminId, {
      name: "Folder",
    });

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).setFolderPermissions,
        {
          folderId,
          permittedRoles: ["coach"],
          userIds: [],
        },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("NOT_AUTHORIZED");
  });

  it("invalid role value throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await insertFolder(t, teamId, userId, {
      name: "Folder",
    });

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).setFolderPermissions,
        {
          folderId,
          permittedRoles: ["invalid_role"],
          userIds: [],
        },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("VALIDATION_ERROR");
  });

  it("user from different team throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(adminId);

    // Create user on different team
    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Team", slug: "other-team" }),
    );
    const otherUser = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Other User",
        email: "other@example.com",
        role: "player" as any,
        status: "active",
        teamId: otherTeamId,
      }),
    );

    const folderId = await insertFolder(t, teamId, adminId, {
      name: "Folder",
    });

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).setFolderPermissions,
        {
          folderId,
          permittedRoles: ["coach"],
          userIds: [otherUser],
        },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("VALIDATION_ERROR");
  });
});

// ===========================================================================
// setDocumentPermissions
// ===========================================================================

describe("setDocumentPermissions", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin overrides document permissions — permittedRoles set on document", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await insertFolder(t, teamId, userId, {
      name: "Folder",
    });
    const docId = await insertDocument(t, teamId, folderId, userId, {
      name: "Doc",
    });

    await t.mutation(
      (await import("../mutations")).setDocumentPermissions,
      {
        documentId: docId,
        permittedRoles: ["analyst"],
        userIds: [],
      },
    );

    const doc = await t.run(async (ctx) => ctx.db.get(docId));
    expect(doc!.permittedRoles).toEqual(["analyst"]);
  });

  it("admin reverts to inheritance (permittedRoles: undefined) — field cleared and user permissions removed", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(adminId);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player",
        email: "player@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      }),
    );

    const folderId = await insertFolder(t, teamId, adminId, {
      name: "Folder",
    });
    const docId = await insertDocument(t, teamId, folderId, adminId, {
      name: "Doc",
      permittedRoles: ["analyst"],
    });

    // First set permissions with a user
    await t.mutation(
      (await import("../mutations")).setDocumentPermissions,
      {
        documentId: docId,
        permittedRoles: ["analyst"],
        userIds: [playerId],
      },
    );

    // Now revert to inherit
    await t.mutation(
      (await import("../mutations")).setDocumentPermissions,
      {
        documentId: docId,
        permittedRoles: undefined,
        userIds: [],
      },
    );

    const doc = await t.run(async (ctx) => ctx.db.get(docId));
    expect(doc!.permittedRoles).toBeUndefined();

    // User permissions should be cleaned up
    const perms = await t.run(async (ctx) =>
      ctx.db
        .query("documentUserPermissions")
        .withIndex("by_targetId", (q) => q.eq("targetId", docId as string))
        .collect(),
    );
    expect(perms.length).toBe(0);
  });

  it("non-admin receives NOT_AUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player",
        email: "player@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      }),
    );
    mockGetAuthUserId.mockResolvedValue(playerId);

    const folderId = await insertFolder(t, teamId, adminId, {
      name: "Folder",
    });
    const docId = await insertDocument(t, teamId, folderId, adminId, {
      name: "Doc",
    });

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).setDocumentPermissions,
        {
          documentId: docId,
          permittedRoles: ["analyst"],
          userIds: [],
        },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("NOT_AUTHORIZED");
  });
});

// ===========================================================================
// getPermissions
// ===========================================================================

describe("getPermissions", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns current permittedRoles and user list for a folder", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(adminId);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player User",
        email: "player@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      }),
    );

    const folderId = await insertFolder(t, teamId, adminId, {
      name: "Folder",
      permittedRoles: ["coach", "analyst"],
    });

    await insertUserPermission(
      t,
      teamId,
      "folder",
      folderId as string,
      playerId,
      adminId,
    );

    const result = await t.query(
      (await import("../queries")).getPermissions,
      { targetType: "folder", targetId: folderId as string },
    );

    expect(result.permittedRoles).toEqual(["coach", "analyst"]);
    expect(result.users.length).toBe(1);
    expect(result.users[0].userId).toBe(playerId);
    expect(result.users[0].fullName).toBe("Player User");
  });

  it("returns current state for a document", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(adminId);

    const folderId = await insertFolder(t, teamId, adminId, {
      name: "Folder",
    });
    const docId = await insertDocument(t, teamId, folderId, adminId, {
      name: "Doc",
      permittedRoles: ["analyst"],
    });

    const result = await t.query(
      (await import("../queries")).getPermissions,
      { targetType: "document", targetId: docId as string },
    );

    expect(result.permittedRoles).toEqual(["analyst"]);
    expect(result.users.length).toBe(0);
  });

  it("non-admin receives NOT_AUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player",
        email: "player@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      }),
    );
    mockGetAuthUserId.mockResolvedValue(playerId);

    const folderId = await insertFolder(t, teamId, adminId, {
      name: "Folder",
    });

    let caughtError: unknown;
    try {
      await t.query(
        (await import("../queries")).getPermissions,
        { targetType: "folder", targetId: folderId as string },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("NOT_AUTHORIZED");
  });
});

// ===========================================================================
// Access filtering in getFolders — comprehensive tests
// ===========================================================================

describe("access filtering in getFolders", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin sees all folders including restricted ones", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    await insertFolder(t, teamId, userId, {
      name: "Open",
    });
    await insertFolder(t, teamId, userId, {
      name: "Coaches Only",
      permittedRoles: ["coach"],
    });
    await insertFolder(t, teamId, userId, {
      name: "No Roles",
      permittedRoles: [],
    });

    const result = await t.query(
      (await import("../queries")).getFolders,
      {},
    );

    expect(result.length).toBe(3);
  });

  it("coach sees unrestricted and coach-permitted folders", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t);

    const coachId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
        role: "coach" as any,
        status: "active",
        teamId,
      }),
    );
    mockGetAuthUserId.mockResolvedValue(coachId);

    await insertFolder(t, teamId, adminId, { name: "Unrestricted" });
    await insertFolder(t, teamId, adminId, {
      name: "For Coaches",
      permittedRoles: ["coach"],
    });
    await insertFolder(t, teamId, adminId, {
      name: "For Analysts",
      permittedRoles: ["analyst"],
    });

    const result = await t.query(
      (await import("../queries")).getFolders,
      {},
    );

    expect(result.length).toBe(2);
    expect(result.map((f: any) => f.name).sort()).toEqual([
      "For Coaches",
      "Unrestricted",
    ]);
  });

  it("user with individual permission sees folder even if role excluded", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t);

    const staffId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Staff",
        email: "staff@example.com",
        role: "staff" as any,
        status: "active",
        teamId,
      }),
    );
    mockGetAuthUserId.mockResolvedValue(staffId);

    const folderId = await insertFolder(t, teamId, adminId, {
      name: "Restricted",
      permittedRoles: ["coach"],
    });

    await insertUserPermission(
      t,
      teamId,
      "folder",
      folderId as string,
      staffId,
      adminId,
    );

    const result = await t.query(
      (await import("../queries")).getFolders,
      {},
    );

    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Restricted");
  });

  it("user without any access does not see the folder", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player",
        email: "player@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      }),
    );
    mockGetAuthUserId.mockResolvedValue(playerId);

    await insertFolder(t, teamId, adminId, {
      name: "No Access",
      permittedRoles: ["coach"],
    });

    const result = await t.query(
      (await import("../queries")).getFolders,
      {},
    );

    expect(result.length).toBe(0);
  });
});

// ===========================================================================
// Access filtering in getFolderContents
// ===========================================================================

describe("access filtering in getFolderContents", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin sees all documents", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(adminId);

    const folderId = await insertFolder(t, teamId, adminId, {
      name: "Folder",
    });

    await insertDocument(t, teamId, folderId, adminId, { name: "Doc1" });
    await insertDocument(t, teamId, folderId, adminId, {
      name: "Doc2",
      permittedRoles: ["analyst"],
    });
    await insertDocument(t, teamId, folderId, adminId, {
      name: "Doc3",
      permittedRoles: [],
    });

    const result = await t.query(
      (await import("../queries")).getFolderContents,
      { folderId },
    );

    expect(result.documents.length).toBe(3);
  });

  it("non-admin sees only accessible documents — both direct permissions and inheritance", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t);

    const coachId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
        role: "coach" as any,
        status: "active",
        teamId,
      }),
    );
    mockGetAuthUserId.mockResolvedValue(coachId);

    // Folder allows coaches
    const folderId = await insertFolder(t, teamId, adminId, {
      name: "Coach Folder",
      permittedRoles: ["coach"],
    });

    // Doc inheriting (coach can see)
    await insertDocument(t, teamId, folderId, adminId, {
      name: "Inherited OK",
    });

    // Doc with own coach permission (coach can see)
    await insertDocument(t, teamId, folderId, adminId, {
      name: "Direct OK",
      permittedRoles: ["coach"],
    });

    // Doc with analyst-only override (coach cannot see)
    await insertDocument(t, teamId, folderId, adminId, {
      name: "Analyst Only",
      permittedRoles: ["analyst"],
    });

    const result = await t.query(
      (await import("../queries")).getFolderContents,
      { folderId },
    );

    expect(result.documents.length).toBe(2);
    const names = result.documents.map((d: any) => d.name).sort();
    expect(names).toEqual(["Direct OK", "Inherited OK"]);
  });
});

// ===========================================================================
// getDocument and getDocumentUrl access checks
// ===========================================================================

describe("getDocument access check", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("non-admin denied access to restricted document throws NOT_AUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player",
        email: "player@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      }),
    );
    mockGetAuthUserId.mockResolvedValue(playerId);

    const folderId = await insertFolder(t, teamId, adminId, {
      name: "Folder",
    });
    const docId = await insertDocument(t, teamId, folderId, adminId, {
      name: "Restricted",
      permittedRoles: ["coach"],
    });

    let caughtError: unknown;
    try {
      await t.query(
        (await import("../queries")).getDocument,
        { documentId: docId },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("NOT_AUTHORIZED");
  });
});
