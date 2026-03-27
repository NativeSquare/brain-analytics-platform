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
      name: "Test User",
      email: "user@example.com",
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

// ---------------------------------------------------------------------------
// getFolders
// ---------------------------------------------------------------------------

describe("getFolders", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns top-level folders when no parentId specified", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    await insertFolder(t, teamId, userId, { name: "Category A" });
    await insertFolder(t, teamId, userId, { name: "Category B" });

    const result = await t.query(
      (await import("../queries")).getFolders,
      {},
    );

    expect(result.length).toBe(2);
    expect(result[0].name).toBe("Category A");
    expect(result[1].name).toBe("Category B");
  });

  it("returns subfolders when parentId specified", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const parentId = await insertFolder(t, teamId, userId, {
      name: "Category",
    });
    await insertFolder(t, teamId, userId, {
      name: "Sub A",
      parentId,
    });
    await insertFolder(t, teamId, userId, {
      name: "Sub B",
      parentId,
    });

    const result = await t.query(
      (await import("../queries")).getFolders,
      { parentId },
    );

    expect(result.length).toBe(2);
    expect(result[0].name).toBe("Sub A");
    expect(result[1].name).toBe("Sub B");
  });

  it("excludes soft-deleted folders", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    await insertFolder(t, teamId, userId, { name: "Active" });
    await insertFolder(t, teamId, userId, {
      name: "Deleted",
      isDeleted: true,
    });

    const result = await t.query(
      (await import("../queries")).getFolders,
      {},
    );

    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Active");
  });

  it("admin sees all folders regardless of permittedRoles", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    await insertFolder(t, teamId, userId, {
      name: "Restricted",
      permittedRoles: ["coach"],
    });
    await insertFolder(t, teamId, userId, { name: "Unrestricted" });

    const result = await t.query(
      (await import("../queries")).getFolders,
      {},
    );

    expect(result.length).toBe(2);
  });

  it("non-admin sees only unrestricted or role-permitted folders", async () => {
    const t = convexTest(schema, modules);
    const { teamId } = await seedTeamAndUser(t);

    // Create a player user
    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player User",
        email: "player@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      }),
    );
    mockGetAuthUserId.mockResolvedValue(playerId);

    const adminId = await t.run(async (ctx) => {
      const users = await ctx.db.query("users").collect();
      return users.find((u) => u.role === "admin")!._id;
    });

    await insertFolder(t, teamId, adminId, {
      name: "For Coaches",
      permittedRoles: ["coach"],
    });
    await insertFolder(t, teamId, adminId, {
      name: "For Players",
      permittedRoles: ["player"],
    });
    await insertFolder(t, teamId, adminId, { name: "Unrestricted" });

    const result = await t.query(
      (await import("../queries")).getFolders,
      {},
    );

    expect(result.length).toBe(2);
    expect(result.map((f: any) => f.name).sort()).toEqual([
      "For Players",
      "Unrestricted",
    ]);
  });

  it("does not return folders from a different team", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Team", slug: "other-team" }),
    );

    await insertFolder(t, teamId, userId, { name: "My Folder" });
    await insertFolder(t, otherTeamId, userId, { name: "Other Folder" });

    const result = await t.query(
      (await import("../queries")).getFolders,
      {},
    );

    expect(result.length).toBe(1);
    expect(result[0].name).toBe("My Folder");
  });
});

// ---------------------------------------------------------------------------
// getFolderContents
// ---------------------------------------------------------------------------

describe("getFolderContents", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns subfolders and documents for a given folder", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const parentId = await insertFolder(t, teamId, userId, {
      name: "Category",
    });
    await insertFolder(t, teamId, userId, {
      name: "Sub Folder",
      parentId,
    });
    await insertDocument(t, teamId, parentId, userId, { name: "Doc 1" });

    const result = await t.query(
      (await import("../queries")).getFolderContents,
      { folderId: parentId },
    );

    expect(result.folder).toBeTruthy();
    expect(result.folder!.name).toBe("Category");
    expect(result.subfolders.length).toBe(1);
    expect(result.subfolders[0].name).toBe("Sub Folder");
    expect(result.documents.length).toBe(1);
    expect(result.documents[0].name).toBe("Doc 1");
  });

  it("returns empty for wrong team folder", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Team", slug: "other-team" }),
    );
    const folderId = await insertFolder(t, otherTeamId, userId, {
      name: "Other",
    });

    const result = await t.query(
      (await import("../queries")).getFolderContents,
      { folderId },
    );

    expect(result.folder).toBeNull();
    expect(result.subfolders.length).toBe(0);
    expect(result.documents.length).toBe(0);
  });

  it("applies access filtering for non-admin users", async () => {
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

    const parentId = await insertFolder(t, teamId, adminId, {
      name: "Category",
    });
    await insertFolder(t, teamId, adminId, {
      name: "Coach Only",
      parentId,
      permittedRoles: ["coach"],
    });
    await insertFolder(t, teamId, adminId, {
      name: "Open Sub",
      parentId,
    });

    const result = await t.query(
      (await import("../queries")).getFolderContents,
      { folderId: parentId },
    );

    expect(result.subfolders.length).toBe(1);
    expect(result.subfolders[0].name).toBe("Open Sub");
  });
});

// ---------------------------------------------------------------------------
// getFolderBreadcrumb
// ---------------------------------------------------------------------------

describe("getFolderBreadcrumb", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns correct path for top-level folder (single element)", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await insertFolder(t, teamId, userId, {
      name: "Top Level",
    });

    const result = await t.query(
      (await import("../queries")).getFolderBreadcrumb,
      { folderId },
    );

    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Top Level");
  });

  it("returns correct path for subfolder (two elements)", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const parentId = await insertFolder(t, teamId, userId, {
      name: "Category",
    });
    const childId = await insertFolder(t, teamId, userId, {
      name: "Subfolder",
      parentId,
    });

    const result = await t.query(
      (await import("../queries")).getFolderBreadcrumb,
      { folderId: childId },
    );

    expect(result.length).toBe(2);
    expect(result[0].name).toBe("Category");
    expect(result[1].name).toBe("Subfolder");
  });

  it("returns empty for wrong team", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Team", slug: "other-team" }),
    );
    const folderId = await insertFolder(t, otherTeamId, userId, {
      name: "Other",
    });

    const result = await t.query(
      (await import("../queries")).getFolderBreadcrumb,
      { folderId },
    );

    expect(result.length).toBe(0);
  });
});
