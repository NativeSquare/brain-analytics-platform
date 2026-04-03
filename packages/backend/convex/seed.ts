import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

// ---------------------------------------------------------------------------
// Dashboard seed data (AC-3)
// ---------------------------------------------------------------------------

const DASHBOARD_SEEDS = [
  {
    slug: "season-overview",
    title: "Season Overview",
    category: "Season Analysis" as const,
    icon: "ChartColumnIncreasing",
    description:
      "Comprehensive season-level statistics including wins, draws, losses, goals scored and conceded, and points progression over time.",
  },
  {
    slug: "post-match",
    title: "Post-Match Analysis",
    category: "Match Analysis" as const,
    icon: "Activity",
    description:
      "Detailed post-match breakdown with key events, team and player performance metrics, and tactical insights from the latest fixture.",
  },
  {
    slug: "shot-map",
    title: "Shot Map",
    category: "Match Analysis" as const,
    icon: "Target",
    description:
      "Visual shot placement map showing shot locations, expected goals (xG), and conversion rates for any selected match.",
  },
  {
    slug: "heat-maps",
    title: "Heat Maps",
    category: "Player Analysis" as const,
    icon: "Map",
    description:
      "Player and team heat maps visualising positional presence and movement intensity across different phases of play.",
  },
  {
    slug: "event-map",
    title: "Event Map",
    category: "Match Analysis" as const,
    icon: "Waypoints",
    description:
      "Interactive pitch map displaying passes, tackles, interceptions, and other match events with filterable event types.",
  },
  {
    slug: "player-analysis",
    title: "Player Analysis",
    category: "Player Analysis" as const,
    icon: "Users",
    description:
      "In-depth individual player performance analysis with radar charts, per-90 metrics, and comparison tools.",
  },
  {
    slug: "set-pieces",
    title: "Set Pieces",
    category: "Set Pieces" as const,
    icon: "Flag",
    description:
      "Analyse corner kicks, free kicks, throw-ins and penalty outcomes with success rates and delivery patterns.",
  },
  {
    slug: "opposition-analysis",
    title: "Opposition Analysis",
    category: "Opposition" as const,
    icon: "Swords",
    description:
      "Scout upcoming opponents with formation tendencies, key player profiles, and historical head-to-head statistics.",
  },
  {
    slug: "team-trends",
    title: "Team Trends",
    category: "Trends" as const,
    icon: "TrendingUp",
    description:
      "Track team performance trends over time — form runs, rolling averages for key metrics, and season trajectory.",
  },
  {
    slug: "referee-analysis",
    title: "Referee Analysis",
    category: "Officials" as const,
    icon: "Shield",
    description:
      "Match official statistics including cards given, fouls awarded, penalty decisions, and tendencies by referee.",
  },
  {
    slug: "view-possessions",
    title: "Possession Analysis",
    category: "Possession" as const,
    icon: "PieChart",
    description:
      "Possession chains, territory maps, and ball retention metrics broken down by half, zone, and game state.",
  },
  {
    slug: "post-match-set-pieces",
    title: "Post-Match Set Pieces",
    category: "Set Pieces" as const,
    icon: "Flag",
    description:
      "Match-specific set piece analysis with pitch visualisation, attack/defence toggle, and video clips.",
  },
] as const;

// ---------------------------------------------------------------------------
// Default role-dashboard assignments (AC-4)
// ---------------------------------------------------------------------------

const DEFAULT_ROLE_ASSIGNMENTS: Record<string, readonly string[]> = {
  admin: DASHBOARD_SEEDS.map((d) => d.slug),
  coach: [
    "season-overview",
    "post-match",
    "shot-map",
    "heat-maps",
    "event-map",
    "player-analysis",
    "set-pieces",
    "opposition-analysis",
    "team-trends",
  ],
  analyst: DASHBOARD_SEEDS.map((d) => d.slug),
  physio: ["player-analysis", "heat-maps"],
  player: ["season-overview", "post-match", "player-analysis"],
  staff: ["season-overview", "post-match"],
};

// ---------------------------------------------------------------------------
// seedDashboards helper
// ---------------------------------------------------------------------------

async function seedDashboards(ctx: MutationCtx, teamId: Id<"teams">) {
  const now = Date.now();

  // Seed dashboard entries (idempotent by teamId + slug)
  for (const seed of DASHBOARD_SEEDS) {
    const existing = await ctx.db
      .query("dashboards")
      .withIndex("by_teamId_slug", (q) =>
        q.eq("teamId", teamId).eq("slug", seed.slug)
      )
      .first();

    if (!existing) {
      await ctx.db.insert("dashboards", {
        teamId,
        title: seed.title,
        description: seed.description,
        category: seed.category,
        icon: seed.icon,
        slug: seed.slug,
        createdAt: now,
      });
    }
  }

  // Seed role-dashboard assignments (idempotent by teamId + role + dashboardSlug)
  type RoleKey = "admin" | "coach" | "analyst" | "physio" | "player" | "staff";
  for (const [role, slugs] of Object.entries(DEFAULT_ROLE_ASSIGNMENTS) as [RoleKey, readonly string[]][]) {
    for (const slug of slugs) {
      const existing = await ctx.db
        .query("roleDashboards")
        .withIndex("by_teamId_role_dashboardSlug", (q) =>
          q
            .eq("teamId", teamId)
            .eq("role", role)
            .eq("dashboardSlug", slug)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("roleDashboards", {
          teamId,
          role,
          dashboardSlug: slug,
          createdAt: now,
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// seedDefaultData
// ---------------------------------------------------------------------------

/**
 * Seed default data: creates the "Default Club" team, patches the first admin
 * user, and populates dashboard + role-dashboard seed data.
 *
 * Idempotent — safe to run multiple times.
 *
 * How to run:
 *   - Via Convex Dashboard → "Run Function" → seed:seedDefaultData
 *   - Via CLI: npx convex run seed:seedDefaultData
 */
export const seedDefaultData = internalMutation({
  args: {},
  handler: async (ctx) => {
    // 1. Check if team already exists (idempotency)
    const existingTeam = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", "default-club"))
      .first();

    let teamId = existingTeam?._id;

    // 2. Create team if it doesn't exist
    if (!teamId) {
      teamId = await ctx.db.insert("teams", {
        name: "Default Club",
        slug: "default-club",
      });
    }

    // 3. Find the first admin user that has no teamId and patch them
    const allUsers = await ctx.db.query("users").collect();
    const adminWithoutTeam = allUsers.find(
      (u) => u.role === "admin" && !u.teamId
    );

    if (adminWithoutTeam) {
      await ctx.db.patch(adminWithoutTeam._id, {
        teamId,
        role: "admin",
        status: "active",
      });
    }

    // 4. Seed dashboards and role-dashboard assignments
    await seedDashboards(ctx, teamId);

    // 5. Seed calendar events (idempotent — check if any exist first)
    // Re-read users after potential patch above to get current teamId assignments
    const freshUsers = await ctx.db.query("users").collect();
    const adminUser = freshUsers.find((u) => u.teamId === teamId)
      ?? freshUsers[0];
    if (adminUser) {
      await seedCalendarEvents(ctx, teamId, adminUser._id);
    } else {
      console.log("[seed] No users found — skipping calendar events");
    }
  },
});

// ---------------------------------------------------------------------------
// Calendar seed data
// ---------------------------------------------------------------------------

async function seedCalendarEvents(
  ctx: MutationCtx,
  teamId: Id<"teams">,
  ownerId: Id<"users">,
) {
  // Idempotent: skip if 5+ events already exist for this team
  const existing = await ctx.db
    .query("calendarEvents")
    .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
    .take(5);
  if (existing.length >= 5) return;

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const hour = 60 * 60 * 1000;

  // Today's events
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();

  const events: Array<{
    name: string;
    eventType: "match" | "training" | "meeting" | "rehab";
    startsAt: number;
    endsAt: number;
    location?: string;
    description?: string;
    rsvpEnabled: boolean;
    invitedRoles?: string[];
  }> = [
    // Past events
    {
      name: "UC Sampdoria vs Parma Calcio",
      eventType: "match",
      startsAt: todayMs - 7 * day + 18 * hour,
      endsAt: todayMs - 7 * day + 20 * hour,
      location: "Stadio Luigi Ferraris",
      description: "Serie B - Matchday 30",
      rsvpEnabled: true,
      invitedRoles: ["admin", "coach", "player", "physio", "staff"],
    },
    {
      name: "Recovery Session",
      eventType: "training",
      startsAt: todayMs - 6 * day + 10 * hour,
      endsAt: todayMs - 6 * day + 11.5 * hour,
      location: "Centro Sportivo Mugnaini",
      description: "Light recovery after match",
      rsvpEnabled: true,
      invitedRoles: ["player", "physio"],
    },
    {
      name: "Tactical Review Meeting",
      eventType: "meeting",
      startsAt: todayMs - 5 * day + 14 * hour,
      endsAt: todayMs - 5 * day + 15 * hour,
      location: "Sala conferenze",
      description: "Post-match analysis with coaching staff",
      rsvpEnabled: false,
      invitedRoles: ["admin", "coach", "analyst"],
    },
    {
      name: "Training Session",
      eventType: "training",
      startsAt: todayMs - 4 * day + 10 * hour,
      endsAt: todayMs - 4 * day + 12 * hour,
      location: "Centro Sportivo Mugnaini",
      rsvpEnabled: true,
      invitedRoles: ["player", "coach", "physio"],
    },
    {
      name: "Training Session",
      eventType: "training",
      startsAt: todayMs - 3 * day + 10 * hour,
      endsAt: todayMs - 3 * day + 12 * hour,
      location: "Centro Sportivo Mugnaini",
      rsvpEnabled: true,
      invitedRoles: ["player", "coach", "physio"],
    },
    // Today's events
    {
      name: "Morning Training",
      eventType: "training",
      startsAt: todayMs + 9 * hour,
      endsAt: todayMs + 11 * hour,
      location: "Centro Sportivo Mugnaini",
      description: "Full squad training - focus on pressing",
      rsvpEnabled: true,
      invitedRoles: ["player", "coach", "physio"],
    },
    {
      name: "Physio Check-ups",
      eventType: "rehab",
      startsAt: todayMs + 14 * hour,
      endsAt: todayMs + 16 * hour,
      location: "Medical Center",
      description: "Weekly check-ups for squad",
      rsvpEnabled: false,
      invitedRoles: ["player", "physio"],
    },
    // Future events
    {
      name: "Training Session",
      eventType: "training",
      startsAt: todayMs + 1 * day + 10 * hour,
      endsAt: todayMs + 1 * day + 12 * hour,
      location: "Centro Sportivo Mugnaini",
      rsvpEnabled: true,
      invitedRoles: ["player", "coach", "physio"],
    },
    {
      name: "Pre-match Team Talk",
      eventType: "meeting",
      startsAt: todayMs + 2 * day + 16 * hour,
      endsAt: todayMs + 2 * day + 17 * hour,
      location: "Sala conferenze",
      description: "Final briefing before Brescia match",
      rsvpEnabled: false,
      invitedRoles: ["admin", "coach", "player"],
    },
    {
      name: "Brescia Calcio vs UC Sampdoria",
      eventType: "match",
      startsAt: todayMs + 3 * day + 18 * hour,
      endsAt: todayMs + 3 * day + 20 * hour,
      location: "Stadio Mario Rigamonti",
      description: "Serie B - Matchday 31 (Away)",
      rsvpEnabled: true,
      invitedRoles: ["admin", "coach", "player", "physio", "staff"],
    },
    {
      name: "Rehab Session - Colley",
      eventType: "rehab",
      startsAt: todayMs + 4 * day + 10 * hour,
      endsAt: todayMs + 4 * day + 11 * hour,
      location: "Medical Center",
      description: "Individual rehab - knee recovery",
      rsvpEnabled: false,
      invitedRoles: ["physio"],
    },
    {
      name: "Board Meeting",
      eventType: "meeting",
      startsAt: todayMs + 5 * day + 11 * hour,
      endsAt: todayMs + 5 * day + 13 * hour,
      location: "Sala Direttiva",
      description: "Monthly board review",
      rsvpEnabled: false,
      invitedRoles: ["admin"],
    },
  ];

  for (const evt of events) {
    await ctx.db.insert("calendarEvents", {
      teamId,
      name: evt.name,
      eventType: evt.eventType,
      startsAt: evt.startsAt,
      endsAt: evt.endsAt,
      location: evt.location,
      description: evt.description,
      ownerId,
      rsvpEnabled: evt.rsvpEnabled,
      isRecurring: false,
      isCancelled: false,
      invitedRoles: evt.invitedRoles,
      createdAt: now,
    });
  }
}
