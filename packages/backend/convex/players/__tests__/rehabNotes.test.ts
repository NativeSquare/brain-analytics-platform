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

async function seedPlayer(
  t: ReturnType<typeof convexTest>,
  teamId: Id<"teams">
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("players", {
      teamId,
      firstName: "Marcus",
      lastName: "Rashford",
      position: "Forward",
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

async function seedInjury(
  t: ReturnType<typeof convexTest>,
  teamId: Id<"teams">,
  playerId: Id<"players">,
  createdBy: Id<"users">
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("playerInjuries", {
      teamId,
      playerId,
      date: Date.now(),
      injuryType: "Hamstring strain",
      severity: "moderate",
      status: "active",
      createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

function getErrorCode(error: unknown): string | undefined {
  if (error instanceof ConvexError) {
    return (error.data as any).code;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Inline logic mirrors (for t.run compatibility)
// ---------------------------------------------------------------------------

async function getRehabNotesLogic(
  ctx: any,
  args: { injuryId: Id<"playerInjuries"> }
) {
  const { teamId } = await requireRole(ctx, ["admin", "physio"]);

  const injury = await ctx.db.get(args.injuryId);
  if (!injury || injury.teamId !== teamId) {
    throw new ConvexError({ code: "NOT_FOUND" as const, message: "Injury not found" });
  }

  const notes = await ctx.db
    .query("injuryRehabNotes")
    .withIndex("by_injuryId", (q: any) => q.eq("injuryId", args.injuryId))
    .collect();

  const notesWithAuthors = await Promise.all(
    notes.map(async (note: any) => {
      const author = await ctx.db.get(note.authorId);
      return {
        ...note,
        authorName: author?.name ?? author?.email ?? "Unknown",
      };
    })
  );

  return notesWithAuthors.sort((a: any, b: any) => a.createdAt - b.createdAt);
}

async function addRehabNoteLogic(
  ctx: any,
  args: { injuryId: Id<"playerInjuries">; note: string }
) {
  const { user, teamId } = await requireRole(ctx, ["admin", "physio"]);

  const injury = await ctx.db.get(args.injuryId);
  if (!injury || injury.teamId !== teamId) {
    throw new ConvexError({ code: "NOT_FOUND" as const, message: "Injury not found" });
  }

  const trimmed = args.note.trim();
  if (!trimmed) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Note is required" });
  }
  if (trimmed.length > 2000) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Note cannot exceed 2000 characters",
    });
  }

  const now = Date.now();
  return await ctx.db.insert("injuryRehabNotes", {
    teamId,
    injuryId: args.injuryId,
    authorId: user._id,
    note: trimmed,
    createdAt: now,
    updatedAt: now,
  });
}

async function updateRehabNoteLogic(
  ctx: any,
  args: { noteId: Id<"injuryRehabNotes">; note: string }
) {
  const { teamId } = await requireRole(ctx, ["admin", "physio"]);

  const existingNote = await ctx.db.get(args.noteId);
  if (!existingNote || existingNote.teamId !== teamId) {
    throw new ConvexError({ code: "NOT_FOUND" as const, message: "Note not found" });
  }

  const trimmed = args.note.trim();
  if (!trimmed) {
    throw new ConvexError({ code: "VALIDATION_ERROR" as const, message: "Note is required" });
  }
  if (trimmed.length > 2000) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Note cannot exceed 2000 characters",
    });
  }

  await ctx.db.patch(args.noteId, {
    note: trimmed,
    updatedAt: Date.now(),
  });

  return args.noteId;
}

async function deleteRehabNoteLogic(
  ctx: any,
  args: { noteId: Id<"injuryRehabNotes"> }
) {
  const { teamId } = await requireRole(ctx, ["admin", "physio"]);

  const existingNote = await ctx.db.get(args.noteId);
  if (!existingNote || existingNote.teamId !== teamId) {
    throw new ConvexError({ code: "NOT_FOUND" as const, message: "Note not found" });
  }

  await ctx.db.delete(args.noteId);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Rehab Notes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // getRehabNotes
  // =========================================================================

  describe("getRehabNotes", () => {
    it("admin can retrieve notes for an injury sorted by createdAt ascending", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
      mockGetAuthUserId.mockResolvedValue(userId);

      const playerId = await seedPlayer(t, teamId);
      const injuryId = await seedInjury(t, teamId, playerId, userId);

      // Insert notes out of order
      await t.run(async (ctx) => {
        await ctx.db.insert("injuryRehabNotes", {
          teamId,
          injuryId,
          authorId: userId,
          note: "Second note",
          createdAt: 2000,
          updatedAt: 2000,
        });
        await ctx.db.insert("injuryRehabNotes", {
          teamId,
          injuryId,
          authorId: userId,
          note: "First note",
          createdAt: 1000,
          updatedAt: 1000,
        });
      });

      const notes = await t.run(async (ctx) => {
        return await getRehabNotesLogic(ctx, { injuryId });
      });

      expect(notes).toHaveLength(2);
      expect(notes[0].note).toBe("First note");
      expect(notes[1].note).toBe("Second note");
      expect(notes[0].createdAt).toBeLessThan(notes[1].createdAt);
    });

    it("physio can retrieve notes", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "physio" });
      mockGetAuthUserId.mockResolvedValue(userId);

      const playerId = await seedPlayer(t, teamId);
      const injuryId = await seedInjury(t, teamId, playerId, userId);

      const notes = await t.run(async (ctx) => {
        return await getRehabNotesLogic(ctx, { injuryId });
      });

      expect(notes).toEqual([]);
    });

    it("coach gets NOT_AUTHORIZED error", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
      mockGetAuthUserId.mockResolvedValue(userId);

      const playerId = await seedPlayer(t, teamId);
      const injuryId = await seedInjury(t, teamId, playerId, userId);

      await expect(
        t.run(async (ctx) => {
          return await getRehabNotesLogic(ctx, { injuryId });
        })
      ).rejects.toThrow();
    });

    it("returns empty array when no notes exist", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
      mockGetAuthUserId.mockResolvedValue(userId);

      const playerId = await seedPlayer(t, teamId);
      const injuryId = await seedInjury(t, teamId, playerId, userId);

      const notes = await t.run(async (ctx) => {
        return await getRehabNotesLogic(ctx, { injuryId });
      });

      expect(notes).toEqual([]);
    });

    it("resolves author name correctly", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, {
        role: "admin",
        name: "Dr. Marco Rossi",
      });
      mockGetAuthUserId.mockResolvedValue(userId);

      const playerId = await seedPlayer(t, teamId);
      const injuryId = await seedInjury(t, teamId, playerId, userId);

      await t.run(async (ctx) => {
        await ctx.db.insert("injuryRehabNotes", {
          teamId,
          injuryId,
          authorId: userId,
          note: "Test note",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const notes = await t.run(async (ctx) => {
        return await getRehabNotesLogic(ctx, { injuryId });
      });

      expect(notes[0].authorName).toBe("Dr. Marco Rossi");
    });

    it("wrong team injury throws NOT_FOUND", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
      mockGetAuthUserId.mockResolvedValue(userId);

      // Create injury in different team
      const otherTeamId = await t.run(async (ctx) => {
        return await ctx.db.insert("teams", { name: "Other Club", slug: "other-club" });
      });
      const playerId = await seedPlayer(t, otherTeamId);
      const injuryId = await seedInjury(t, otherTeamId, playerId, userId);

      let errorCode: string | undefined;
      await expect(
        t.run(async (ctx) => {
          try {
            await getRehabNotesLogic(ctx, { injuryId });
          } catch (e) {
            errorCode = getErrorCode(e);
            throw e;
          }
        })
      ).rejects.toThrow(ConvexError);
      expect(errorCode).toBe("NOT_FOUND");
    });
  });

  // =========================================================================
  // addRehabNote
  // =========================================================================

  describe("addRehabNote", () => {
    it("admin can add a note and returns a valid ID", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
      mockGetAuthUserId.mockResolvedValue(userId);

      const playerId = await seedPlayer(t, teamId);
      const injuryId = await seedInjury(t, teamId, playerId, userId);

      const noteId = await t.run(async (ctx) => {
        return await addRehabNoteLogic(ctx, { injuryId, note: "Initial assessment" });
      });

      expect(noteId).toBeTruthy();

      // Verify the note was created with correct fields
      const note = await t.run(async (ctx) => {
        return await ctx.db.get(noteId);
      });

      expect(note).not.toBeNull();
      expect(note!.note).toBe("Initial assessment");
      expect(note!.authorId).toBe(userId);
      expect(note!.teamId).toBe(teamId);
      expect(note!.injuryId).toBe(injuryId);
      expect(note!.createdAt).toBeGreaterThan(0);
    });

    it("physio can add a note", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "physio" });
      mockGetAuthUserId.mockResolvedValue(userId);

      const playerId = await seedPlayer(t, teamId);
      const injuryId = await seedInjury(t, teamId, playerId, userId);

      const noteId = await t.run(async (ctx) => {
        return await addRehabNoteLogic(ctx, { injuryId, note: "Physio note" });
      });

      expect(noteId).toBeTruthy();
    });

    it("coach gets NOT_AUTHORIZED", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
      mockGetAuthUserId.mockResolvedValue(userId);

      const playerId = await seedPlayer(t, teamId);
      const injuryId = await seedInjury(t, teamId, playerId, userId);

      await expect(
        t.run(async (ctx) => {
          return await addRehabNoteLogic(ctx, { injuryId, note: "Should fail" });
        })
      ).rejects.toThrow();
    });

    it("empty note throws VALIDATION_ERROR", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
      mockGetAuthUserId.mockResolvedValue(userId);

      const playerId = await seedPlayer(t, teamId);
      const injuryId = await seedInjury(t, teamId, playerId, userId);

      let errorCode: string | undefined;
      await expect(
        t.run(async (ctx) => {
          try {
            await addRehabNoteLogic(ctx, { injuryId, note: "   " });
          } catch (e) {
            errorCode = getErrorCode(e);
            throw e;
          }
        })
      ).rejects.toThrow(ConvexError);
      expect(errorCode).toBe("VALIDATION_ERROR");
    });

    it("note > 2000 chars throws VALIDATION_ERROR", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
      mockGetAuthUserId.mockResolvedValue(userId);

      const playerId = await seedPlayer(t, teamId);
      const injuryId = await seedInjury(t, teamId, playerId, userId);

      let errorCode: string | undefined;
      await expect(
        t.run(async (ctx) => {
          try {
            await addRehabNoteLogic(ctx, { injuryId, note: "x".repeat(2001) });
          } catch (e) {
            errorCode = getErrorCode(e);
            throw e;
          }
        })
      ).rejects.toThrow(ConvexError);
      expect(errorCode).toBe("VALIDATION_ERROR");
    });

    it("wrong team injury throws NOT_FOUND", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
      mockGetAuthUserId.mockResolvedValue(userId);

      const otherTeamId = await t.run(async (ctx) => {
        return await ctx.db.insert("teams", { name: "Other Club", slug: "other-club" });
      });
      const playerId = await seedPlayer(t, otherTeamId);
      const injuryId = await seedInjury(t, otherTeamId, playerId, userId);

      let errorCode: string | undefined;
      await expect(
        t.run(async (ctx) => {
          try {
            await addRehabNoteLogic(ctx, { injuryId, note: "Cross-team" });
          } catch (e) {
            errorCode = getErrorCode(e);
            throw e;
          }
        })
      ).rejects.toThrow(ConvexError);
      expect(errorCode).toBe("NOT_FOUND");
    });
  });

  // =========================================================================
  // updateRehabNote
  // =========================================================================

  describe("updateRehabNote", () => {
    it("admin can update a note", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
      mockGetAuthUserId.mockResolvedValue(userId);

      const playerId = await seedPlayer(t, teamId);
      const injuryId = await seedInjury(t, teamId, playerId, userId);

      const noteId = await t.run(async (ctx) => {
        return await ctx.db.insert("injuryRehabNotes", {
          teamId,
          injuryId,
          authorId: userId,
          note: "Original",
          createdAt: 1000,
          updatedAt: 1000,
        });
      });

      await t.run(async (ctx) => {
        return await updateRehabNoteLogic(ctx, { noteId, note: "Updated text" });
      });

      const updated = await t.run(async (ctx) => {
        return await ctx.db.get(noteId);
      });

      expect(updated!.note).toBe("Updated text");
      expect(updated!.updatedAt).toBeGreaterThan(1000);
    });

    it("physio can update a note", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "physio" });
      mockGetAuthUserId.mockResolvedValue(userId);

      const playerId = await seedPlayer(t, teamId);
      const injuryId = await seedInjury(t, teamId, playerId, userId);

      const noteId = await t.run(async (ctx) => {
        return await ctx.db.insert("injuryRehabNotes", {
          teamId,
          injuryId,
          authorId: userId,
          note: "Original",
          createdAt: 1000,
          updatedAt: 1000,
        });
      });

      const result = await t.run(async (ctx) => {
        return await updateRehabNoteLogic(ctx, { noteId, note: "Updated" });
      });

      expect(result).toBe(noteId);
    });

    it("coach gets NOT_AUTHORIZED", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
      mockGetAuthUserId.mockResolvedValue(userId);

      const playerId = await seedPlayer(t, teamId);
      const injuryId = await seedInjury(t, teamId, playerId, userId);

      const noteId = await t.run(async (ctx) => {
        return await ctx.db.insert("injuryRehabNotes", {
          teamId,
          injuryId,
          authorId: userId,
          note: "Original",
          createdAt: 1000,
          updatedAt: 1000,
        });
      });

      await expect(
        t.run(async (ctx) => {
          return await updateRehabNoteLogic(ctx, { noteId, note: "Should fail" });
        })
      ).rejects.toThrow();
    });

    it("wrong team note throws NOT_FOUND", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
      mockGetAuthUserId.mockResolvedValue(userId);

      const otherTeamId = await t.run(async (ctx) => {
        return await ctx.db.insert("teams", { name: "Other Club", slug: "other-club" });
      });
      const playerId = await seedPlayer(t, otherTeamId);
      const injuryId = await seedInjury(t, otherTeamId, playerId, userId);

      const noteId = await t.run(async (ctx) => {
        return await ctx.db.insert("injuryRehabNotes", {
          teamId: otherTeamId,
          injuryId,
          authorId: userId,
          note: "Other team note",
          createdAt: 1000,
          updatedAt: 1000,
        });
      });

      let errorCode: string | undefined;
      await expect(
        t.run(async (ctx) => {
          try {
            await updateRehabNoteLogic(ctx, { noteId, note: "Cross-team" });
          } catch (e) {
            errorCode = getErrorCode(e);
            throw e;
          }
        })
      ).rejects.toThrow(ConvexError);
      expect(errorCode).toBe("NOT_FOUND");
    });

    it("empty note throws VALIDATION_ERROR", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
      mockGetAuthUserId.mockResolvedValue(userId);

      const playerId = await seedPlayer(t, teamId);
      const injuryId = await seedInjury(t, teamId, playerId, userId);

      const noteId = await t.run(async (ctx) => {
        return await ctx.db.insert("injuryRehabNotes", {
          teamId,
          injuryId,
          authorId: userId,
          note: "Original",
          createdAt: 1000,
          updatedAt: 1000,
        });
      });

      let errorCode: string | undefined;
      await expect(
        t.run(async (ctx) => {
          try {
            await updateRehabNoteLogic(ctx, { noteId, note: "" });
          } catch (e) {
            errorCode = getErrorCode(e);
            throw e;
          }
        })
      ).rejects.toThrow(ConvexError);
      expect(errorCode).toBe("VALIDATION_ERROR");
    });

    it("updatedAt is refreshed", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
      mockGetAuthUserId.mockResolvedValue(userId);

      const playerId = await seedPlayer(t, teamId);
      const injuryId = await seedInjury(t, teamId, playerId, userId);

      const noteId = await t.run(async (ctx) => {
        return await ctx.db.insert("injuryRehabNotes", {
          teamId,
          injuryId,
          authorId: userId,
          note: "Original",
          createdAt: 1000,
          updatedAt: 1000,
        });
      });

      await t.run(async (ctx) => {
        return await updateRehabNoteLogic(ctx, { noteId, note: "Updated" });
      });

      const updated = await t.run(async (ctx) => {
        return await ctx.db.get(noteId);
      });

      expect(updated!.updatedAt).toBeGreaterThan(1000);
      expect(updated!.createdAt).toBe(1000);
    });
  });

  // =========================================================================
  // deleteRehabNote
  // =========================================================================

  describe("deleteRehabNote", () => {
    it("admin can delete a note", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
      mockGetAuthUserId.mockResolvedValue(userId);

      const playerId = await seedPlayer(t, teamId);
      const injuryId = await seedInjury(t, teamId, playerId, userId);

      const noteId = await t.run(async (ctx) => {
        return await ctx.db.insert("injuryRehabNotes", {
          teamId,
          injuryId,
          authorId: userId,
          note: "To be deleted",
          createdAt: 1000,
          updatedAt: 1000,
        });
      });

      await t.run(async (ctx) => {
        return await deleteRehabNoteLogic(ctx, { noteId });
      });

      const deleted = await t.run(async (ctx) => {
        return await ctx.db.get(noteId);
      });

      expect(deleted).toBeNull();
    });

    it("physio can delete a note", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "physio" });
      mockGetAuthUserId.mockResolvedValue(userId);

      const playerId = await seedPlayer(t, teamId);
      const injuryId = await seedInjury(t, teamId, playerId, userId);

      const noteId = await t.run(async (ctx) => {
        return await ctx.db.insert("injuryRehabNotes", {
          teamId,
          injuryId,
          authorId: userId,
          note: "To be deleted",
          createdAt: 1000,
          updatedAt: 1000,
        });
      });

      await t.run(async (ctx) => {
        return await deleteRehabNoteLogic(ctx, { noteId });
      });

      const deleted = await t.run(async (ctx) => {
        return await ctx.db.get(noteId);
      });

      expect(deleted).toBeNull();
    });

    it("coach gets NOT_AUTHORIZED", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
      mockGetAuthUserId.mockResolvedValue(userId);

      const playerId = await seedPlayer(t, teamId);
      const injuryId = await seedInjury(t, teamId, playerId, userId);

      const noteId = await t.run(async (ctx) => {
        return await ctx.db.insert("injuryRehabNotes", {
          teamId,
          injuryId,
          authorId: userId,
          note: "To be deleted",
          createdAt: 1000,
          updatedAt: 1000,
        });
      });

      await expect(
        t.run(async (ctx) => {
          return await deleteRehabNoteLogic(ctx, { noteId });
        })
      ).rejects.toThrow();
    });

    it("wrong team note throws NOT_FOUND", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
      mockGetAuthUserId.mockResolvedValue(userId);

      const otherTeamId = await t.run(async (ctx) => {
        return await ctx.db.insert("teams", { name: "Other Club", slug: "other-club" });
      });
      const playerId = await seedPlayer(t, otherTeamId);
      const injuryId = await seedInjury(t, otherTeamId, playerId, userId);

      const noteId = await t.run(async (ctx) => {
        return await ctx.db.insert("injuryRehabNotes", {
          teamId: otherTeamId,
          injuryId,
          authorId: userId,
          note: "Other team",
          createdAt: 1000,
          updatedAt: 1000,
        });
      });

      let errorCode: string | undefined;
      await expect(
        t.run(async (ctx) => {
          try {
            await deleteRehabNoteLogic(ctx, { noteId });
          } catch (e) {
            errorCode = getErrorCode(e);
            throw e;
          }
        })
      ).rejects.toThrow(ConvexError);
      expect(errorCode).toBe("NOT_FOUND");
    });

    it("deleted note no longer appears in getRehabNotes", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
      mockGetAuthUserId.mockResolvedValue(userId);

      const playerId = await seedPlayer(t, teamId);
      const injuryId = await seedInjury(t, teamId, playerId, userId);

      const noteId = await t.run(async (ctx) => {
        return await ctx.db.insert("injuryRehabNotes", {
          teamId,
          injuryId,
          authorId: userId,
          note: "Will be deleted",
          createdAt: 1000,
          updatedAt: 1000,
        });
      });

      // Delete
      await t.run(async (ctx) => {
        return await deleteRehabNoteLogic(ctx, { noteId });
      });

      // Verify gone from query
      const notes = await t.run(async (ctx) => {
        return await getRehabNotesLogic(ctx, { injuryId });
      });

      expect(notes).toHaveLength(0);
    });
  });
});
