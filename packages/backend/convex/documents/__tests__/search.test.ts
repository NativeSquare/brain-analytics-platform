import { convexTest } from "convex-test";
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

// ---------------------------------------------------------------------------
// searchDocuments
// ---------------------------------------------------------------------------

describe("searchDocuments", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("(a) returns documents matching the search term (case-insensitive)", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await insertFolder(t, teamId, userId, {
      name: "Playbooks",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "Training Plan",
      extension: "pdf",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "Match Analysis",
      extension: "pdf",
    });

    const result = await t.query(
      (await import("../queries")).searchDocuments,
      { searchTerm: "training" },
    );

    expect(result.results.length).toBe(1);
    expect(result.results[0].name).toBe("Training Plan");
    expect(result.totalCount).toBe(1);
  });

  it("(b) returns empty array when search term is less than 2 characters", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await insertFolder(t, teamId, userId, {
      name: "Docs",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "Training Plan",
    });

    const result = await t.query(
      (await import("../queries")).searchDocuments,
      { searchTerm: "T" },
    );

    expect(result.results.length).toBe(0);
    expect(result.totalCount).toBe(0);
  });

  it("(c) returns empty array when no documents match the search term", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await insertFolder(t, teamId, userId, {
      name: "Docs",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "Training Plan",
    });

    const result = await t.query(
      (await import("../queries")).searchDocuments,
      { searchTerm: "nonexistent" },
    );

    expect(result.results.length).toBe(0);
    expect(result.totalCount).toBe(0);
  });

  it("(d) filters by file type pdf — only returns documents with extension pdf", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await insertFolder(t, teamId, userId, {
      name: "Docs",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "Report A",
      extension: "pdf",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "Report B",
      extension: "xlsx",
    });

    const result = await t.query(
      (await import("../queries")).searchDocuments,
      { searchTerm: "Report", fileType: "pdf" },
    );

    expect(result.results.length).toBe(1);
    expect(result.results[0].name).toBe("Report A");
  });

  it("(e) filters by file type image — only returns jpg or png", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await insertFolder(t, teamId, userId, {
      name: "Docs",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "Photo A",
      extension: "jpg",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "Photo B",
      extension: "png",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "Photo C",
      extension: "pdf",
    });

    const result = await t.query(
      (await import("../queries")).searchDocuments,
      { searchTerm: "Photo", fileType: "image" },
    );

    expect(result.results.length).toBe(2);
    expect(result.results.map((r: any) => r.name).sort()).toEqual([
      "Photo A",
      "Photo B",
    ]);
  });

  it("(f) filters by file type spreadsheet — only returns xlsx or csv", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await insertFolder(t, teamId, userId, {
      name: "Docs",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "Data File A",
      extension: "xlsx",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "Data File B",
      extension: "csv",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "Data File C",
      extension: "pdf",
    });

    const result = await t.query(
      (await import("../queries")).searchDocuments,
      { searchTerm: "Data File", fileType: "spreadsheet" },
    );

    expect(result.results.length).toBe(2);
    expect(result.results.map((r: any) => r.name).sort()).toEqual([
      "Data File A",
      "Data File B",
    ]);
  });

  it("(g) filters by file type video — only returns documents where videoUrl is set", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await insertFolder(t, teamId, userId, {
      name: "Docs",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "Training Video",
      videoUrl: "https://youtube.com/watch?v=abc",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "Training Plan",
      extension: "pdf",
    });

    const result = await t.query(
      (await import("../queries")).searchDocuments,
      { searchTerm: "Training", fileType: "video" },
    );

    expect(result.results.length).toBe(1);
    expect(result.results[0].name).toBe("Training Video");
  });

  it("(h) combines search term and file type filter — both are applied together", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await insertFolder(t, teamId, userId, {
      name: "Docs",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "Training PDF",
      extension: "pdf",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "Training Spreadsheet",
      extension: "xlsx",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "Other PDF",
      extension: "pdf",
    });

    const result = await t.query(
      (await import("../queries")).searchDocuments,
      { searchTerm: "Training", fileType: "pdf" },
    );

    expect(result.results.length).toBe(1);
    expect(result.results[0].name).toBe("Training PDF");
  });

  it("(i) admin user sees all matching documents regardless of permissions", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
    });
    mockGetAuthUserId.mockResolvedValue(adminId);

    const folderId = await insertFolder(t, teamId, adminId, {
      name: "Docs",
      permittedRoles: ["coach"],
    });
    await insertDocument(t, teamId, folderId, adminId, {
      name: "Restricted Doc",
    });
    await insertDocument(t, teamId, folderId, adminId, {
      name: "Another Restricted",
    });

    const result = await t.query(
      (await import("../queries")).searchDocuments,
      { searchTerm: "Restricted" },
    );

    // Admin sees both
    expect(result.results.length).toBe(2);
  });

  it("(j) non-admin user sees only documents they have access to via permittedRoles", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
    });

    // Create a coach user
    const coachId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Coach User",
        email: "coach@example.com",
        role: "coach" as any,
        status: "active",
        teamId,
      }),
    );
    mockGetAuthUserId.mockResolvedValue(coachId);

    // Unrestricted folder
    const openFolder = await insertFolder(t, teamId, adminId, {
      name: "Open",
    });
    await insertDocument(t, teamId, openFolder, adminId, {
      name: "Open Doc",
    });

    // Coach-restricted folder (inherits)
    const coachFolder = await insertFolder(t, teamId, adminId, {
      name: "Coach Folder",
      permittedRoles: ["coach"],
    });
    await insertDocument(t, teamId, coachFolder, adminId, {
      name: "Coach Doc",
    });

    const result = await t.query(
      (await import("../queries")).searchDocuments,
      { searchTerm: "Doc" },
    );

    expect(result.results.length).toBe(2);
    expect(result.results.map((r: any) => r.name).sort()).toEqual([
      "Coach Doc",
      "Open Doc",
    ]);
  });

  it("(k) non-admin user does NOT see documents restricted to other roles", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
    });

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

    // Coach-only folder
    const coachFolder = await insertFolder(t, teamId, adminId, {
      name: "Coaches",
      permittedRoles: ["coach"],
    });
    await insertDocument(t, teamId, coachFolder, adminId, {
      name: "Coach Only Doc",
    });

    // Unrestricted folder
    const openFolder = await insertFolder(t, teamId, adminId, {
      name: "Open",
    });
    await insertDocument(t, teamId, openFolder, adminId, {
      name: "Accessible Doc",
    });

    const result = await t.query(
      (await import("../queries")).searchDocuments,
      { searchTerm: "Doc" },
    );

    expect(result.results.length).toBe(1);
    expect(result.results[0].name).toBe("Accessible Doc");
  });

  it("(j-b) non-admin user sees documents granted via individual documentUserPermissions", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
    });

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

    // Coach-only folder
    const coachFolder = await insertFolder(t, teamId, adminId, {
      name: "Coaches",
      permittedRoles: ["coach"],
    });
    const restrictedDoc = await insertDocument(t, teamId, coachFolder, adminId, {
      name: "Special Doc",
    });

    // Grant individual access to the player on the folder
    await insertUserPermission(
      t,
      teamId,
      "folder",
      coachFolder as string,
      playerId,
      adminId,
    );

    const result = await t.query(
      (await import("../queries")).searchDocuments,
      { searchTerm: "Special" },
    );

    expect(result.results.length).toBe(1);
    expect(result.results[0].name).toBe("Special Doc");
  });

  it("(l) results include folderPath for each document", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const parentFolder = await insertFolder(t, teamId, userId, {
      name: "Playbooks",
    });
    const childFolder = await insertFolder(t, teamId, userId, {
      name: "Attacking",
      parentId: parentFolder,
    });
    await insertDocument(t, teamId, childFolder, userId, {
      name: "Formation Guide",
    });

    const result = await t.query(
      (await import("../queries")).searchDocuments,
      { searchTerm: "Formation" },
    );

    expect(result.results.length).toBe(1);
    expect(result.results[0].folderPath).toBe("Playbooks > Attacking");
  });

  it("(m) results are capped at 50 — verify totalCount reflects the actual total", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await insertFolder(t, teamId, userId, {
      name: "Docs",
    });

    // Insert 55 documents
    for (let i = 0; i < 55; i++) {
      await insertDocument(t, teamId, folderId, userId, {
        name: `Document ${String(i).padStart(2, "0")}`,
        createdAt: Date.now() - i * 1000,
      });
    }

    const result = await t.query(
      (await import("../queries")).searchDocuments,
      { searchTerm: "Document" },
    );

    expect(result.results.length).toBe(50);
    expect(result.totalCount).toBe(55);
  });

  it("(n) unauthenticated request is rejected", async () => {
    const t = convexTest(schema, modules);
    mockGetAuthUserId.mockResolvedValue(null);

    let caughtError: unknown;
    try {
      await t.query(
        (await import("../queries")).searchDocuments,
        { searchTerm: "test" },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeDefined();
  });

  it("(o) documents from a different team are never returned", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Team", slug: "other-team" }),
    );

    const myFolder = await insertFolder(t, teamId, userId, {
      name: "My Docs",
    });
    await insertDocument(t, teamId, myFolder, userId, {
      name: "My Document",
    });

    const otherFolder = await insertFolder(t, otherTeamId, userId, {
      name: "Other Docs",
    });
    await insertDocument(t, otherTeamId, otherFolder, userId, {
      name: "Other Document",
    });

    const result = await t.query(
      (await import("../queries")).searchDocuments,
      { searchTerm: "Document" },
    );

    expect(result.results.length).toBe(1);
    expect(result.results[0].name).toBe("My Document");
  });

  it("sorts results with prefix matches first, then by createdAt descending", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await insertFolder(t, teamId, userId, {
      name: "Docs",
    });

    // "Plan A" starts with "plan" → prefix match
    await insertDocument(t, teamId, folderId, userId, {
      name: "Plan A",
      createdAt: 1000,
    });
    // "My Plan B" contains "plan" but does not start with it → partial
    await insertDocument(t, teamId, folderId, userId, {
      name: "My Plan B",
      createdAt: 3000,
    });
    // "Plan C" starts with "plan" → prefix match
    await insertDocument(t, teamId, folderId, userId, {
      name: "Plan C",
      createdAt: 2000,
    });

    const result = await t.query(
      (await import("../queries")).searchDocuments,
      { searchTerm: "plan" },
    );

    // Prefix matches first sorted by createdAt desc, then partial
    expect(result.results.map((r: any) => r.name)).toEqual([
      "Plan C",
      "Plan A",
      "My Plan B",
    ]);
  });
});

// ---------------------------------------------------------------------------
// getFolderContents with fileType filter
// ---------------------------------------------------------------------------

describe("getFolderContents with fileType filter", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("(a) without fileType, returns all documents in the folder (backward compatible)", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await insertFolder(t, teamId, userId, {
      name: "Category",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "PDF Doc",
      extension: "pdf",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "Video Doc",
      videoUrl: "https://example.com/video",
    });

    const result = await t.query(
      (await import("../queries")).getFolderContents,
      { folderId },
    );

    expect(result.documents.length).toBe(2);
  });

  it("(b) with fileType pdf, returns only PDF documents; subfolders are still returned", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await insertFolder(t, teamId, userId, {
      name: "Category",
    });
    await insertFolder(t, teamId, userId, {
      name: "Subfolder",
      parentId: folderId,
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "PDF Doc",
      extension: "pdf",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "Image Doc",
      extension: "jpg",
    });

    const result = await t.query(
      (await import("../queries")).getFolderContents,
      { folderId, fileType: "pdf" },
    );

    expect(result.documents.length).toBe(1);
    expect(result.documents[0].name).toBe("PDF Doc");
    expect(result.subfolders.length).toBe(1);
  });

  it("(c) with fileType video, returns only video link documents", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const folderId = await insertFolder(t, teamId, userId, {
      name: "Category",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "Training Video",
      videoUrl: "https://youtube.com/watch?v=abc",
    });
    await insertDocument(t, teamId, folderId, userId, {
      name: "PDF Report",
      extension: "pdf",
    });

    const result = await t.query(
      (await import("../queries")).getFolderContents,
      { folderId, fileType: "video" },
    );

    expect(result.documents.length).toBe(1);
    expect(result.documents[0].name).toBe("Training Video");
  });
});
