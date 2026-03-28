import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { requireRole } from "../lib/auth";

/**
 * Valid player positions — must match shared/players.ts PLAYER_POSITIONS.
 */
const VALID_POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward"];

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
