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

// ---------------------------------------------------------------------------
// uploadDocument
// ---------------------------------------------------------------------------

describe("uploadDocument", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin uploads document successfully", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "Test Folder" },
    );

    const docId = await t.mutation(
      (await import("../mutations")).uploadDocument,
      {
        folderId,
        name: "Test Report",
        filename: "report.pdf",
        extension: "pdf",
        storageId: "storage_123",
        mimeType: "application/pdf",
        fileSize: 1024,
      },
    );

    expect(docId).toBeDefined();

    const doc = await t.run(async (ctx) => ctx.db.get(docId));
    expect(doc!.name).toBe("Test Report");
    expect(doc!.filename).toBe("report.pdf");
    expect(doc!.extension).toBe("pdf");
    expect(doc!.storageId).toBe("storage_123");
    expect(doc!.mimeType).toBe("application/pdf");
    expect(doc!.fileSize).toBe(1024);
    expect(doc!.videoUrl).toBeUndefined();
    expect(doc!.teamId).toBe(teamId);
    expect(doc!.ownerId).toBe(userId);
    expect(doc!.createdAt).toBeDefined();
    expect(doc!.updatedAt).toBeDefined();
  });

  it("non-admin receives NOT_AUTHORIZED error", async () => {
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

    const folderId = await t.run(async (ctx) =>
      ctx.db.insert("folders", {
        teamId,
        name: "Test Folder",
        createdBy: playerId,
        createdAt: Date.now(),
      }),
    );

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).uploadDocument,
        {
          folderId,
          name: "Doc",
          filename: "doc.pdf",
          extension: "pdf",
          storageId: "s1",
          mimeType: "application/pdf",
          fileSize: 100,
        },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("NOT_AUTHORIZED");
  });

  it("uploading to a different team's folder throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Team", slug: "other-team" }),
    );
    const otherFolderId = await t.run(async (ctx) =>
      ctx.db.insert("folders", {
        teamId: otherTeamId,
        name: "Other Folder",
        createdBy: userId,
        createdAt: Date.now(),
      }),
    );

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).uploadDocument,
        {
          folderId: otherFolderId,
          name: "Doc",
          filename: "doc.pdf",
          extension: "pdf",
          storageId: "s1",
          mimeType: "application/pdf",
          fileSize: 100,
        },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("NOT_FOUND");
  });

  it("uploading to a non-existent folder throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await t.run(async (ctx) =>
      ctx.db.insert("folders", {
        teamId,
        name: "Temp",
        createdBy: userId,
        createdAt: Date.now(),
      }),
    );
    await t.run(async (ctx) => ctx.db.delete(folderId));

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).uploadDocument,
        {
          folderId,
          name: "Doc",
          filename: "doc.pdf",
          extension: "pdf",
          storageId: "s1",
          mimeType: "application/pdf",
          fileSize: 100,
        },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// addVideoLink
// ---------------------------------------------------------------------------

describe("addVideoLink", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin adds video link successfully", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "Videos" },
    );

    const docId = await t.mutation(
      (await import("../mutations")).addVideoLink,
      {
        folderId,
        name: "Training Video",
        videoUrl: "https://youtube.com/watch?v=abc",
      },
    );

    expect(docId).toBeDefined();

    const doc = await t.run(async (ctx) => ctx.db.get(docId));
    expect(doc!.name).toBe("Training Video");
    expect(doc!.videoUrl).toBe("https://youtube.com/watch?v=abc");
    expect(doc!.storageId).toBeUndefined();
    expect(doc!.filename).toBeUndefined();
    expect(doc!.extension).toBeUndefined();
    expect(doc!.mimeType).toBeUndefined();
    expect(doc!.fileSize).toBeUndefined();
    expect(doc!.teamId).toBe(teamId);
    expect(doc!.ownerId).toBe(userId);
  });

  it("invalid URL (no http/https) throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "Videos" },
    );

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).addVideoLink,
        {
          folderId,
          name: "Bad Video",
          videoUrl: "ftp://invalid.com/video",
        },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("VALIDATION_ERROR");
  });

  it("non-admin receives NOT_AUTHORIZED", async () => {
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

    const folderId = await t.run(async (ctx) =>
      ctx.db.insert("folders", {
        teamId,
        name: "Videos",
        createdBy: playerId,
        createdAt: Date.now(),
      }),
    );

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).addVideoLink,
        {
          folderId,
          name: "Video",
          videoUrl: "https://youtube.com/watch?v=abc",
        },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("NOT_AUTHORIZED");
  });
});

// ---------------------------------------------------------------------------
// replaceFile
// ---------------------------------------------------------------------------

describe("replaceFile", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin replaces file successfully", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "Docs" },
    );

    // Create real storage blobs for the test
    const oldStorageId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["old file content"])),
    );

    const docId = await t.run(async (ctx) =>
      ctx.db.insert("documents", {
        teamId,
        folderId,
        name: "Report",
        filename: "report.pdf",
        extension: "pdf",
        storageId: oldStorageId as string,
        mimeType: "application/pdf",
        fileSize: 500,
        ownerId: userId,
        createdAt: Date.now() - 10000,
        updatedAt: Date.now() - 10000,
      }),
    );

    const beforeDoc = await t.run(async (ctx) => ctx.db.get(docId));
    const beforeUpdatedAt = beforeDoc!.updatedAt;

    const newStorageId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["new file content"])),
    );

    const result = await t.mutation(
      (await import("../mutations")).replaceFile,
      {
        documentId: docId,
        storageId: newStorageId as string,
        filename: "report_v2.pdf",
        extension: "pdf",
        mimeType: "application/pdf",
        fileSize: 750,
      },
    );

    expect(result).toEqual({ success: true });

    const updatedDoc = await t.run(async (ctx) => ctx.db.get(docId));
    expect(updatedDoc!.storageId).toBe(newStorageId as string);
    expect(updatedDoc!.filename).toBe("report_v2.pdf");
    expect(updatedDoc!.fileSize).toBe(750);
    expect(updatedDoc!.updatedAt).toBeGreaterThan(beforeUpdatedAt);
    expect(updatedDoc!.name).toBe("Report");
  });

  it("attempting to replace on a video link document throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "Videos" },
    );

    const docId = await t.run(async (ctx) =>
      ctx.db.insert("documents", {
        teamId,
        folderId,
        name: "Video",
        videoUrl: "https://youtube.com/watch?v=abc",
        ownerId: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).replaceFile,
        {
          documentId: docId,
          storageId: "new_storage",
          filename: "file.pdf",
          extension: "pdf",
          mimeType: "application/pdf",
          fileSize: 100,
        },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("VALIDATION_ERROR");
  });

  it("non-admin receives NOT_AUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t);

    const folderId = await t.run(async (ctx) =>
      ctx.db.insert("folders", {
        teamId,
        name: "Docs",
        createdBy: adminId,
        createdAt: Date.now(),
      }),
    );

    const docId = await t.run(async (ctx) =>
      ctx.db.insert("documents", {
        teamId,
        folderId,
        name: "Report",
        storageId: "storage_1",
        ownerId: adminId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
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
        (await import("../mutations")).replaceFile,
        {
          documentId: docId,
          storageId: "new_s",
          filename: "new.pdf",
          extension: "pdf",
          mimeType: "application/pdf",
          fileSize: 100,
        },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("NOT_AUTHORIZED");
  });

  it("document from different team throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Team", slug: "other-team" }),
    );
    const folderId = await t.run(async (ctx) =>
      ctx.db.insert("folders", {
        teamId: otherTeamId,
        name: "Other Folder",
        createdBy: userId,
        createdAt: Date.now(),
      }),
    );
    const docId = await t.run(async (ctx) =>
      ctx.db.insert("documents", {
        teamId: otherTeamId,
        folderId,
        name: "Other Doc",
        storageId: "s1",
        ownerId: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).replaceFile,
        {
          documentId: docId,
          storageId: "new_s",
          filename: "new.pdf",
          extension: "pdf",
          mimeType: "application/pdf",
          fileSize: 100,
        },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// deleteDocument
// ---------------------------------------------------------------------------

describe("deleteDocument", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin deletes file document — record removed", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "Docs" },
    );

    // Create a real storage blob
    const storageId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["file content"])),
    );

    const docId = await t.run(async (ctx) =>
      ctx.db.insert("documents", {
        teamId,
        folderId,
        name: "Report",
        storageId: storageId as string,
        ownerId: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    const result = await t.mutation(
      (await import("../mutations")).deleteDocument,
      { documentId: docId },
    );

    expect(result).toEqual({ success: true });

    const deleted = await t.run(async (ctx) => ctx.db.get(docId));
    expect(deleted).toBeNull();
  });

  it("admin deletes video link document — record removed", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "Videos" },
    );

    const docId = await t.run(async (ctx) =>
      ctx.db.insert("documents", {
        teamId,
        folderId,
        name: "Video",
        videoUrl: "https://youtube.com/watch?v=abc",
        ownerId: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    await t.mutation(
      (await import("../mutations")).deleteDocument,
      { documentId: docId },
    );

    const deleted = await t.run(async (ctx) => ctx.db.get(docId));
    expect(deleted).toBeNull();
  });

  it("non-admin receives NOT_AUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t);

    const folderId = await t.run(async (ctx) =>
      ctx.db.insert("folders", {
        teamId,
        name: "Docs",
        createdBy: adminId,
        createdAt: Date.now(),
      }),
    );

    const docId = await t.run(async (ctx) =>
      ctx.db.insert("documents", {
        teamId,
        folderId,
        name: "Report",
        storageId: "s1",
        ownerId: adminId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
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
        (await import("../mutations")).deleteDocument,
        { documentId: docId },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    expect(extractErrorCode(caughtError)).toBe("NOT_AUTHORIZED");
  });

  it("deletes related documentReads records", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await t.mutation(
      (await import("../mutations")).createFolder,
      { name: "Docs" },
    );

    // Create a real storage blob
    const storageId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["file content"])),
    );

    const docId = await t.run(async (ctx) =>
      ctx.db.insert("documents", {
        teamId,
        folderId,
        name: "Report",
        storageId: storageId as string,
        ownerId: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    // Insert some documentReads
    await t.run(async (ctx) => {
      await ctx.db.insert("documentReads", {
        teamId,
        documentId: docId,
        userId,
        readAt: Date.now(),
      });
      await ctx.db.insert("documentReads", {
        teamId,
        documentId: docId,
        userId,
        readAt: Date.now() - 1000,
      });
    });

    await t.mutation(
      (await import("../mutations")).deleteDocument,
      { documentId: docId },
    );

    const remainingReads = await t.run(async (ctx) =>
      ctx.db
        .query("documentReads")
        .withIndex("by_documentId", (q) => q.eq("documentId", docId))
        .collect(),
    );

    expect(remainingReads.length).toBe(0);
  });
});
