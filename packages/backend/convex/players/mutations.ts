import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { requireAuth, requireRole } from "../lib/auth";
import { INJURY_SEVERITIES, INJURY_STATUSES, PLAYER_STATUSES } from "@packages/shared/players";

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

    const player = await ctx.db.get(args.playerId);
    if (!player || player.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Player not found",
      });
    }

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

    const entry = await ctx.db.get(args.fitnessId);
    if (!entry || entry.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Fitness entry not found",
      });
    }

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

    const entry = await ctx.db.get(fitnessId);
    if (!entry || entry.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Fitness entry not found",
      });
    }

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

  // Validate status if provided (using shared constants)
  if (args.status !== undefined && !(INJURY_STATUSES as readonly string[]).includes(args.status)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Status must be current or recovered",
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
    estimatedRecovery: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireRole(ctx, ["admin", "physio"]);

    const player = await ctx.db.get(args.playerId);
    if (!player || player.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Player not found",
      });
    }

    validateInjuryFields(args);

    const now = Date.now();
    return await ctx.db.insert("playerInjuries", {
      teamId,
      playerId: args.playerId,
      date: args.date,
      injuryType: args.injuryType,
      severity: args.severity,
      estimatedRecovery: args.estimatedRecovery,
      notes: args.notes,
      status: "current",
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
    estimatedRecovery: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.string(),
    clearanceDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { teamId } = await requireRole(ctx, ["admin", "physio"]);

    const entry = await ctx.db.get(args.injuryId);
    if (!entry || entry.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Injury entry not found",
      });
    }

    validateInjuryFields({
      injuryType: args.injuryType,
      severity: args.severity,
      estimatedRecovery: args.estimatedRecovery,
      notes: args.notes,
      status: args.status,
    });

    await ctx.db.patch(args.injuryId, {
      date: args.date,
      injuryType: args.injuryType,
      severity: args.severity,
      estimatedRecovery: args.estimatedRecovery,
      notes: args.notes,
      status: args.status,
      clearanceDate: args.clearanceDate,
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

    const entry = await ctx.db.get(injuryId);
    if (!entry || entry.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Injury entry not found",
      });
    }

    await ctx.db.delete(injuryId);
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

    const player = await ctx.db.get(args.playerId);
    if (!player || player.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Player not found",
      });
    }

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

    const stats = await ctx.db.get(args.statsId);
    if (!stats || stats.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Stats entry not found",
      });
    }

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

    const stats = await ctx.db.get(statsId);
    if (!stats || stats.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Stats entry not found",
      });
    }

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

    const player = await ctx.db.get(playerId);
    if (!player || player.teamId !== teamId) {
      throw new ConvexError({ code: "NOT_FOUND" as const, message: "Player not found" });
    }

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

    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Player not found.",
      });
    }

    // Validate team match
    if (player.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_AUTHORIZED" as const,
        message: "Player does not belong to your team.",
      });
    }

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
