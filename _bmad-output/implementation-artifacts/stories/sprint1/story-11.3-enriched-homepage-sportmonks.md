# Story 11.3: Enriched Homepage with SportMonks Data

Status: draft
Story Type: fullstack
Points: 8

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` -- that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`. SportMonks data is fetched from the admin app's API routes (`apps/admin/app/api/sportmonks/`) via internal HTTP calls or client-side fetch.

> **IMPORTANT: Before creating ANY custom component, check if a shadcn/ui component exists that can be used or extended. Use `npx shadcn@latest add <component>` to install missing shadcn components. Only create custom components when no suitable shadcn component exists.**

## Story

As an authenticated user,
I want the homepage to display a live match countdown to the next fixture, recent match results with scores, upcoming fixtures, and quick access to my recent and pinned dashboards,
so that I get an immediate overview of the team's schedule, performance, and my most-used analytics tools upon logging in.

## Epic Context

**Epic 11 -- Cross-Cutting Features:** Features that span multiple modules and enhance the overall user experience. This story enriches the homepage with live data from SportMonks and integrates the pin/recent dashboard tracking from Epic 7.

**Dependencies:**
- **Story 2.3** (existing homepage with module widgets) -- provides the current homepage at `apps/web/src/app/(app)/page.tsx` and any existing layout/widgets.
- **Story 8.2** (SportMonks PostgreSQL Connection & API Routes) -- provides `/api/sportmonks/fixtures` and `/api/sportmonks/teams` API routes that supply fixture data.
- **Story 7.4** (Port Dashboard Cards, Gallery Grid & Pin/Recent Tracking) -- provides `userPinnedDashboards` and `userRecentDashboards` Convex tables, queries (`getUserPinnedDashboards`, `getUserRecentDashboards`), and `<DashboardCardItem />` component.
- **Story 9.1** (Dashboard Gallery Page & Role-Based Access Control) -- provides the `/dashboards` route and dashboard registry that analytics cards link to.

**Source files (reference implementation in `football-dashboard-2`):**
- `src/app/(dashboard)/page.tsx` -- homepage with match countdown, recent results, upcoming fixtures, recent/pinned dashboards

**Architecture difference:** We use Convex for pin/recent tracking (not Supabase). SportMonks data comes from Next.js API routes (Story 8.2) via client-side fetch. The current homepage (`apps/web/src/app/(app)/page.tsx`) currently redirects to `/dashboards` -- this story replaces that redirect with a full homepage.

---

## Acceptance Criteria (BDD)

### AC-1: Homepage renders at `/` (app root) instead of redirecting

**Given** the user is authenticated and navigates to the app root (`/`)
**When** the page loads
**Then** the homepage renders a full dashboard page (NOT a redirect to `/dashboards`)
**And** the page title is "Home" or "Dashboard"
**And** loading skeletons are shown for each section while data is being fetched
**And** the page layout follows this vertical order:
  1. Match Countdown (hero section, prominent)
  2. Grid row: Today's Events | Recent Results | Upcoming Fixtures
  3. Row: Recent Dashboards + Pinned Dashboards
  4. Row: Quick access cards (Calendar, Documents, Players, Dashboards)

### AC-2: Live Match Countdown widget (hero section)

**Given** the homepage is loaded
**When** the `MatchCountdown` component fetches the next upcoming fixture from `/api/sportmonks/fixtures?teamId={sampdoriaTeamId}&status=upcoming&limit=1`
**Then** the widget renders in a hero-style card at the top of the page with:
  - Opponent team name
  - Opponent team logo (from the `logoUrl` field in the fixture or fetched via `/api/sportmonks/teams?teamId={opponentTeamId}`)
  - Competition name (e.g., "Serie A", "Coppa Italia")
  - Match date and time (formatted as locale-aware string, e.g., "Sat 5 Apr 2026, 18:00")
  - Venue name (if available in fixture data)
  - Home/Away indicator (text badge: "HOME" or "AWAY")
  - Countdown timer displaying days, hours, minutes until kickoff
**And** the countdown timer updates every 60 seconds (using `setInterval` or equivalent)
**And** when the match time has passed (countdown reaches zero), the widget shows "Match in progress" or "Match started" instead of a negative countdown
**And** the widget uses a visually prominent design (larger card, distinct background, e.g., `primary/5` or gradient)

### AC-3: Match Countdown fallback to calendar events

**Given** the homepage is loaded
**When** the SportMonks fixtures API call fails (network error, 503, or returns empty results)
**Then** the `MatchCountdown` component falls back to the nearest future calendar event of type "Match" from the existing Convex calendar query
**And** the fallback widget shows: event title, date/time, countdown timer
**And** the fallback widget does NOT show opponent logo or competition name (data not available from calendar)
**And** a subtle indicator (e.g., muted text "From calendar") distinguishes the fallback from live data
**And** no error message is shown to the user -- the fallback is seamless

### AC-4: Recent Results section

**Given** the homepage is loaded
**When** the `RecentResults` component fetches the last finished fixtures from `/api/sportmonks/fixtures?teamId={sampdoriaTeamId}&status=finished&limit=5`
**Then** the section renders a list/card group titled "Recent Results" showing up to 5 match results
**And** each result row displays:
  - Match date (formatted as short date, e.g., "29 Mar")
  - Opponent team logo (small, 24-32px)
  - Opponent team name
  - Final score (e.g., "2 - 1") with Sampdoria's score always on the left
  - Result indicator color-coded:
    - **Win**: green background/badge (e.g., `bg-green-500/10 text-green-600`)
    - **Draw**: yellow/amber background/badge (e.g., `bg-yellow-500/10 text-yellow-600`)
    - **Loss**: red background/badge (e.g., `bg-red-500/10 text-red-600`)
  - Competition name (muted text, smaller font)
**And** results are ordered from most recent to oldest (descending by date)

**Given** the SportMonks API returns no finished fixtures or fails
**When** the component handles the error
**Then** it shows a placeholder message "No recent results available" with a muted icon
**And** no error toast or alert is displayed

### AC-5: Upcoming Fixtures section

**Given** the homepage is loaded
**When** the `UpcomingFixtures` component fetches upcoming fixtures from `/api/sportmonks/fixtures?teamId={sampdoriaTeamId}&status=upcoming&limit=5`
**Then** the section renders a list/card group titled "Upcoming Fixtures" showing 3-5 upcoming matches
**And** each fixture row displays:
  - Match date and time (e.g., "Sat 5 Apr, 18:00")
  - Opponent team logo (small, 24-32px)
  - Opponent team name
  - Competition name (muted text)
  - Venue name (muted text, if available)
  - Home/Away indicator (small badge or text)
**And** fixtures are ordered from soonest to furthest (ascending by date)

**Given** the SportMonks API returns no upcoming fixtures or fails
**When** the component handles the error
**Then** it shows a placeholder message "No upcoming fixtures" with a muted icon
**And** no error toast or alert is displayed

### AC-6: Recent Dashboards section

**Given** the homepage is loaded and the user is authenticated
**When** the `RecentDashboards` component queries Convex using `getUserRecentDashboards({ limit: 5 })` (from Story 7.4)
**Then** the section renders titled "Recent Dashboards" showing up to 5 recently opened dashboards
**And** each entry displays:
  - Dashboard icon (from `getDashboardIcon` utility, Story 7.4)
  - Dashboard title
  - Relative time since last opened (e.g., "Opened 2 hours ago", "Opened yesterday")
**And** each entry is a clickable link navigating to `/dashboards/{slug}`
**And** the entries are ordered by `openedAt` descending (most recent first)

**Given** the user has no recent dashboards (empty `userRecentDashboards` for this user)
**When** the component renders
**Then** it shows a placeholder message "No recently viewed dashboards" with a link to "Browse dashboards" pointing to `/dashboards`

### AC-7: Pinned Dashboards section

**Given** the homepage is loaded and the user is authenticated
**When** the `PinnedDashboards` component queries Convex using `getUserPinnedDashboards()` (from Story 7.4)
**Then** the section renders titled "Pinned Dashboards" showing all of the user's pinned dashboards
**And** each entry renders as a compact `<DashboardCardItem />` (from Story 7.4) with:
  - Dashboard icon
  - Dashboard title
  - Pin icon (filled, indicating pinned state)
**And** clicking a card navigates to `/dashboards/{slug}`
**And** clicking the pin icon unpins the dashboard (calls `togglePinDashboard` mutation) and the card disappears from this section in real-time (Convex reactivity)

**Given** the user has no pinned dashboards
**When** the component renders
**Then** it shows a placeholder message "No pinned dashboards yet" with a link to "Browse dashboards" pointing to `/dashboards`

### AC-8: Quick Access cards section

**Given** the homepage is loaded
**When** the quick access section renders
**Then** it displays navigation cards for:
  - **Calendar** -- icon: `Calendar`, links to `/calendar`
  - **Documents** -- icon: `FileText`, links to `/documents`
  - **Players** -- icon: `Users`, links to `/players`
  - **Dashboards** -- icon: `BarChart3`, links to `/dashboards`
**And** each card shows the section icon and title
**And** cards have hover effects consistent with the design system (lift + border highlight, matching Story 7.4 hover pattern)
**And** the "Coming Soon" placeholder text previously on analytics cards is removed entirely

### AC-9: Sampdoria team ID configuration

**Given** the homepage components need to fetch SportMonks data for UC Sampdoria
**When** the developer configures the team ID
**Then** a constant `SAMPDORIA_SPORTMONKS_TEAM_ID` is defined in a shared config file (e.g., `apps/web/src/lib/sportmonks-config.ts`)
**And** all homepage SportMonks fetch calls use this constant (not a hardcoded number scattered across components)
**And** the value can be changed in a single location if the team ID changes

### AC-10: Responsive layout and loading states

**Given** the homepage is rendered on different viewport sizes
**When** the viewport width changes
**Then** the layout adapts:
  - **Desktop (xl+):** Match Countdown full width; Today's Events / Recent Results / Upcoming Fixtures in a 3-column grid; Recent + Pinned Dashboards in a 2-column grid; Quick Access in a 4-column grid
  - **Tablet (md-xl):** Match Countdown full width; middle sections in 2-column grid (Today's Events spans full or stacks); dashboards sections stack or 2-col; Quick Access in 2-column grid
  - **Mobile (<md):** All sections stack vertically in a single column

**Given** any section's data is still loading
**When** the component is in a loading state
**Then** skeleton placeholders matching the shape of the expected content are displayed (using shadcn/ui `Skeleton` component)
**And** no layout shift occurs when data loads (skeletons match final content dimensions)

---

## Implementation Notes

### File Locations

| Artifact | Path |
|---|---|
| Homepage (replace redirect) | `apps/web/src/app/(app)/page.tsx` |
| Match Countdown Component | `apps/web/src/components/home/match-countdown.tsx` |
| Recent Results Component | `apps/web/src/components/home/recent-results.tsx` |
| Upcoming Fixtures Component | `apps/web/src/components/home/upcoming-fixtures.tsx` |
| Recent Dashboards Component | `apps/web/src/components/home/recent-dashboards.tsx` |
| Pinned Dashboards Component | `apps/web/src/components/home/pinned-dashboards.tsx` |
| Quick Access Cards Component | `apps/web/src/components/home/quick-access-cards.tsx` |
| SportMonks Config | `apps/web/src/lib/sportmonks-config.ts` |

### Key Decisions

1. **Client-side fetch for SportMonks data** -- The homepage fetches SportMonks data via client-side `fetch` (or SWR/React Query if already used in the project) to the admin app's API routes. This avoids duplicating the PostgreSQL connection logic in the web app and keeps the SportMonks database access centralized in `apps/admin/`.

2. **Admin API base URL** -- The web app needs to know the admin app's base URL to call its API routes. Use an environment variable `NEXT_PUBLIC_ADMIN_API_URL` (e.g., `http://localhost:3001` in dev). If the apps share the same domain in production (reverse proxy), use a relative path `/api/sportmonks/`.

3. **Convex for pin/recent, HTTP for SportMonks** -- The homepage uses two data sources with different patterns: Convex real-time subscriptions for pin/recent dashboards (reactive, instant updates) and HTTP fetch for SportMonks fixture data (polled/cached, external database). These patterns coexist on the same page.

4. **Countdown timer precision** -- Updates every 60 seconds (not every second) to avoid unnecessary re-renders. Days/hours/minutes granularity is sufficient for a match countdown. Use `setInterval` with cleanup in `useEffect`.

5. **Score normalization** -- SportMonks returns `homeScore` and `awayScore`. The component must determine which team is Sampdoria (using `homeTeamId` or `awayTeamId` matching the configured team ID) to display "our score" on the left and determine W/D/L status.

6. **No "Today's Events" modification** -- The existing Today's Events widget from Story 2.3 is retained as-is. If it already exists as a component, it is reused in the new layout. If Story 2.3 was never implemented (current page is a redirect), the Today's Events widget is built as a simple list of today's calendar events from the existing Convex calendar query.

### Data Flow

```
SportMonks PostgreSQL DB
    |
    v
apps/admin/app/api/sportmonks/fixtures  (Story 8.2)
apps/admin/app/api/sportmonks/teams     (Story 8.2)
    |
    v (HTTP fetch, client-side)
apps/web homepage components:
    - MatchCountdown
    - RecentResults
    - UpcomingFixtures

Convex DB (real-time subscriptions)
    |
    v
packages/backend/convex/userDashboards.ts  (Story 7.4)
    - getUserRecentDashboards
    - getUserPinnedDashboards
    |
    v
apps/web homepage components:
    - RecentDashboards
    - PinnedDashboards
```

### SportMonks API Calls Summary

| Component | API Call | Params |
|---|---|---|
| MatchCountdown | `GET /api/sportmonks/fixtures` | `teamId={SAMPDORIA_ID}&status=upcoming&limit=1` |
| RecentResults | `GET /api/sportmonks/fixtures` | `teamId={SAMPDORIA_ID}&status=finished&limit=5` |
| UpcomingFixtures | `GET /api/sportmonks/fixtures` | `teamId={SAMPDORIA_ID}&status=upcoming&limit=5` |
| MatchCountdown (logo) | `GET /api/sportmonks/teams` | `teamId={opponentTeamId}` |

### Fallback Behavior Matrix

| Component | Primary Source | Fallback | Fallback Behavior |
|---|---|---|---|
| MatchCountdown | SportMonks fixtures API | Convex calendar (Match-type events) | Show calendar event data without opponent logo/competition |
| RecentResults | SportMonks fixtures API | None | Show "No recent results available" placeholder |
| UpcomingFixtures | SportMonks fixtures API | None | Show "No upcoming fixtures" placeholder |
| RecentDashboards | Convex `userRecentDashboards` | None | Show "No recently viewed dashboards" with link to gallery |
| PinnedDashboards | Convex `userPinnedDashboards` | None | Show "No pinned dashboards yet" with link to gallery |

### Files NOT to modify

- `apps/admin/` -- admin app is not affected; SportMonks API routes already exist from Story 8.2
- `packages/backend/convex/userDashboards.ts` -- pin/recent queries and mutations already exist from Story 7.4
- Any Convex schema files -- no new tables needed

---

## Tasks / Subtasks

- [ ] **Task 1: Create SportMonks config** (AC: #9)
  - [ ] 1.1: Create `apps/web/src/lib/sportmonks-config.ts` exporting `SAMPDORIA_SPORTMONKS_TEAM_ID` and `SPORTMONKS_API_BASE_URL` (from env or default)
  - [ ] 1.2: Create a shared fetch helper `fetchSportMonks(endpoint, params)` that constructs the full URL, handles errors gracefully (returns `null` on failure), and parses JSON

- [ ] **Task 2: Build MatchCountdown component** (AC: #2, #3)
  - [ ] 2.1: Create `apps/web/src/components/home/match-countdown.tsx`
  - [ ] 2.2: Fetch next upcoming fixture via SportMonks API
  - [ ] 2.3: Implement countdown timer with `useEffect` + `setInterval` (60s interval, cleanup on unmount)
  - [ ] 2.4: Determine opponent team (check if Sampdoria is home or away)
  - [ ] 2.5: Display opponent logo, name, competition, date/time, venue, home/away badge
  - [ ] 2.6: Handle "match started" state (countdown <= 0)
  - [ ] 2.7: Implement fallback to Convex calendar Match-type events when API fails or returns empty
  - [ ] 2.8: Add loading skeleton (hero-sized placeholder)

- [ ] **Task 3: Build RecentResults component** (AC: #4)
  - [ ] 3.1: Create `apps/web/src/components/home/recent-results.tsx`
  - [ ] 3.2: Fetch last 5 finished fixtures via SportMonks API
  - [ ] 3.3: Determine W/D/L per fixture (compare Sampdoria's score to opponent's)
  - [ ] 3.4: Render result list with color-coded W/D/L badges
  - [ ] 3.5: Normalize score display (Sampdoria score on left)
  - [ ] 3.6: Handle empty/error state with placeholder
  - [ ] 3.7: Add loading skeleton (5 rows)

- [ ] **Task 4: Build UpcomingFixtures component** (AC: #5)
  - [ ] 4.1: Create `apps/web/src/components/home/upcoming-fixtures.tsx`
  - [ ] 4.2: Fetch next 5 upcoming fixtures via SportMonks API
  - [ ] 4.3: Render fixture list with date, opponent, competition, venue, home/away badge
  - [ ] 4.4: Handle empty/error state with placeholder
  - [ ] 4.5: Add loading skeleton (5 rows)

- [ ] **Task 5: Build RecentDashboards component** (AC: #6)
  - [ ] 5.1: Create `apps/web/src/components/home/recent-dashboards.tsx`
  - [ ] 5.2: Query Convex `getUserRecentDashboards({ limit: 5 })`
  - [ ] 5.3: Resolve dashboard metadata (title, icon) from dashboard registry (Story 9.1) using the `dashboardId` (slug)
  - [ ] 5.4: Format relative time ("Opened 2 hours ago") using a utility (e.g., `date-fns formatDistanceToNow` or manual)
  - [ ] 5.5: Render clickable list items linking to `/dashboards/{slug}`
  - [ ] 5.6: Handle empty state with "Browse dashboards" link
  - [ ] 5.7: Add loading skeleton

- [ ] **Task 6: Build PinnedDashboards component** (AC: #7)
  - [ ] 6.1: Create `apps/web/src/components/home/pinned-dashboards.tsx`
  - [ ] 6.2: Query Convex `getUserPinnedDashboards()`
  - [ ] 6.3: Render pinned dashboards as compact `<DashboardCardItem />` components
  - [ ] 6.4: Wire up pin toggle (unpin removes card in real-time via Convex reactivity)
  - [ ] 6.5: Handle empty state with "Browse dashboards" link
  - [ ] 6.6: Add loading skeleton

- [ ] **Task 7: Build QuickAccessCards component** (AC: #8)
  - [ ] 7.1: Create `apps/web/src/components/home/quick-access-cards.tsx`
  - [ ] 7.2: Render navigation cards for Calendar, Documents, Players, Dashboards
  - [ ] 7.3: Apply hover effects (translateY, border highlight, shadow) matching Story 7.4 patterns
  - [ ] 7.4: Remove any "Coming Soon" placeholder text from analytics-related cards

- [ ] **Task 8: Assemble homepage** (AC: #1, #10)
  - [ ] 8.1: Replace the redirect in `apps/web/src/app/(app)/page.tsx` with the full homepage layout
  - [ ] 8.2: Import and compose all section components in the correct layout order
  - [ ] 8.3: Apply responsive grid classes (1-col mobile, 2-col tablet, 3/4-col desktop)
  - [ ] 8.4: Verify no layout shift when data loads (skeletons match content dimensions)

- [ ] **Task 9: Verification**
  - [ ] 9.1: Run `pnpm typecheck` -- must pass with zero errors
  - [ ] 9.2: Run `pnpm lint` -- must pass with zero new errors
  - [ ] 9.3: Verify homepage renders all sections with SportMonks data available
  - [ ] 9.4: Verify homepage renders gracefully with SportMonks unavailable (503) -- countdown falls back to calendar, results/fixtures show placeholders
  - [ ] 9.5: Verify recent/pinned dashboards update in real-time when user opens or pins a dashboard in another tab
  - [ ] 9.6: Verify responsive layout at mobile (375px), tablet (768px), and desktop (1440px) viewpoints
  - [ ] 9.7: Verify countdown timer updates every 60 seconds and cleans up on unmount (no memory leaks)
  - [ ] 9.8: Verify all navigation links work (quick access cards, dashboard links, "Browse dashboards" links)

## Dev Notes

### Today's Events Widget

The current homepage (`apps/web/src/app/(app)/page.tsx`) is a redirect to `/dashboards`. Story 2.3 may have defined a "Today's Events" widget. If a `TodaysEvents` component already exists in the codebase, reuse it in the new layout. If not, create a minimal one that queries today's calendar events from Convex and renders them as a simple list with time and title. This widget is NOT part of this story's core scope -- it is retained from Story 2.3 for layout completeness.

### Opponent Logo Resolution

The fixtures API (Story 8.2) returns `homeTeamId`, `awayTeamId`, `homeTeamName`, `awayTeamName`. It may or may not include logo URLs. If logos are not included in the fixture response, make a secondary call to `/api/sportmonks/teams?teamId={opponentTeamId}` to fetch the `logoUrl`. Cache team data client-side (in React state or SWR cache) to avoid redundant calls -- the same opponent may appear in both Recent Results and Upcoming Fixtures.

### Environment Variables

| Variable | App | Description |
|---|---|---|
| `NEXT_PUBLIC_ADMIN_API_URL` | `apps/web` | Base URL for admin API routes (e.g., `http://localhost:3001`) |
| `SPORTMONKS_DATABASE_URL` | `apps/admin` | Already configured in Story 8.2 |
