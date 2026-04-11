import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { requireAuth, requireRole, getTeamResource } from "../lib/auth";
import {
  INJURY_SEVERITIES,
  INJURY_STATUSES,
  PLAYER_STATUSES,
  BODY_REGIONS,
  INJURY_MECHANISMS,
  INJURY_SIDES,
} from "@packages/shared/players";

/**
 * Valid player positions — must match shared/players.ts PLAYER_POSITIONS.
 */
const VALID_POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward"];

// ---------------------------------------------------------------------------
// Fitness field validation helper
// ---------------------------------------------------------------------------

function validateFitnessFields(args: {
  weightKg?: number;
  bodyFatPercentage?: number;
  notes?: string;
}) {
  // Validate at least one data field
  if (args.weightKg === undefined && args.bodyFatPercentage === undefined && !args.notes) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "At least one data field (weight, body fat, or notes) is required",
    });
  }

  // Validate ranges
  if (args.weightKg !== undefined && (args.weightKg < 30 || args.weightKg > 200)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Weight must be between 30 and 200 kg",
    });
  }
  if (
    args.bodyFatPercentage !== undefined &&
    (args.bodyFatPercentage < 1 || args.bodyFatPercentage > 60)
  ) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Body fat must be between 1% and 60%",
    });
  }
  if (args.notes !== undefined && args.notes.length > 2000) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Notes cannot exceed 2000 characters",
    });
  }
}

// ---------------------------------------------------------------------------
// Fitness CRUD mutations (Story 5.4 AC #6, #9, #11, #14)
// ---------------------------------------------------------------------------

/**
 * Add a fitness entry for a player. Admin or physio only.
 *
 * Story 5.4 AC #6: Creates a playerFitness entry with validation.
 * Story 5.4 AC #14: Team-scoped via requireRole.
 */
export const addPlayerFitness = mutation({
  args: {
    playerId: v.id("players"),
    date: v.number(),
    weightKg: v.optional(v.number()),
    bodyFatPercentage: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireRole(ctx, ["admin", "physio"]);

    await getTeamResource(ctx, teamId, "players", args.playerId);

    validateFitnessFields(args);

    const now = Date.now();
    return await ctx.db.insert("playerFitness", {
      teamId,
      playerId: args.playerId,
      date: args.date,
      weightKg: args.weightKg,
      bodyFatPercentage: args.bodyFatPercentage,
      notes: args.notes,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update an existing fitness entry. Admin or physio only.
 *
 * Story 5.4 AC #9: Patches all fields + updatedAt.
 * Story 5.4 AC #14: Team-scoped via requireRole.
 */
export const updatePlayerFitness = mutation({
  args: {
    fitnessId: v.id("playerFitness"),
    date: v.number(),
    weightKg: v.optional(v.number()),
    bodyFatPercentage: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { teamId } = await requireRole(ctx, ["admin", "physio"]);

    await getTeamResource(ctx, teamId, "playerFitness", args.fitnessId);

    validateFitnessFields(args);

    await ctx.db.patch(args.fitnessId, {
      date: args.date,
      weightKg: args.weightKg,
      bodyFatPercentage: args.bodyFatPercentage,
      notes: args.notes,
      updatedAt: Date.now(),
    });

    return args.fitnessId;
  },
});

/**
 * Delete a fitness entry. Admin or physio only.
 *
 * Story 5.4 AC #11: Removes the playerFitness document.
 * Story 5.4 AC #14: Team-scoped via requireRole.
 */
export const deletePlayerFitness = mutation({
  args: {
    fitnessId: v.id("playerFitness"),
  },
  handler: async (ctx, { fitnessId }) => {
    const { teamId } = await requireRole(ctx, ["admin", "physio"]);

    await getTeamResource(ctx, teamId, "playerFitness", fitnessId);

    await ctx.db.delete(fitnessId);
  },
});

// ---------------------------------------------------------------------------
// Injury field validation helper
// ---------------------------------------------------------------------------

function validateInjuryFields(args: {
  injuryType: string;
  severity: string;
  estimatedRecovery?: string;
  notes?: string;
  status?: string;
  bodyRegion?: string;
  mechanism?: string;
  side?: string;
  expectedReturnDate?: number;
}) {
  // Validate injuryType
  if (!args.injuryType || args.injuryType.trim().length === 0) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Injury type is required",
    });
  }
  if (args.injuryType.length > 200) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Injury type cannot exceed 200 characters",
    });
  }

  // Validate severity (using shared constants)
  if (!(INJURY_SEVERITIES as readonly string[]).includes(args.severity)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Severity must be minor, moderate, or severe",
    });
  }

  // Validate estimatedRecovery length
  if (args.estimatedRecovery && args.estimatedRecovery.length > 200) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Estimated recovery cannot exceed 200 characters",
    });
  }

  // Validate notes length
  if (args.notes && args.notes.length > 2000) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Notes cannot exceed 2000 characters",
    });
  }

  // Validate status if provided (Story 14.1: now validates against 4-value enum)
  if (args.status !== undefined && !(INJURY_STATUSES as readonly string[]).includes(args.status)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Status must be active, rehab, assessment, or cleared",
    });
  }

  // Story 14.1: Validate clinical classification fields
  if (args.bodyRegion !== undefined && !(BODY_REGIONS as readonly string[]).includes(args.bodyRegion)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Invalid body region",
    });
  }

  if (args.mechanism !== undefined && !(INJURY_MECHANISMS as readonly string[]).includes(args.mechanism)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Invalid injury mechanism",
    });
  }

  if (args.side !== undefined && !(INJURY_SIDES as readonly string[]).includes(args.side)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Invalid injury side",
    });
  }

  if (args.expectedReturnDate !== undefined && args.expectedReturnDate <= 0) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Expected return date must be a positive number",
    });
  }
}

// ---------------------------------------------------------------------------
// Injury CRUD mutations (Story 5.5 AC #6, #9, #11, #14, #15)
// ---------------------------------------------------------------------------

/**
 * Log a new injury for a player. Admin or physio only.
 *
 * Story 5.5 AC #6: Creates a playerInjuries entry with validation.
 * Story 5.5 AC #14, #15: Team-scoped via requireRole(["admin", "physio"]).
 */
export const logInjury = mutation({
  args: {
    playerId: v.id("players"),
    date: v.number(),
    injuryType: v.string(),
    severity: v.string(),
    bodyRegion: v.optional(v.string()),
    mechanism: v.optional(v.string()),
    side: v.optional(v.string()),
    expectedReturnDate: v.optional(v.number()),
    estimatedRecovery: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireRole(ctx, ["admin", "physio"]);

    await getTeamResource(ctx, teamId, "players", args.playerId);

    validateInjuryFields(args);

    const now = Date.now();
    return await ctx.db.insert("playerInjuries", {
      teamId,
      playerId: args.playerId,
      date: args.date,
      injuryType: args.injuryType,
      severity: args.severity,
      bodyRegion: args.bodyRegion,
      mechanism: args.mechanism,
      side: args.side,
      expectedReturnDate: args.expectedReturnDate,
      estimatedRecovery: args.estimatedRecovery,
      notes: args.notes,
      status: "active",
      actualReturnDate: undefined,
      clearanceDate: undefined,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update an existing injury entry. Admin or physio only.
 *
 * Story 5.5 AC #9: Patches all fields + updatedAt.
 * Story 5.5 AC #14, #15: Team-scoped via requireRole(["admin", "physio"]).
 */
export const updateInjury = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    date: v.number(),
    injuryType: v.string(),
    severity: v.string(),
    bodyRegion: v.optional(v.string()),
    mechanism: v.optional(v.string()),
    side: v.optional(v.string()),
    expectedReturnDate: v.optional(v.number()),
    estimatedRecovery: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.string(),
    clearanceDate: v.optional(v.number()),
    actualReturnDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { teamId } = await requireRole(ctx, ["admin", "physio"]);

    await getTeamResource(ctx, teamId, "playerInjuries", args.injuryId);

    validateInjuryFields({
      injuryType: args.injuryType,
      severity: args.severity,
      estimatedRecovery: args.estimatedRecovery,
      notes: args.notes,
      status: args.status,
      bodyRegion: args.bodyRegion,
      mechanism: args.mechanism,
      side: args.side,
      expectedReturnDate: args.expectedReturnDate,
    });

    // Story 14.1 AC #4: Auto-set actualReturnDate when status changes to "cleared"
    const actualReturnDate =
      args.status === "cleared" && args.actualReturnDate === undefined
        ? Date.now()
        : args.actualReturnDate;

    await ctx.db.patch(args.injuryId, {
      date: args.date,
      injuryType: args.injuryType,
      severity: args.severity,
      bodyRegion: args.bodyRegion,
      mechanism: args.mechanism,
      side: args.side,
      expectedReturnDate: args.expectedReturnDate,
      estimatedRecovery: args.estimatedRecovery,
      notes: args.notes,
      status: args.status,
      clearanceDate: args.clearanceDate,
      actualReturnDate,
      updatedAt: Date.now(),
    });

    return args.injuryId;
  },
});

/**
 * Delete an injury entry. Admin or physio only.
 *
 * Story 5.5 AC #11: Removes the playerInjuries document.
 * Story 5.5 AC #14, #15: Team-scoped via requireRole(["admin", "physio"]).
 */
export const deleteInjury = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
  },
  handler: async (ctx, { injuryId }) => {
    const { teamId } = await requireRole(ctx, ["admin", "physio"]);

    await getTeamResource(ctx, teamId, "playerInjuries", injuryId);

    await ctx.db.delete(injuryId);
  },
});

// ---------------------------------------------------------------------------
// RTP Status Workflow (Story 14.3 AC #2)
// ---------------------------------------------------------------------------

/**
 * Allowed forward-only status transitions for RTP workflow.
 * Re-injury exception: cleared -> active.
 * Backward-compat: current -> rehab, recovered -> active.
 */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  active: ["rehab"],
  rehab: ["assessment"],
  assessment: ["cleared"],
  cleared: ["active"], // re-injury
  // Backward compat
  current: ["rehab"],
  recovered: ["active"],
};

/**
 * Advance an injury through the RTP workflow. Admin or physio only.
 *
 * Story 14.3 AC #2: Forward-only transitions with re-injury exception.
 * Story 14.3 AC #2.3: Auto-set/clear clearanceDate on cleared transitions.
 */
export const updateInjuryRtpStatus = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    newStatus: v.string(),
  },
  handler: async (ctx, { injuryId, newStatus }) => {
    const { teamId } = await requireRole(ctx, ["admin", "physio"]);

    // Validate newStatus is a valid RTP status
    const validStatuses = ["active", "rehab", "assessment", "cleared"];
    if (!validStatuses.includes(newStatus)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: `Invalid status value: ${newStatus}`,
      });
    }

    const injury = await ctx.db.get(injuryId);
    if (!injury || injury.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Injury not found",
      });
    }

    const currentStatus = injury.status;
    const allowed = ALLOWED_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: `Invalid status transition from ${currentStatus} to ${newStatus}`,
      });
    }

    const now = Date.now();
    const patch: Record<string, unknown> = {
      status: newStatus,
      updatedAt: now,
    };

    // Auto-set clearanceDate when transitioning to cleared
    if (newStatus === "cleared" && injury.clearanceDate === undefined) {
      patch.clearanceDate = now;
    }

    // Clear clearanceDate on re-injury (cleared -> active)
    if (currentStatus === "cleared" && newStatus === "active") {
      patch.clearanceDate = undefined;
    }

    await ctx.db.patch(injuryId, patch);
    return injuryId;
  },
});

// ---------------------------------------------------------------------------
// Rehab Notes CRUD mutations (Story 14.2 AC #7, #8, #9, #15)
// ---------------------------------------------------------------------------

/**
 * Add a rehab note to an injury. Admin or physio only.
 *
 * Story 14.2 AC #7: Creates an injuryRehabNotes entry with validation.
 * Story 14.2 AC #15: Team-scoped via requireRole(["admin", "physio"]).
 */
export const addRehabNote = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    note: v.string(),
  },
  handler: async (ctx, args) => {
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
  },
});

/**
 * Update an existing rehab note. Admin or physio only.
 *
 * Story 14.2 AC #8: Patches the note text and updatedAt.
 * Story 14.2 AC #15: Team-scoped via requireRole(["admin", "physio"]).
 */
export const updateRehabNote = mutation({
  args: {
    noteId: v.id("injuryRehabNotes"),
    note: v.string(),
  },
  handler: async (ctx, args) => {
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
  },
});

/**
 * Delete a rehab note. Admin or physio only.
 *
 * Story 14.2 AC #9: Removes the injuryRehabNotes document.
 * Story 14.2 AC #15: Team-scoped via requireRole(["admin", "physio"]).
 */
export const deleteRehabNote = mutation({
  args: {
    noteId: v.id("injuryRehabNotes"),
  },
  handler: async (ctx, { noteId }) => {
    const { teamId } = await requireRole(ctx, ["admin", "physio"]);

    const existingNote = await ctx.db.get(noteId);
    if (!existingNote || existingNote.teamId !== teamId) {
      throw new ConvexError({ code: "NOT_FOUND" as const, message: "Note not found" });
    }

    await ctx.db.delete(noteId);
  },
});

// ---------------------------------------------------------------------------
// Stats field validation helper
// ---------------------------------------------------------------------------

function validateStatsFields(args: {
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}) {
  // Validate all numeric fields are integers
  if (!Number.isInteger(args.minutesPlayed)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Minutes played must be a whole number",
    });
  }
  if (!Number.isInteger(args.goals)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Goals must be a whole number",
    });
  }
  if (!Number.isInteger(args.assists)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Assists must be a whole number",
    });
  }
  if (!Number.isInteger(args.yellowCards)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Yellow cards must be a whole number",
    });
  }
  if (!Number.isInteger(args.redCards)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Red cards must be a whole number",
    });
  }

  // Validate ranges
  if (args.minutesPlayed < 0 || args.minutesPlayed > 120) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Minutes played must be between 0 and 120",
    });
  }
  if (args.goals < 0) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Goals must be 0 or more",
    });
  }
  if (args.assists < 0) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Assists must be 0 or more",
    });
  }
  if (args.yellowCards < 0 || args.yellowCards > 2) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Yellow cards must be between 0 and 2",
    });
  }
  if (args.redCards < 0 || args.redCards > 1) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Red cards must be 0 or 1",
    });
  }
}

// ---------------------------------------------------------------------------
// Stats CRUD mutations (AC #6, #9, #11, #14)
// ---------------------------------------------------------------------------

/**
 * Add match stats for a player. Admin only.
 *
 * AC #6: Creates a playerStats entry with validation.
 * AC #14: Team-scoped via requireRole.
 */
export const addPlayerStats = mutation({
  args: {
    playerId: v.id("players"),
    matchDate: v.number(),
    opponent: v.string(),
    minutesPlayed: v.number(),
    goals: v.number(),
    assists: v.number(),
    yellowCards: v.number(),
    redCards: v.number(),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireRole(ctx, ["admin"]);

    await getTeamResource(ctx, teamId, "players", args.playerId);

    validateStatsFields(args);

    const now = Date.now();
    return await ctx.db.insert("playerStats", {
      teamId,
      playerId: args.playerId,
      matchDate: args.matchDate,
      opponent: args.opponent,
      minutesPlayed: args.minutesPlayed,
      goals: args.goals,
      assists: args.assists,
      yellowCards: args.yellowCards,
      redCards: args.redCards,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update an existing stats entry. Admin only.
 *
 * AC #9: Patches all fields + updatedAt.
 * AC #14: Team-scoped via requireRole.
 */
export const updatePlayerStats = mutation({
  args: {
    statsId: v.id("playerStats"),
    matchDate: v.number(),
    opponent: v.string(),
    minutesPlayed: v.number(),
    goals: v.number(),
    assists: v.number(),
    yellowCards: v.number(),
    redCards: v.number(),
  },
  handler: async (ctx, args) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    await getTeamResource(ctx, teamId, "playerStats", args.statsId);

    validateStatsFields(args);

    await ctx.db.patch(args.statsId, {
      matchDate: args.matchDate,
      opponent: args.opponent,
      minutesPlayed: args.minutesPlayed,
      goals: args.goals,
      assists: args.assists,
      yellowCards: args.yellowCards,
      redCards: args.redCards,
      updatedAt: Date.now(),
    });

    return args.statsId;
  },
});

/**
 * Delete a stats entry. Admin only.
 *
 * AC #11: Removes the playerStats document.
 * AC #14: Team-scoped via requireRole.
 */
export const deletePlayerStats = mutation({
  args: {
    statsId: v.id("playerStats"),
  },
  handler: async (ctx, { statsId }) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    await getTeamResource(ctx, teamId, "playerStats", statsId);

    await ctx.db.delete(statsId);
  },
});

// ---------------------------------------------------------------------------
// Player status management (Story 5.6 AC #2, #14, #16)
// ---------------------------------------------------------------------------

/**
 * Change a player's status. Admin only.
 *
 * Story 5.6 AC #2: Validates player ownership, status value, and deduplication.
 * Handles account deactivation/reactivation side effects based on new status.
 * Story 5.6 AC #14: Team-scoped via requireRole.
 * Story 5.6 AC #16: Updates `updatedAt` timestamp.
 */
export const updatePlayerStatus = mutation({
  args: {
    playerId: v.id("players"),
    status: v.string(),
  },
  handler: async (ctx, { playerId, status }) => {
    const { user, teamId } = await requireRole(ctx, ["admin"]);

    const player = await getTeamResource(ctx, teamId, "players", playerId);

    if (!(PLAYER_STATUSES as readonly string[]).includes(status)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Status must be active, onLoan, or leftClub",
      });
    }

    if (player.status === status) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Player already has this status",
      });
    }

    // Update player status
    await ctx.db.patch(playerId, { status, updatedAt: Date.now() });

    // Handle account side effects (AC #2)
    if (player.userId) {
      const linkedUser = await ctx.db.get(player.userId);
      if (linkedUser) {
        if (status === "leftClub") {
          // Deactivate account — uses `banned` field checked by @convex-dev/auth
          await ctx.db.patch(player.userId, { banned: true });
        } else if (linkedUser.banned) {
          // Reactivate account (active or onLoan)
          await ctx.db.patch(player.userId, { banned: false });
        }
      }
    }

    return playerId;
  },
});

// ---------------------------------------------------------------------------
// Player self-service (Story 5.6 AC #10, #14)
// ---------------------------------------------------------------------------

/**
 * Update the authenticated player's own contact information.
 *
 * Story 5.6 AC #10: Derives playerId from auth — no playerId param.
 * Only contact fields are accepted (phone, personalEmail, address,
 * emergency contact fields). All other fields are immutable via this mutation.
 * Story 5.6 AC #14: Team-scoped via requireAuth + userId lookup.
 */
export const updateOwnContactInfo = mutation({
  args: {
    phone: v.optional(v.string()),
    personalEmail: v.optional(v.string()),
    address: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactRelationship: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireAuth(ctx);

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!player || player.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "No player profile linked to your account",
      });
    }

    // Validate email format if provided and non-empty
    if (args.personalEmail && args.personalEmail.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(args.personalEmail)) {
        throw new ConvexError({
          code: "VALIDATION_ERROR" as const,
          message: "Invalid email format",
        });
      }
    }

    // Validate field lengths (max 500 characters)
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === "string" && value.length > 500) {
        throw new ConvexError({
          code: "VALIDATION_ERROR" as const,
          message: `${key} cannot exceed 500 characters`,
        });
      }
    }

    // Build patch with only provided fields
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.phone !== undefined) patch.phone = args.phone || undefined;
    if (args.personalEmail !== undefined) patch.personalEmail = args.personalEmail || undefined;
    if (args.address !== undefined) patch.address = args.address || undefined;
    if (args.emergencyContactName !== undefined) patch.emergencyContactName = args.emergencyContactName || undefined;
    if (args.emergencyContactRelationship !== undefined) patch.emergencyContactRelationship = args.emergencyContactRelationship || undefined;
    if (args.emergencyContactPhone !== undefined) patch.emergencyContactPhone = args.emergencyContactPhone || undefined;

    await ctx.db.patch(player._id, patch);
    return player._id;
  },
});

/**
 * Update any player's contact information. Admin only.
 *
 * Story 12.3 AC #4: Mirrors updateOwnContactInfo validation but uses
 * requireRole(["admin"]) and accepts a playerId argument.
 * Story 12.3 AC #7: Same validation rules as self-service.
 * Story 12.3 AC #14: Team-scoped via getTeamResource.
 */
export const updatePlayerContactInfo = mutation({
  args: {
    playerId: v.id("players"),
    phone: v.optional(v.string()),
    personalEmail: v.optional(v.string()),
    address: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactRelationship: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    await getTeamResource(ctx, teamId, "players", args.playerId);

    // Validate email format if provided and non-empty
    if (args.personalEmail && args.personalEmail.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(args.personalEmail)) {
        throw new ConvexError({
          code: "VALIDATION_ERROR" as const,
          message: "Invalid email format",
        });
      }
    }

    // Validate field lengths (max 500 characters)
    const { playerId: _pid, ...fields } = args;
    for (const [key, value] of Object.entries(fields)) {
      if (typeof value === "string" && value.length > 500) {
        throw new ConvexError({
          code: "VALIDATION_ERROR" as const,
          message: `${key} cannot exceed 500 characters`,
        });
      }
    }

    // Build patch with only provided fields
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.phone !== undefined) patch.phone = args.phone || undefined;
    if (args.personalEmail !== undefined) patch.personalEmail = args.personalEmail || undefined;
    if (args.address !== undefined) patch.address = args.address || undefined;
    if (args.emergencyContactName !== undefined) patch.emergencyContactName = args.emergencyContactName || undefined;
    if (args.emergencyContactRelationship !== undefined) patch.emergencyContactRelationship = args.emergencyContactRelationship || undefined;
    if (args.emergencyContactPhone !== undefined) patch.emergencyContactPhone = args.emergencyContactPhone || undefined;

    await ctx.db.patch(args.playerId, patch);
    return args.playerId;
  },
});

// ---------------------------------------------------------------------------
// GDPR Player Deletion (Story 12.3 AC #8, #9, #14, #15)
// ---------------------------------------------------------------------------

/**
 * Permanently delete a player and ALL associated data (GDPR right to erasure).
 * Admin only. Cascade-deletes across 13+ tables plus auth records.
 *
 * Story 12.3 AC #8: Hard cascade deletion — irreversible.
 * Story 12.3 AC #9: Handles missing data gracefully (no records = no error).
 * Story 12.3 AC #14: Team-scoped via getTeamResource.
 * Story 12.3 AC #15: Cleans up authSessions and authAccounts.
 */
export const deletePlayer = mutation({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, { playerId }) => {
    const { user, teamId } = await requireRole(ctx, ["admin"]);

    const player = await getTeamResource(ctx, teamId, "players", playerId);

    // Prevent admin from deleting themselves
    if (player.userId && player.userId === user._id) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "You cannot delete your own player profile.",
      });
    }

    // -----------------------------------------------------------------------
    // 1. Delete player-linked records (by playerId index)
    // -----------------------------------------------------------------------

    // playerStats
    const stats = await ctx.db
      .query("playerStats")
      .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
      .collect();
    for (const doc of stats) {
      await ctx.db.delete(doc._id);
    }

    // playerFitness
    const fitness = await ctx.db
      .query("playerFitness")
      .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
      .collect();
    for (const doc of fitness) {
      await ctx.db.delete(doc._id);
    }

    // playerInjuries
    const injuries = await ctx.db
      .query("playerInjuries")
      .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
      .collect();
    for (const doc of injuries) {
      await ctx.db.delete(doc._id);
    }

    // contracts (+ storage files)
    const contracts = await ctx.db
      .query("contracts")
      .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
      .collect();
    for (const contract of contracts) {
      // Storage file may have been deleted already — ignore errors
      try {
        await ctx.storage.delete(contract.fileId);
      } catch {
        // File already deleted or missing — safe to ignore
      }
      await ctx.db.delete(contract._id);
    }

    // playerInvites
    const invites = await ctx.db
      .query("playerInvites")
      .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
      .collect();
    for (const doc of invites) {
      await ctx.db.delete(doc._id);
    }

    // -----------------------------------------------------------------------
    // 2. Delete user-linked records (only if player has a linked userId)
    // -----------------------------------------------------------------------

    if (player.userId) {
      const userId = player.userId;

      // calendarEventUsers
      const eventUsers = await ctx.db
        .query("calendarEventUsers")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();
      for (const doc of eventUsers) {
        await ctx.db.delete(doc._id);
      }

      // eventRsvps (no direct userId-only index — use filter)
      const rsvps = await ctx.db
        .query("eventRsvps")
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();
      for (const doc of rsvps) {
        await ctx.db.delete(doc._id);
      }

      // documentReads (no direct userId-only index — use filter)
      const docReads = await ctx.db
        .query("documentReads")
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();
      for (const doc of docReads) {
        await ctx.db.delete(doc._id);
      }

      // documentUserPermissions
      const docPerms = await ctx.db
        .query("documentUserPermissions")
        .withIndex("by_userId_teamId", (q) =>
          q.eq("userId", userId).eq("teamId", teamId)
        )
        .collect();
      for (const doc of docPerms) {
        await ctx.db.delete(doc._id);
      }

      // notifications
      const notifs = await ctx.db
        .query("notifications")
        .withIndex("by_userId_teamId", (q) =>
          q.eq("userId", userId).eq("teamId", teamId)
        )
        .collect();
      for (const doc of notifs) {
        await ctx.db.delete(doc._id);
      }

      // userPinnedDashboards
      const pinned = await ctx.db
        .query("userPinnedDashboards")
        .withIndex("by_userId_teamId", (q) =>
          q.eq("userId", userId).eq("teamId", teamId)
        )
        .collect();
      for (const doc of pinned) {
        await ctx.db.delete(doc._id);
      }

      // userRecentDashboards
      const recent = await ctx.db
        .query("userRecentDashboards")
        .withIndex("by_userId_teamId", (q) =>
          q.eq("userId", userId).eq("teamId", teamId)
        )
        .collect();
      for (const doc of recent) {
        await ctx.db.delete(doc._id);
      }

      // feedback
      const feedbackDocs = await ctx.db
        .query("feedback")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const doc of feedbackDocs) {
        await ctx.db.delete(doc._id);
      }

      // -------------------------------------------------------------------
      // 3. Delete auth records (authSessions, authAccounts)
      // -------------------------------------------------------------------

      const sessions = await ctx.db
        .query("authSessions")
        .withIndex("userId", (q) => q.eq("userId", userId))
        .collect();
      for (const session of sessions) {
        await ctx.db.delete(session._id);
      }

      const accounts = await ctx.db
        .query("authAccounts")
        .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
        .collect();
      for (const account of accounts) {
        await ctx.db.delete(account._id);
      }

      // -------------------------------------------------------------------
      // 4. Delete the user document
      // -------------------------------------------------------------------
      await ctx.db.delete(userId);
    }

    // -----------------------------------------------------------------------
    // 5. Delete the player document itself
    // -----------------------------------------------------------------------
    await ctx.db.delete(playerId);

    return { success: true, deletedPlayerId: playerId };
  },
});

/**
 * Create a new player profile. Admin only.
 *
 * AC #4: Accepts all bio fields, validates squad number uniqueness,
 * inserts with status "active" and userId undefined.
 * AC #14: Team-scoped via requireRole → requireAuth.
 */
export const createPlayer = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    photo: v.optional(v.string()),
    dateOfBirth: v.optional(v.number()),
    nationality: v.optional(v.string()),
    position: v.string(),
    squadNumber: v.optional(v.number()),
    preferredFoot: v.optional(v.string()),
    heightCm: v.optional(v.number()),
    weightKg: v.optional(v.number()),
    phone: v.optional(v.string()),
    personalEmail: v.optional(v.string()),
    address: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactRelationship: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    // Validate position
    if (!VALID_POSITIONS.includes(args.position)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: `Invalid position "${args.position}". Must be one of: ${VALID_POSITIONS.join(", ")}.`,
      });
    }

    // Validate squad number uniqueness within team (AC #4)
    if (args.squadNumber !== undefined) {
      const existing = await ctx.db
        .query("players")
        .withIndex("by_teamId_squadNumber", (q) =>
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
    const playerId = await ctx.db.insert("players", {
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

    return playerId;
  },
});

/**
 * Update external provider links for a player. Admin only.
 *
 * Story 5.7 AC #6: Full-array replacement pattern.
 * Validates non-empty fields, unique provider names (case-insensitive),
 * trims whitespace, and patches the player document.
 * Story 5.7 AC #10: Team-scoped via requireRole.
 */
export const updateExternalProviders = mutation({
  args: {
    playerId: v.id("players"),
    externalProviderLinks: v.array(
      v.object({ provider: v.string(), accountId: v.string() })
    ),
  },
  handler: async (ctx, { playerId, externalProviderLinks }) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    await getTeamResource(ctx, teamId, "players", playerId);

    // Validate each entry: non-empty after trimming
    for (const link of externalProviderLinks) {
      if (!link.provider.trim() || !link.accountId.trim()) {
        throw new ConvexError({
          code: "VALIDATION_ERROR" as const,
          message: "Provider name and account ID are required",
        });
      }
    }

    // Validate uniqueness (case-insensitive)
    const seen = new Set<string>();
    for (const link of externalProviderLinks) {
      const key = link.provider.trim().toLowerCase();
      if (seen.has(key)) {
        throw new ConvexError({
          code: "VALIDATION_ERROR" as const,
          message: `Duplicate provider name: ${link.provider.trim()}`,
        });
      }
      seen.add(key);
    }

    // Normalize: trim whitespace
    const normalizedLinks = externalProviderLinks.map((link) => ({
      provider: link.provider.trim(),
      accountId: link.accountId.trim(),
    }));

    await ctx.db.patch(playerId, {
      externalProviderLinks: normalizedLinks,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Invite a player to create their account. Admin only.
 *
 * AC #8: Validates player has personalEmail, generates token,
 * creates playerInvites record, schedules email.
 * AC #13: Invalidates existing pending invites before creating new one.
 * AC #14: Team-scoped.
 */
export const invitePlayer = mutation({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    const player = await getTeamResource(ctx, teamId, "players", args.playerId);

    // Validate player has personalEmail
    if (!player.personalEmail) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message:
          "Player does not have a personal email address. Add an email before sending an invitation.",
      });
    }

    // Invalidate any existing pending invites (AC #13)
    const existingInvites = await ctx.db
      .query("playerInvites")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .collect();

    for (const invite of existingInvites) {
      if (invite.status === "pending") {
        await ctx.db.patch(invite._id, { status: "expired" });
      }
    }

    // Generate unique token
    const token = crypto.randomUUID();
    const now = Date.now();

    const inviteId = await ctx.db.insert("playerInvites", {
      teamId,
      playerId: args.playerId,
      email: player.personalEmail,
      token,
      status: "pending",
      createdAt: now,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Schedule email (AC #10)
    await ctx.scheduler.runAfter(
      0,
      internal.emails.sendPlayerInviteEmail,
      {
        to: player.personalEmail,
        firstName: player.firstName,
        token,
      }
    );

    return inviteId;
  },
});

/**
 * Accept a player invitation and create/link user account.
 *
 * AC #11: Validates token, creates user account, links to player profile,
 * marks invite as accepted.
 *
 * NOTE: This mutation is called AFTER the user has already signed up
 * via @convex-dev/auth (signIn with flow:"signUp"). It patches the
 * newly created user with role:"player" and teamId, then links to
 * the player profile.
 */
export const acceptPlayerInvite = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the currently authenticated user (just signed up via auth)
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

    // Validate the invite token
    const invite = await ctx.db
      .query("playerInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
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
      // Mark as expired
      await ctx.db.patch(invite._id, { status: "expired" });
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "This invitation has expired. Please ask your club admin to send a new one.",
      });
    }

    // Verify the authenticated user's email matches the invite email
    // to prevent token hijacking by a different signed-in user
    if (user.email !== invite.email) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Your email does not match the invitation email.",
      });
    }

    // Get the player to obtain teamId
    const player = await ctx.db.get(invite.playerId);
    if (!player) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Player profile not found.",
      });
    }

    // Patch user with player role and team
    await ctx.db.patch(userId, {
      role: "player",
      teamId: player.teamId,
      name: `${player.firstName} ${player.lastName}`,
      status: "active",
      hasCompletedOnboarding: true,
    });

    // Link user to player profile
    await ctx.db.patch(invite.playerId, {
      userId,
      updatedAt: Date.now(),
    });

    // Mark invite as accepted
    await ctx.db.patch(invite._id, { status: "accepted" });

    return { success: true, userId };
  },
});
