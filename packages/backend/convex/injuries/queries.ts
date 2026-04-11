import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive the football season label from a timestamp.
 * Football seasons run Aug–Jul: Oct 2025 → "2025/26", Mar 2026 → "2025/26".
 *
 * Exported for testability and reuse.
 */
export function getFootballSeason(dateMs: number): string {
  const d = new Date(dateMs);
  const month = d.getUTCMonth(); // 0-indexed: 0=Jan, 7=Aug
  const year = d.getUTCFullYear();

  if (month >= 7) {
    // Aug (7) through Dec (11) → season starts this year
    const endYear = (year + 1) % 100;
    return `${year}/${endYear.toString().padStart(2, "0")}`;
  } else {
    // Jan (0) through Jul (6) → season started previous year
    const startYear = year - 1;
    const endYear = year % 100;
    return `${startYear}/${endYear.toString().padStart(2, "0")}`;
  }
}

/**
 * Compute days between two timestamps, rounding up.
 */
function computeDaysLost(startMs: number, endMs: number): number {
  const diff = endMs - startMs;
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86400000);
}

// ---------------------------------------------------------------------------
// canViewInjuryDetails — AC1 (Story 14.4)
// ---------------------------------------------------------------------------

/**
 * Returns true if the authenticated user can view injury clinical details.
 * True for admin and physio; false for all other roles.
 * Uses requireAuth (not requireRole) so non-medical users get false, not error.
 */
export const canViewInjuryDetails = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);
    return user.role === "admin" || user.role === "physio";
  },
});

// ---------------------------------------------------------------------------
// getPlayerInjuryDetails — AC2 (Story 14.4)
// ---------------------------------------------------------------------------

/**
 * Returns full injury data for a player, or null for unauthorized users.
 * Null-return pattern (Story 6.2) — no error thrown for non-medical roles.
 */
export const getPlayerInjuryDetails = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const { user, teamId } = await requireAuth(ctx);

    // Role check — return null, not error
    if (user.role !== "admin" && user.role !== "physio") {
      return null;
    }

    // Team-scoped check
    const player = await ctx.db.get(playerId);
    if (!player || player.teamId !== teamId) {
      return null;
    }

    const injuries = await ctx.db
      .query("playerInjuries")
      .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
      .collect();

    // Sort by date descending (most recent first)
    return injuries.sort((a, b) => b.date - a.date);
  },
});

// ---------------------------------------------------------------------------
// getInjuryReportByPlayer — AC5 (Story 14.4)
// ---------------------------------------------------------------------------

/**
 * Admin-only aggregate report: injuries per player.
 * Returns null for non-admin users.
 */
export const getInjuryReportByPlayer = query({
  args: {},
  handler: async (ctx) => {
    const { user, teamId } = await requireAuth(ctx);
    if (user.role !== "admin") return null;

    const injuries = await ctx.db
      .query("playerInjuries")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();

    const players = await ctx.db
      .query("players")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();

    // Build player name map
    const playerMap = new Map(
      players.map((p) => [p._id, `${p.firstName} ${p.lastName}`])
    );

    // Group injuries by playerId
    const grouped = new Map<
      string,
      { totalInjuries: number; totalDaysLost: number; currentlyInjured: boolean }
    >();

    const now = Date.now();
    for (const injury of injuries) {
      const pid = injury.playerId;
      const existing = grouped.get(pid) ?? {
        totalInjuries: 0,
        totalDaysLost: 0,
        currentlyInjured: false,
      };

      existing.totalInjuries += 1;

      const endDate = injury.clearanceDate ?? now;
      existing.totalDaysLost += computeDaysLost(injury.date, endDate);

      if (
        injury.status !== "cleared" &&
        injury.status !== "recovered"
      ) {
        existing.currentlyInjured = true;
      }

      grouped.set(pid, existing);
    }

    // Build result array — only players with injury records
    const result = Array.from(grouped.entries())
      .map(([playerId, data]) => ({
        playerId,
        playerName: playerMap.get(playerId as any) ?? "Unknown",
        totalInjuries: data.totalInjuries,
        totalDaysLost: data.totalDaysLost,
        currentlyInjured: data.currentlyInjured,
      }))
      .sort((a, b) => b.totalDaysLost - a.totalDaysLost);

    return result;
  },
});

// ---------------------------------------------------------------------------
// getInjuryReportBySeason — AC6 (Story 14.4)
// ---------------------------------------------------------------------------

/**
 * Admin-only aggregate report: injuries per football season.
 * Returns null for non-admin users.
 */
export const getInjuryReportBySeason = query({
  args: {},
  handler: async (ctx) => {
    const { user, teamId } = await requireAuth(ctx);
    if (user.role !== "admin") return null;

    const injuries = await ctx.db
      .query("playerInjuries")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();

    // Group by season
    const grouped = new Map<
      string,
      { totalInjuries: number; totalDaysLost: number }
    >();

    const now = Date.now();
    for (const injury of injuries) {
      const season = getFootballSeason(injury.date);
      const existing = grouped.get(season) ?? {
        totalInjuries: 0,
        totalDaysLost: 0,
      };

      existing.totalInjuries += 1;
      const endDate = injury.clearanceDate ?? now;
      existing.totalDaysLost += computeDaysLost(injury.date, endDate);

      grouped.set(season, existing);
    }

    // Sort by season descending
    const result = Array.from(grouped.entries())
      .map(([season, data]) => ({
        season,
        totalInjuries: data.totalInjuries,
        totalDaysLost: data.totalDaysLost,
      }))
      .sort((a, b) => b.season.localeCompare(a.season));

    return result;
  },
});

// ---------------------------------------------------------------------------
// getInjuryReportByType — AC7 (Story 14.4)
// ---------------------------------------------------------------------------

/**
 * Admin-only aggregate report: injuries grouped by type.
 * Returns null for non-admin users.
 */
export const getInjuryReportByType = query({
  args: {},
  handler: async (ctx) => {
    const { user, teamId } = await requireAuth(ctx);
    if (user.role !== "admin") return null;

    const injuries = await ctx.db
      .query("playerInjuries")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();

    // Group by injuryType (case-insensitive key, first-occurrence display)
    const grouped = new Map<
      string,
      { displayName: string; count: number; totalDaysLost: number }
    >();

    const now = Date.now();
    for (const injury of injuries) {
      const key = injury.injuryType.toLowerCase();
      const existing = grouped.get(key) ?? {
        displayName: injury.injuryType,
        count: 0,
        totalDaysLost: 0,
      };

      existing.count += 1;
      const endDate = injury.clearanceDate ?? now;
      existing.totalDaysLost += computeDaysLost(injury.date, endDate);

      grouped.set(key, existing);
    }

    // Build result with avgDaysLost rounded to 1 decimal
    const result = Array.from(grouped.values())
      .map((data) => ({
        injuryType: data.displayName,
        count: data.count,
        totalDaysLost: data.totalDaysLost,
        avgDaysLost: Math.round((data.totalDaysLost / data.count) * 10) / 10,
      }))
      .sort((a, b) => b.count - a.count);

    return result;
  },
});
