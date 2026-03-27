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

function extractErrorCode(error: unknown): string {
  if (!(error instanceof ConvexError)) throw error;
  const rawData = error.data;
  const errData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
  return errData.code;
}

// ---------------------------------------------------------------------------
// createFolder
// ---------------------------------------------------------------------------

describe("createFolder", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("creates a top-level folder successfully", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "My Category" },
    );

    expect(folderId).toBeDefined();

    const folder = await t.run(async (ctx) => ctx.db.get(folderId));
    expect(folder!.name).toBe("My Category");
    expect(folder!.teamId).toBe(teamId);
    expect(folder!.createdBy).toBe(userId);
    expect(folder!.parentId).toBeUndefined();
  });

  it("creates a subfolder within a category successfully", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const parentId = await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "Category" },
    );

    const childId = await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "Subfolder", parentId },
    );

    const child = await t.run(async (ctx) => ctx.db.get(childId));
    expect(child!.parentId).toBe(parentId);
    expect(child!.teamId).toBe(teamId);
  });

  it("rejects empty name", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).createFolder,
        { name: "   " },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("VALIDATION_ERROR");
  });

  it("rejects creating a third-level folder (depth > 2)", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const level1 = await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "Level 1" },
    );
    const level2 = await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "Level 2", parentId: level1 },
    );

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).createFolder,
        { name: "Level 3", parentId: level2 },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("VALIDATION_ERROR");
    const rawData = (caughtError as ConvexError<any>).data;
    const errData =
      typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    expect(errData.message).toContain("Maximum folder depth");
  });

  it("rejects non-admin users", async () => {
    const t = convexTest(schema, modules);
    const { teamId } = await seedTeamAndUser(t);

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

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).createFolder,
        { name: "Unauthorized" },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("NOT_AUTHORIZED");
  });

  it("sets teamId from authenticated user", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "Team Folder" },
    );

    const folder = await t.run(async (ctx) => ctx.db.get(folderId));
    expect(folder!.teamId).toBe(teamId);
  });
});

// ---------------------------------------------------------------------------
// renameFolder
// ---------------------------------------------------------------------------

describe("renameFolder", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("renames folder successfully", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "Old Name" },
    );

    await t.mutation(
      (await import("../mutations")).renameFolder,
      { folderId, name: "New Name" },
    );

    const folder = await t.run(async (ctx) => ctx.db.get(folderId));
    expect(folder!.name).toBe("New Name");
  });

  it("rejects empty name", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "Original" },
    );

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).renameFolder,
        { folderId, name: "   " },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("VALIDATION_ERROR");
  });

  it("rejects non-admin users", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t);

    // Create folder as admin
    mockGetAuthUserId.mockResolvedValue(adminId);
    const folderId = await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "Admin Folder" },
    );

    // Switch to player
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

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).renameFolder,
        { folderId, name: "Hacked" },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("NOT_AUTHORIZED");
  });

  it("rejects folder from different team", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId } = await seedTeamAndUser(t);

    // Create folder in a different team
    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Team", slug: "other-team" }),
    );
    const otherFolderId = await t.run(async (ctx) =>
      ctx.db.insert("folders", {
        teamId: otherTeamId,
        name: "Other Folder",
        createdBy: adminId,
        createdAt: Date.now(),
      }),
    );

    mockGetAuthUserId.mockResolvedValue(adminId);

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).renameFolder,
        { folderId: otherFolderId, name: "Renamed" },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// deleteFolder
// ---------------------------------------------------------------------------

describe("deleteFolder", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("deletes empty folder successfully", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "Empty Folder" },
    );

    await t.mutation(
      (await import("../mutations")).deleteFolder,
      { folderId },
    );

    const folder = await t.run(async (ctx) => ctx.db.get(folderId));
    expect(folder).toBeNull();
  });

  it("rejects deletion of folder with subfolders", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const parentId = await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "Parent" },
    );
    await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "Child", parentId },
    );

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).deleteFolder,
        { folderId: parentId },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("VALIDATION_ERROR");
    const rawData = (caughtError as ConvexError<any>).data;
    const errData =
      typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    expect(errData.message).toContain("subfolders");
  });

  it("rejects deletion of folder with documents", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "With Docs" },
    );

    // Insert a document directly
    await t.run(async (ctx) =>
      ctx.db.insert("documents", {
        teamId,
        folderId,
        name: "Doc",
        ownerId: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).deleteFolder,
        { folderId },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("VALIDATION_ERROR");
    const rawData = (caughtError as ConvexError<any>).data;
    const errData =
      typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    expect(errData.message).toContain("documents");
  });

  it("rejects non-admin users", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t);

    mockGetAuthUserId.mockResolvedValue(adminId);
    const folderId = await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "To Delete" },
    );

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

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).deleteFolder,
        { folderId },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("NOT_AUTHORIZED");
  });

  it("rejects folder from different team", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId } = await seedTeamAndUser(t);

    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Team", slug: "other-team" }),
    );
    const otherFolderId = await t.run(async (ctx) =>
      ctx.db.insert("folders", {
        teamId: otherTeamId,
        name: "Other Folder",
        createdBy: adminId,
        createdAt: Date.now(),
      }),
    );

    mockGetAuthUserId.mockResolvedValue(adminId);

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).deleteFolder,
        { folderId: otherFolderId },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("NOT_FOUND");
  });
});
