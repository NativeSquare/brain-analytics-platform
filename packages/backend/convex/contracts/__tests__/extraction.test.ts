import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../_generated/dataModel";

// ---------------------------------------------------------------------------
// Mock getAuthUserId (required by modules glob)
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

// Suppress convex-test scheduler warnings for "use node" actions
const _w = console.warn;
console.warn = (...a: any[]) => {
  if (typeof a[0] === "string" && a[0].includes("should not directly call"))
    return;
  _w.apply(console, a);
};

// Suppress unhandled rejections from convex-test trying to run scheduled
// "use node" actions after mutations complete.
process.removeAllListeners("unhandledRejection");
process.on("unhandledRejection", (reason: unknown) => {
  if (
    reason instanceof Error &&
    reason.message.includes("Write outside of transaction")
  ) {
    return;
  }
  throw reason;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function seedTeamAndUser(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Test Club",
      slug: "test-club",
    });
    const userId = await ctx.db.insert("users", {
      name: "Admin",
      email: "admin@test.com",
      role: "admin" as any,
      status: "active",
      teamId,
    });
    return { userId, teamId };
  });
}

async function insertPlayerAndContract(
  t: ReturnType<typeof convexTest>,
  teamId: Id<"teams">,
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const playerId = await ctx.db.insert("players", {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const blob = new Blob(["fake-pdf"], { type: "application/pdf" });
    const fileId = await ctx.storage.store(blob);
    const contractId = await ctx.db.insert("contracts", {
      teamId,
      playerId,
      fileId,
      extractionStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });
    return { playerId, contractId, fileId };
  });
}

// ===========================================================================
// updateExtractionResult — internal mutation
// ===========================================================================

describe("updateExtractionResult", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("sets status to 'processing'", async () => {
    const t = convexTest(schema, modules);
    const { teamId } = await seedTeamAndUser(t);
    const { contractId } = await insertPlayerAndContract(t, teamId);

    await t.mutation(
      (await import("../internalMutations")).updateExtractionResult,
      { contractId, status: "processing" },
    );

    const contract = await t.run(async (ctx) => ctx.db.get(contractId));
    expect(contract!.extractionStatus).toBe("processing");
  });

  it("sets status to 'completed' with extractedData and clears error", async () => {
    const t = convexTest(schema, modules);
    const { teamId } = await seedTeamAndUser(t);
    const { contractId } = await insertPlayerAndContract(t, teamId);

    // First set an error
    await t.mutation(
      (await import("../internalMutations")).updateExtractionResult,
      {
        contractId,
        status: "failed",
        extractionError: "Test error",
      },
    );

    // Then complete successfully
    await t.mutation(
      (await import("../internalMutations")).updateExtractionResult,
      {
        contractId,
        status: "completed",
        extractedData: {
          salary: "€1M/year",
          duration: "3 years",
        },
      },
    );

    const contract = await t.run(async (ctx) => ctx.db.get(contractId));
    expect(contract!.extractionStatus).toBe("completed");
    expect(contract!.extractedData).toEqual({
      salary: "€1M/year",
      duration: "3 years",
    });
    // Error should be cleared on success
    expect(contract!.extractionError).toBeUndefined();
  });

  it("sets status to 'failed' with extractionError and clears data", async () => {
    const t = convexTest(schema, modules);
    const { teamId } = await seedTeamAndUser(t);
    const { contractId } = await insertPlayerAndContract(t, teamId);

    await t.mutation(
      (await import("../internalMutations")).updateExtractionResult,
      {
        contractId,
        status: "failed",
        extractionError: "OpenAI timeout",
      },
    );

    const contract = await t.run(async (ctx) => ctx.db.get(contractId));
    expect(contract!.extractionStatus).toBe("failed");
    expect(contract!.extractionError).toBe("OpenAI timeout");
    expect(contract!.extractedData).toBeUndefined();
  });

  it("handles non-existent contract gracefully", async () => {
    const t = convexTest(schema, modules);
    await seedTeamAndUser(t);

    // Should not throw — just logs an error
    await t.mutation(
      (await import("../internalMutations")).updateExtractionResult,
      {
        contractId: "jd7gxk14d03f2f6vmjjkwdvs4h7b7gbm" as Id<"contracts">,
        status: "failed",
        extractionError: "Not found",
      },
    );
  });
});

// ===========================================================================
// uploadContract — schedules extraction (Story 6.1)
// ===========================================================================

describe("uploadContract schedules extraction", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("creates contract with 'pending' status", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const { playerId, fileId } = await t.run(async (ctx) => {
      const now = Date.now();
      const playerId = await ctx.db.insert("players", {
        teamId,
        firstName: "Test",
        lastName: "Player",
        position: "Forward",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      const blob = new Blob(["fake-pdf"], { type: "application/pdf" });
      const fileId = await ctx.storage.store(blob);
      return { playerId, fileId };
    });

    const contractId = await t.mutation(
      (await import("../mutations")).uploadContract,
      { playerId, fileId },
    );

    const contract = await t.run(async (ctx) => ctx.db.get(contractId));
    expect(contract).not.toBeNull();
    expect(contract!.extractionStatus).toBe("pending");
    expect(contract!.playerId).toBe(playerId);
    expect(contract!.fileId).toBe(fileId);
  });

  it("replaces existing contract and resets extraction state", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const { playerId, contractId: existingId, newFileId } = await t.run(
      async (ctx) => {
        const now = Date.now();
        const playerId = await ctx.db.insert("players", {
          teamId,
          firstName: "Test",
          lastName: "Player",
          position: "Forward",
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
        const blob1 = new Blob(["old-pdf"], { type: "application/pdf" });
        const fileId1 = await ctx.storage.store(blob1);
        const contractId = await ctx.db.insert("contracts", {
          teamId,
          playerId,
          fileId: fileId1,
          extractionStatus: "completed",
          extractedData: { salary: "€500K" },
          createdAt: now,
          updatedAt: now,
        });
        const blob2 = new Blob(["new-pdf"], { type: "application/pdf" });
        const newFileId = await ctx.storage.store(blob2);
        return { playerId, contractId, newFileId };
      },
    );

    const returnedId = await t.mutation(
      (await import("../mutations")).uploadContract,
      { playerId, fileId: newFileId },
    );

    expect(returnedId).toBe(existingId);

    const contract = await t.run(async (ctx) => ctx.db.get(existingId));
    expect(contract!.extractionStatus).toBe("pending");
    expect(contract!.extractedData).toBeUndefined();
    expect(contract!.extractionError).toBeUndefined();
    expect(contract!.fileId).toBe(newFileId);
  });
});
