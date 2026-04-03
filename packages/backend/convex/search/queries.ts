import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

type SearchResultItem = {
  id: Id<any>;
  type: string;
  title: string;
  subtitle: string;
  href: string;
  icon: string;
};

// ---------------------------------------------------------------------------
// globalSearch — Story 11.1: Command-palette search across all entities
// ---------------------------------------------------------------------------

export const globalSearch = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireAuth(ctx);

    const role = user.role;
    const empty = {
      dashboards: [],
      documents: [],
      players: [],
      calendarEvents: [],
      contracts: [],
    };

    if (!role) return empty;

    const term = args.searchTerm.trim().toLowerCase();
    if (term.length < 2) return empty;

    const MAX_RESULTS = 10;
    // Cap the number of raw rows loaded per table to bound memory & CPU.
    const TABLE_SCAN_LIMIT = 500;

    // Helper: case-insensitive partial match
    const matches = (value: string | null | undefined) =>
      value?.toLowerCase().includes(term) ?? false;

    // 1. Dashboards — role-filtered via roleDashboards (slug-based)
    const roleAssignments = await ctx.db
      .query("roleDashboards")
      .withIndex("by_teamId_role", (q) =>
        q.eq("teamId", teamId).eq("role", role)
      )
      .collect();
    const allowedSlugs = new Set(
      roleAssignments.map((ra) => ra.dashboardSlug)
    );

    const allDashboards = await ctx.db
      .query("dashboards")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .take(TABLE_SCAN_LIMIT);

    const dashboards = allDashboards
      .filter(
        (d) =>
          allowedSlugs.has(d.slug) &&
          (matches(d.title) || matches(d.description))
      )
      .slice(0, MAX_RESULTS)
      .map((d) => ({
        id: d._id,
        type: "dashboard" as const,
        title: d.title,
        subtitle: d.category ?? "",
        href: `/dashboards/${d.slug}`,
        icon: "IconLayoutDashboard",
      }));

    // 2. Documents — role-filtered via permittedRoles
    const allDocuments = await ctx.db
      .query("documents")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .take(TABLE_SCAN_LIMIT);

    const documents = allDocuments
      .filter((d) => {
        if (!matches(d.name)) return false;
        if (
          d.permittedRoles &&
          Array.isArray(d.permittedRoles) &&
          d.permittedRoles.length > 0
        ) {
          return d.permittedRoles.includes(role);
        }
        return true;
      })
      .slice(0, MAX_RESULTS)
      .map((d) => ({
        id: d._id,
        type: "document" as const,
        title: d.name,
        subtitle: d.extension ? `.${d.extension}` : "",
        href: `/documents?fileId=${d._id}`,
        icon: "IconFileText",
      }));

    // 3. Players — visible to all team members
    const allPlayers = await ctx.db
      .query("players")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .take(TABLE_SCAN_LIMIT);

    const players = allPlayers
      .filter(
        (p) =>
          matches(p.firstName) ||
          matches(p.lastName) ||
          matches(`${p.firstName} ${p.lastName}`) ||
          matches(p.position) ||
          matches(p.squadNumber != null ? String(p.squadNumber) : undefined)
      )
      .slice(0, MAX_RESULTS)
      .map((p) => ({
        id: p._id,
        type: "player" as const,
        title: `${p.firstName} ${p.lastName}`,
        subtitle: [p.position, p.squadNumber ? `#${p.squadNumber}` : null]
          .filter(Boolean)
          .join(" · "),
        href: `/players/${p._id}`,
        icon: "IconUsers",
      }));

    // 4. Calendar Events — role-filtered, exclude cancelled
    const allEvents = await ctx.db
      .query("calendarEvents")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .take(TABLE_SCAN_LIMIT);

    const calendarEvents = allEvents
      .filter((e) => {
        if (e.isCancelled) return false;
        if (!matches(e.name) && !matches(e.eventType)) return false;
        // Check invitedRoles if present
        if (
          e.invitedRoles &&
          Array.isArray(e.invitedRoles) &&
          e.invitedRoles.length > 0
        ) {
          return e.invitedRoles.includes(role);
        }
        return true;
      })
      .slice(0, MAX_RESULTS)
      .map((e) => ({
        id: e._id,
        type: "calendarEvent" as const,
        title: e.name,
        subtitle: e.eventType ?? "",
        href: `/calendar?eventId=${e._id}`,
        icon: "IconCalendar",
      }));

    // 5. Contracts — admin only
    let contracts: SearchResultItem[] = [];
    if (role === "admin") {
      const allContracts = await ctx.db
        .query("contracts")
        .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
        .take(TABLE_SCAN_LIMIT);

      // Resolve players only for contracts that exist — deleted players → null
      const contractsWithPlayers = await Promise.all(
        allContracts.map(async (c) => {
          const player = await ctx.db.get(c.playerId);
          return { contract: c, player };
        })
      );

      contracts = contractsWithPlayers
        .filter(
          ({ player }) =>
            player !== null &&
            (matches(player.firstName) ||
              matches(player.lastName) ||
              matches(`${player.firstName} ${player.lastName}`))
        )
        .slice(0, MAX_RESULTS)
        .map(({ contract, player }) => ({
          id: contract._id,
          type: "contract" as const,
          title: player
            ? `${player.firstName} ${player.lastName}`
            : "Unknown",
          subtitle: contract.extractionStatus ?? "Contract",
          href: `/players/${contract.playerId}?tab=contracts`,
          icon: "IconContract",
        }));
    }

    return { dashboards, documents, players, calendarEvents, contracts };
  },
});
