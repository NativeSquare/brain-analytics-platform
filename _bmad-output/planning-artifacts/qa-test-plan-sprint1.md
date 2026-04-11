# QA Manual Test Plan -- Stories 4.6, 9.6, Epics 10, 11

**Project:** Brain Analytics Platform
**Stories Covered:** 4.6 (Document Sharing), 9.6 (MUX Video Cache), 10.1-10.6 (Advanced Dashboards), 11.1-11.5 (Cross-Cutting Features)
**Date:** 2026-04-03
**Author:** QA Lead
**Status:** Draft

---

## Global Prerequisites

| Prerequisite | Details |
|---|---|
| Environment | `apps/web` running via `pnpm dev` (localhost:3000) |
| Auth | Logged in as an **admin** user unless test specifies otherwise |
| Mock Data | `USE_MOCK_DATA=true` in `.env.local` |
| Convex | `npx convex dev` running |
| Browser | Chrome or Firefox, latest stable, viewport >= 1440px unless testing responsive |

---

## Story 9.6: MUX Video Cache Integration

### TC-9.6-01: Graceful Degradation Without MUX

| Field | Value |
|---|---|
| **ACs Covered** | AC6 |
| **Prerequisites** | `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET` NOT set |
| **Steps** | 1. Go to `/dashboards/shot-map`. 2. Select team, season, match. 3. Click a shot → "Shot video". |
| **Expected** | Video plays via native `<video>` tag (Wyscout URL). No error. No MUX console errors. |
| **Pass/Fail** | [ ] |

### TC-9.6-02: MUX Cache Full Flow (First + Subsequent View)

| Field | Value |
|---|---|
| **ACs Covered** | AC1, AC2, AC3, AC4 |
| **Prerequisites** | MUX + Wyscout credentials configured |
| **Steps** | 1. Click a shot → "Shot video" (first view). 2. Verify MuxPlayer renders (HLS from `stream.mux.com`). 3. Verify overlay has quality selector, seeking, fullscreen. 4. Close overlay → verify inline mode works. 5. Reload and re-request same clip. 6. Verify `cached: true` in network response, no Wyscout API call. |
| **Expected** | First view: MUX upload + stream. Second view: instant from cache. Both overlay and inline modes work. |
| **Pass/Fail** | [ ] |

---

## Story 10.1: Event Map Dashboard

### TC-10.1-01: Filters + Tabs + Pitch Rendering

| Field | Value |
|---|---|
| **ACs Covered** | AC1, AC3, AC4, AC5, AC8 |
| **Steps** | 1. Navigate to `/dashboards/event-map`. 2. Select team → season → match. 3. Verify dots appear on pitch. 4. Switch tabs (Interceptions/Fouls/Regains) — dots, zone stats, and bar chart all update. 5. Check zone stats sum to 100%. |
| **Expected** | Dashboard loads. Filters cascade. Tab switch clears old data and renders new. Bar chart title matches active tab. |
| **Pass/Fail** | [x] PASS |

### TC-10.1-02: Event Selection + Details + Video

| Field | Value |
|---|---|
| **ACs Covered** | AC6, AC7 |
| **Steps** | 1. Hover a dot — scales up. 2. Click it — yellow highlight, details pane shows player/minute/type/location/outcome. 3. Click "Watch Video" — video loads or gracefully fails. 4. Click same dot — deselects. |
| **Expected** | Hover/click interactions work. Details pane accurate. Video flow completes or shows "unavailable". |
| **Pass/Fail** | [x] PASS |

---

## Story 10.2: Player Analysis Dashboard

### TC-10.2-01: Cascading Filters + Player Selection

| Field | Value |
|---|---|
| **ACs Covered** | AC2, AC3 |
| **Steps** | 1. Navigate to `/dashboards/player-analysis`. 2. Select Competition → Team → Season. 3. Type player name (2+ chars), select from dropdown. 4. Verify player info card shows name, position, age, team. 5. Change position role — verify all components update without re-fetch. |
| **Expected** | Cascade works. Player search debounced. Role selector updates stats/radar/scatter/comparison instantly. |
| **Pass/Fail** | [x] PASS |

### TC-10.2-02: Stats Table + Charts

| Field | Value |
|---|---|
| **ACs Covered** | AC5, AC6, AC7 |
| **Steps** | 1. Verify stats table: Metric/Total/Per 90/Percentile with color-coded cells. 2. Verify radar chart renders with labeled axes. 3. Verify scatter plot: gray league dots, blue selected player, red reference lines. |
| **Expected** | Percentile colors correct (red→emerald). Radar fills blue at 30% opacity. Scatter shows league context. |
| **Pass/Fail** | [x] PASS |

---

## Story 10.3: Set Pieces Dashboard

### TC-10.3-01: Direct / Indirect Modes + Filters

| Field | Value |
|---|---|
| **ACs Covered** | AC3, AC4, AC7 |
| **Steps** | 1. Navigate to `/dashboards/set-pieces`, select a match. 2. Indirect mode (default): dots colored blue/red, zone view toggle available. 3. Switch to "Zones" — verify polygons with opacity + xG labels. 4. Switch to Direct mode: dots colored by outcome with xG-scaled radius, goal map appears. |
| **Expected** | Indirect: first-contact dots + zone view. Direct: shot dots + goal map. Filters adjust per mode. |
| **Pass/Fail** | [x] PASS |

### TC-10.3-02: Set Piece Selection + Video + Bar Charts

| Field | Value |
|---|---|
| **ACs Covered** | AC10, AC13, AC14, AC15, AC16 |
| **Steps** | 1. Click a dot → details pane shows taker/technique/zone/outcome. 2. Click "Set piece video" → video loads. 3. Verify bar charts: TakersBar + FirstContactsBar (indirect), OutcomeBar (direct). 4. Click a taker bar — dots highlight on pitch. |
| **Expected** | Details populate. Video plays or fails gracefully. Bar chart cross-highlight works. |
| **Pass/Fail** | [ ] PARTIAL — video untestable without Wyscout env vars |

---

## Story 10.4: Opposition Analysis Dashboard

### TC-10.4-01: Opponent Selection + Full Dashboard

| Field | Value |
|---|---|
| **ACs Covered** | AC2, AC3, AC5, AC6, AC7 |
| **Steps** | 1. Navigate to `/dashboards/opposition-analysis`. 2. Select team, season, opponent. 3. Verify stats bar (7 metrics + W/D/L badges). 4. Verify Strengths/Weaknesses sections (green/red). 5. Verify radar chart (6 axes, percentile normalized). 6. Verify phase ratings (Build-up/Transition/Set-piece with Strong/Average/Weak). |
| **Expected** | All sections populate. Radar has grid at 20/40/60/80/100. Phase badges colored correctly. |
| **Pass/Fail** | [x] PASS |

---

## Story 10.5: Team Trends Dashboard

### TC-10.5-01: Line Chart + Ranking + Scatter

| Field | Value |
|---|---|
| **ACs Covered** | AC3, AC4, AC5, AC6, AC7 |
| **Steps** | 1. Navigate to `/dashboards/team-trends`, select team + season. 2. Verify line chart (default: Possession %), change metric via dropdown — chart updates. 3. Verify league ranking chart: Y-axis inverted (1 at top), most recent point highlighted. 4. Verify scatter: blue team dot, gray league dots, red reference lines. Change X/Y metrics. |
| **Expected** | Metric picker updates line without re-fetch. Ranking inverted. Scatter metric dropdowns work. |
| **Pass/Fail** | [x] PASS |

---

## Story 10.6: Three Supplementary Dashboards

### TC-10.6-01: Referee Analysis

| Field | Value |
|---|---|
| **ACs Covered** | AC1.3, AC1.4, AC1.5, AC1.6 |
| **Steps** | 1. Navigate to `/dashboards/referee-analysis`. 2. Select competition → referee. 3. Verify summary card (name, matches, avg fouls/cards). 4. Verify stats tiles (Fouls, Yellow, Red, Penalties). 5. Sort fouls table by different columns. |
| **Expected** | Data populates. Table is sortable. Empty state when no referee selected. |
| **Pass/Fail** | [x] PASS |

### TC-10.6-02: View Possessions + Video

| Field | Value |
|---|---|
| **ACs Covered** | AC2.4, AC2.5, AC2.6, AC2.7 |
| **Steps** | 1. Navigate to `/dashboards/view-possessions`. 2. Select team → season → match. 3. Toggle period + phase + outcome filters. 4. Click a possession row → video plays. |
| **Expected** | Filters are client-side (no re-fetch). Row click triggers video. Selected row highlighted. |
| **Pass/Fail** | [ ] PARTIAL — video untestable without Wyscout env vars |

### TC-10.6-03: Post-Match Set Pieces (URL param + filters)

| Field | Value |
|---|---|
| **ACs Covered** | AC3.1, AC3.4, AC3.6, AC3.7 |
| **Steps** | 1. Navigate to `/dashboards/post-match-set-pieces?match_id={valid_id}`. 2. Verify match auto-loads. 3. Toggle Attack/Defence. 4. Filter by type (Corners, Free Kicks) and side (Left, Right). 5. Click row → pitch highlights. |
| **Expected** | Match pre-selected from URL. Filters work. Table/pitch cross-highlight. Back link visible. |
| **Pass/Fail** | [x] PASS (after seeding `post-match-set-pieces` into Convex) |

---

## Story 11.1: Global Search (Cmd+K)

### TC-11.1-01: Search Palette Open + Search + Navigate

| Field | Value |
|---|---|
| **ACs Covered** | AC1, AC2, AC3, AC5, AC6 |
| **Steps** | 1. Press Cmd+K — palette opens. 2. Verify header has search button with "⌘K" badge (click also opens). 3. Type "sea" — results appear grouped by entity type. 4. Click a result → navigates to correct URL, palette closes. 5. Escape closes palette. 6. Focus an input, press Cmd+K — should NOT open. |
| **Expected** | Palette opens/closes. Results grouped with icons. Navigation works. Shortcut suppressed in inputs. |
| **Pass/Fail** | [x] PASS |

### TC-11.1-02: Role-Based Filtering (Contracts)

| Field | Value |
|---|---|
| **ACs Covered** | AC4 |
| **Prerequisites** | Two user accounts: one admin, one non-admin (e.g., coach). At least one contract exists in Convex for a player. |
| **Steps** | 1. Log in as **admin**. 2. Press Cmd+K to open search palette. 3. Type the first/last name of a player who has a contract (e.g., a player you created in `/players`). 4. Check results: you should see a "Contracts" group with the player's name. 5. Log out. 6. Log in as a **non-admin** user (coach, analyst, etc.). 7. Press Cmd+K, type the same player name. 8. Check results: the "Contracts" group should NOT appear at all. |
| **Expected** | Admin sees contract results. Non-admin sees zero contract results for the same search term. |
| **Pass/Fail** | [ ] BLOCKED — no contracts in Convex DB + needs a second non-admin user account |

---

## Story 11.2: Google OAuth

### TC-11.2-01: Google Sign-In Button + Happy Path

| Field | Value |
|---|---|
| **ACs Covered** | AC2, AC3 |
| **Prerequisites** | Google OAuth configured, invitation exists for test email |
| **Steps** | 1. Go to `/login`. 2. Verify "Sign in with Google" button + "or" separator + email form. 3. Click Google button → redirect to Google → authorize → redirect back. 4. Verify logged in. |
| **Expected** | Button visible. OAuth flow completes. User lands on homepage with active session. |
| **Pass/Fail** | [ ] BLOCKED — waiting for Google OAuth credentials from client |

### TC-11.2-02: Uninvited Google User Rejected

| Field | Value |
|---|---|
| **ACs Covered** | AC4 |
| **Prerequisites** | Google OAuth configured, email NOT invited |
| **Steps** | 1. Click "Sign in with Google" with uninvited email. 2. Verify redirect to `/login?error=not-invited`. 3. Verify error message displayed. |
| **Expected** | Error: "Your Google account is not associated with an invitation..." |
| **Pass/Fail** | [ ] BLOCKED — waiting for Google OAuth credentials from client |

---

## Story 11.3: Enriched Homepage

### TC-11.3-01: Homepage Layout + Countdown

| Field | Value |
|---|---|
| **ACs Covered** | AC1, AC2, AC8 |
| **Steps** | 1. Navigate to `/`. 2. Verify homepage renders (NOT redirect to `/dashboards`). 3. Verify hero card: opponent, competition, countdown (days/hours/min). 4. Verify Quick Access cards (Calendar, Documents, Players, Dashboards) — click each. |
| **Expected** | Full homepage. Countdown updates every 60s. Quick access links work. |
| **Pass/Fail** | [x] PASS (after fixing root page.tsx conflict + fixture date field mapping) |

### TC-11.3-02: Results + Fixtures + Dashboard Sections

| Field | Value |
|---|---|
| **ACs Covered** | AC4, AC5, AC6, AC7 |
| **Steps** | 1. Verify "Recent Results" (up to 5, W/D/L badges, Sampdoria score left). 2. Verify "Upcoming Fixtures" (up to 5, date/time). 3. Verify "Recent Dashboards" (last 5 with timestamps). 4. Verify "Pinned Dashboards" (with links). |
| **Expected** | Results most-recent-first. Fixtures soonest-first. Dashboard links navigate correctly. Empty states show "Browse dashboards". |
| **Pass/Fail** | [x] PASS |

---

## Story 11.4: RBAC Hooks

### TC-11.4-01: Unit Tests + No Regressions

| Field | Value |
|---|---|
| **ACs Covered** | AC10, AC11 |
| **Steps** | 1. Run `cd packages/backend && pnpm test`. 2. Verify all 17 auth hook tests pass. 3. Navigate through Players, Documents, Calendar, Contracts — verify all CRUD unchanged. |
| **Expected** | All tests green. Existing features work identically for admin and non-admin. |
| **Pass/Fail** | [x] PASS — 520/520 unit tests pass. Manual CRUD regression verified. |

### TC-11.4-02: Anti-Enumeration

| Field | Value |
|---|---|
| **ACs Covered** | AC1 |
| **Prerequisites** | Two teams in Convex DB. Requires manual seeding (see steps). |
| **Steps** | 1. **Seed a second team manually**: Open Convex dashboard (https://dashboard.convex.dev), go to Data → `teams` table, click "Add document", create `{ name: "Test Club B", slug: "test-club-b" }`. Note the new team's `_id`. 2. **Create a player on Team B**: Go to `players` table, click "Add document", create `{ firstName: "Test", lastName: "Player", teamId: <Team B _id>, status: "active" }`. Note this player's `_id`. 3. **Log in as your admin user** (who is on Team A / Default Club). 4. **Navigate to** `/players/<Team B player _id>` directly in the browser URL bar. 5. **Verify** the page shows "Resource not found" or "Player not found" — NOT "Access denied" or "Not authorized". 6. **Cleanup** (optional): Delete the test player and test team from Convex dashboard. |
| **Expected** | Same NOT_FOUND error for both non-existent and wrong-team resources. The user cannot tell whether the player exists on another team or doesn't exist at all. |
| **Pass/Fail** | [x] PASS |

---

## Story 11.5: i18n English / Italian

### TC-11.5-01: Language Switch + Persistence

| Field | Value |
|---|---|
| **ACs Covered** | AC2, AC3, AC5 |
| **Steps** | 1. Go to `/settings`. 2. Change language to "Italian", save. 3. Verify sidebar: "Giocatori", "Calendario", "Documenti". 4. Verify account page labels in Italian. 5. Log out, log back in — verify still Italian. 6. Switch back to English — verify all labels revert. |
| **Expected** | Language switches instantly. Persists across sessions. All nav/account labels translated. |
| **Pass/Fail** | [x] PASS — quelques traductions IT manquantes mais fonctionnalité globale OK |

---

## Story 4.6: Document Sharing & Owner-Based Permissions

### TC-4.6-01: Upload + Sharing Dropdown (3 modes)

| Field | Value |
|---|---|
| **ACs Covered** | AC1, AC2, AC7 |
| **Prerequisites** | Logged in as non-admin (coach) |
| **Steps** | 1. Go to `/documents`, open a folder. 2. Click Upload. 3. Verify sharing dropdown with "Only me" (default), "Specific roles", "Specific people". 4. Upload with "Only me" — verify doc appears. 5. Log in as another non-admin — verify private doc NOT visible. 6. Upload with "Specific roles" (Coach + Analyst) — verify a coach sees it, a physio doesn't. 7. Upload with "Specific people" (select User B) — verify User B sees it, User C doesn't. |
| **Expected** | Non-admin can upload. Sharing modes control visibility correctly. Private docs invisible to others. |
| **Pass/Fail** | [x] PASS |

### TC-4.6-02: Owner CRUD + Non-Owner Read-Only

| Field | Value |
|---|---|
| **ACs Covered** | AC3, AC4, AC5 |
| **Steps** | 1. As owner (non-admin): open your doc → verify Replace, Delete, Permissions buttons visible. 2. Replace file — succeeds. 3. Change sharing from private to "Specific roles" → save. 4. As non-owner with read access: open the doc → verify NO Replace/Delete/Permissions buttons. 5. Verify can view/download. |
| **Expected** | Owner has full CRUD. Non-owner sees read-only. Owner can change sharing after upload. |
| **Pass/Fail** | [x] PASS |

### TC-4.6-03: Security — Cross-User + Admin Bypass

| Field | Value |
|---|---|
| **ACs Covered** | AC3, AC4, AC6 |
| **Steps** | 1. Verify admin can replace/delete/change permissions on any user's doc (UI test). 2. Cross-user rejection (non-owner cannot delete another's doc) is verified by backend unit tests: `requireResourceAccess` with `allowOwner: true` rejects non-owners with NOT_AUTHORIZED. Run `cd packages/backend && npx vitest run` to confirm. |
| **Expected** | Admin has full CRUD on all docs. Unit tests confirm non-owner rejection (520/520 pass). |
| **Pass/Fail** | [x] PASS |

---

## Epic 3: Calendar & Scheduling (Regression)

### TC-3-01: Calendar Month View + Event Creation

| Field | Value |
|---|---|
| **FRs Covered** | FR1, FR6 |
| **Prerequisites** | Logged in as admin |
| **Steps** | 1. Navigate to `/calendar`. 2. Verify month view renders with color-coded events (Match=blue, Training=green, Meeting=purple, Rehab=orange). 3. Click "Create Event". 4. Fill in: name, type (Match), start/end time, location, description. 5. Save. 6. Verify the event appears on the calendar at the correct date. |
| **Expected** | Calendar renders. New event appears on correct date with correct color badge. |
| **Pass/Fail** | [x] PASS |

### TC-3-02: Recurring Events + Cancel Occurrence

| Field | Value |
|---|---|
| **FRs Covered** | FR2, FR3 |
| **Prerequisites** | Logged in as admin |
| **Steps** | 1. Create a recurring event (e.g., weekly Training, 4 occurrences). 2. Verify all occurrences appear on the calendar. 3. Click on one occurrence → cancel it. 4. Verify that specific occurrence shows as cancelled. 5. Verify other occurrences are unchanged. |
| **Expected** | Recurring events generate multiple occurrences. Cancelling one doesn't affect others. |
| **Pass/Fail** | [x] PASS — Fixed: Rules of Hooks violation + double content rendering in CalendarView.tsx |

### TC-3-03: Event RSVP + Role Invitations

| Field | Value |
|---|---|
| **FRs Covered** | FR4, FR5, FR7 |
| **Prerequisites** | Admin + at least one other user in the team |
| **Steps** | 1. As admin: create an event with RSVP enabled, invite "All Players" (role-based). 2. Log in as a player-role user. 3. Navigate to `/calendar`, find the event. 4. Submit RSVP: "Attending". 5. Verify RSVP status saved. 6. Change to "Not Attending" with reason. 7. Verify updated. |
| **Expected** | Event visible to invited roles. RSVP submission works. Reason for absence captured. |
| **Pass/Fail** | [x] PASS |

### TC-3-04: ICS Feed Sync

| Field | Value |
|---|---|
| **FRs Covered** | FR8 |
| **Prerequisites** | Logged in |
| **Steps** | 1. Navigate to `/calendar`. 2. Find the "Sync" or "Subscribe" option. 3. Copy the .ics feed URL. 4. Open the URL in a browser — verify it returns valid ICS content (starts with `BEGIN:VCALENDAR`). |
| **Expected** | ICS URL is generated. Content is valid iCalendar format with events. |
| **Pass/Fail** | [x] PASS |

---

## Environment Variables

| Variable | Purpose | Where to Set |
|---|---|---|
| `MUX_TOKEN_ID` | MUX Video API token ID | `apps/web/.env.local` |
| `MUX_TOKEN_SECRET` | MUX Video API token secret | `apps/web/.env.local` |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID | Convex env (`npx convex env set`) |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret | Convex env (`npx convex env set`) |
| `SITE_URL` | Production app URL (OAuth redirects) | Convex env |
| `WYSCOUT_BASE_URL` | Wyscout API base URL | `apps/web/.env.local` |
| `WYSCOUT_USERNAME` | Wyscout API username | `apps/web/.env.local` |
| `WYSCOUT_PASSWORD` | Wyscout API password | `apps/web/.env.local` |

### Convex Commands

```bash
cd packages/backend
npx convex dev          # development
npx convex deploy       # production
```
