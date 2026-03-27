# CLAUDE.md — Football Dashboard 2

## Project Overview

Multi-tenant football operations dashboard for Sampdoria. Built with Next.js App Router, TypeScript, Tailwind CSS v4, shadcn/ui, and Supabase.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Auth & DB**: Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- **Charts**: Recharts
- **Direct DB**: `pg` (node-postgres) for StatsBomb data queries

## Project Structure

```
src/
  app/
    (auth)/          # Login / auth pages
    (dashboard)/     # Authenticated dashboard shell
      admin/
      calendar/
      contracts/
      dashboards/
      documents/
      settings/
      layout.tsx
      page.tsx
    api/             # API route handlers
    auth/            # Supabase auth callback
  components/
    charts/
    dashboard/
    layout/
    theme/
    ui/
  lib/               # Utilities, Supabase clients, helpers
queries/             # Raw SQL files for StatsBomb postgres queries
supabase/
  migrations/        # Supabase schema migrations
```

## Database

Two separate databases are in use:

1. **Supabase** — App data (users, teams, roles, dashboards, documents, invitations). Access via `@supabase/supabase-js` or `@supabase/ssr`.
2. **StatsBomb Postgres** — Event/match data via MCP (`mcp__statsbomb_db__execute_sql`, `mcp__statsbomb_db__search_objects`). Key schema: `silver`.

### Silver Schema Tables (StatsBomb)

Core: `competitions`, `matches`, `lineups`, `events`
Event types: `event_passes`, `event_shots`, `event_carries`, `event_dribbles`, `event_duels`, `event_pressures`, `event_goalkeeper_actions`, `event_substitutions`, `event_tactics`, etc.
Aggregated: `player_match_stats`, `player_season_stats`, `player_shifts`, `team_match_stats`, `team_season_stats`

### Gold Schema Tables (StatsBomb)

Curated business-ready tables: `competitions`, `seasons`, `teams`, `players`, `team_matches`, `player_matches`, `match_expected_stats`, `match_period_stats`, `possessions`, `set_pieces`

### Full Schema Reference

See **`DATABASE_SCHEMA.md`** at the project root for a complete column-level description of every table in both `silver` and `gold` schemas, including data types, descriptions, key metrics, and example query patterns. **Always consult this file before writing StatsBomb queries.**

SQL queries are stored in `/queries/*.sql`.

## Key Conventions

- Use the App Router — no Pages Router.
- Server Components by default; add `"use client"` only when needed.
- Supabase Row Level Security enforces team isolation — always use the appropriate Supabase client (server vs browser).
- shadcn/ui components live in `src/components/ui/`.
- Run dev: `npm run dev` | Lint: `npm run lint` | Build: `npm run build --webpack`

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLIC_KEY
NEXT_PUBLIC_SITE_URL
SUPABASE_SECRET_KEY
```

## MCP Tools Available

- `mcp__statsbomb_db__execute_sql` — run SQL against StatsBomb postgres
- `mcp__statsbomb_db__search_objects` — search schemas/tables/columns
- `mcp__claude_ai_Supabase__*` — Supabase project management (migrations, SQL, etc.)
