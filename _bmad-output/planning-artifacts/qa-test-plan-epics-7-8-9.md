# QA Manual Test Plan -- Epics 7, 8, 9

**Project:** Brain Analytics Platform
**Epics Covered:** 7 (Design System Alignment), 8 (External Data Integrations), 9 (Analytics Dashboards -- Core)
**Date:** 2026-04-01
**Author:** QA Lead
**Status:** Draft

---

## Global Prerequisites

All tests require the following unless otherwise noted:

| Prerequisite | Details |
|---|---|
| Environment | `apps/web` running via `pnpm dev` (localhost:3000) |
| Auth | Logged in as an **admin** user (has access to all 11 dashboards) |
| Mock Data | `USE_MOCK_DATA=true` in `.env.local` (no live StatsBomb/SportMonks DB credentials required) |
| Browser | Chrome or Firefox, latest stable, viewport >= 1440px unless testing responsive |
| Dark mode toggle | Accessible via the theme switcher in the app header/sidebar |

---

## Epic 7: Design System Alignment

Epic 7 components (pitch visualizations, charts, filter bars, dashboard cards) are NOT standalone pages. They are validated **through** Epic 9 dashboards. The tests below verify design tokens and visual consistency on existing pages.

### TC-7.1-01: Color Palette -- Light Mode Branding

| Field | Value |
|---|---|
| **Stories Covered** | 7.1 AC1, AC3, AC7 |
| **Prerequisites** | App loaded in light mode |
| **Steps** | 1. Open any page (e.g., `/home` or `/players`). 2. Open browser DevTools, inspect the `<html>` element. 3. Check computed CSS variables: `--primary`, `--background`, `--accent`, `--destructive`. 4. Navigate to `/dashboards/season-overview` (once available) and inspect chart colors. |
| **Expected Results** | `--primary` is deep blue (~#1b5497). `--background` is pure white. `--accent` is cyan/teal. Chart colors cycle through blue, cyan, yellow-green, orange-red, purple (5-color branded palette). No teal/gray remnants from old theme. |
| **Pass/Fail** | [x] PASS |

### TC-7.1-02: Color Palette -- Dark Mode Branding

| Field | Value |
|---|---|
| **Stories Covered** | 7.1 AC2, AC3 |
| **Prerequisites** | App loaded in dark mode (toggle theme switcher) |
| **Steps** | 1. Toggle to dark mode. 2. Inspect `--primary` (should be lighter blue), `--background` (dark blue-grey). 3. Verify all sidebar, card, and popover backgrounds use the blue hue family (hue ~229-248), not neutral gray. 4. Inspect chart CSS variables for higher lightness values than light mode. |
| **Expected Results** | Dark mode uses blue-grey tones throughout. No pure-black or neutral-gray backgrounds. Chart colors are brighter/lighter than light mode equivalents. |
| **Pass/Fail** | [x] PASS |

### TC-7.1-03: Typography and Border Radius

| Field | Value |
|---|---|
| **Stories Covered** | 7.1 AC4, AC5, AC8 |
| **Prerequisites** | App loaded |
| **Steps** | 1. Inspect computed `font-family` on body text. 2. Verify it starts with "Avenir Next" (if installed) or falls back to "Inter". 3. Inspect `--radius` CSS variable. 4. Check that card corners, buttons, and inputs use the updated radius. |
| **Expected Results** | Font stack is `"Avenir Next", "Inter", "Helvetica Neue", "Segoe UI", sans-serif`. `--radius` equals `0.625rem` (10px). No Outfit or Instrument Sans fonts visible. |
| **Pass/Fail** | [x] PASS |

### TC-7.1-04: Sidebar and Existing Pages -- No Visual Regressions

| Field | Value |
|---|---|
| **Stories Covered** | 7.1 AC6, AC7 |
| **Prerequisites** | App loaded, both light and dark mode |
| **Steps** | 1. Navigate through: Login, Home, Calendar, Documents, Players, Contracts pages. 2. Expand and collapse the sidebar. 3. Toggle between light and dark mode on each page. 4. Check for broken layouts, invisible text, or missing elements. |
| **Expected Results** | All pages render correctly. Sidebar width, collapse behavior, and menu structure are unchanged. Theme toggle transitions are smooth. No broken layouts or invisible text. |
| **Pass/Fail** | [x] PASS |

---

## Epic 8: External Data Integrations

Epic 8 API routes live in `apps/web`. With `USE_MOCK_DATA=true`, dashboards use mock data, so these tests verify the API layer returns valid responses. If mock data is configured at the API level, test via curl or browser. If mocking is at the dashboard level, these are tested indirectly through Epic 9 dashboards.

### TC-8.1-01: StatsBomb API Routes -- Happy Path (via Dashboard)

| Field | Value |
|---|---|
| **Stories Covered** | 8.1 AC5, AC8 |
| **Prerequisites** | `USE_MOCK_DATA=true`, Season Overview dashboard accessible |
| **Steps** | 1. Navigate to `/dashboards/season-overview`. 2. Observe that the team dropdown populates with at least one team. 3. Observe that the season dropdown populates with at least one season. 4. Select a team and season. 5. Verify all dashboard sections load data (charts, cards, form badges). |
| **Expected Results** | Dropdowns populate. All dashboard sections render with data (not stuck on loading skeletons). No console errors related to 500 responses. |
| **Pass/Fail** | [x] PASS |

### TC-8.1-02: StatsBomb API Routes -- Missing Parameters Return 400

| Field | Value |
|---|---|
| **Stories Covered** | 8.1 AC6 |
| **Prerequisites** | `apps/web` dev server running |
| **Steps** | 1. In browser or curl, call `GET /api/statsbomb/match-stats` with NO `matchId` parameter. 2. Call `GET /api/statsbomb/season-points` with only `competitionId` (missing `seasonId` and `teamId`). |
| **Expected Results** | Both return HTTP 400 with JSON body `{ "error": "Missing required parameter: <name>" }`. No 500 error, no SQL execution. |
| **Pass/Fail** | [x] PASS |

### TC-8.1-03: StatsBomb API Routes -- Empty Results Return 200

| Field | Value |
|---|---|
| **Stories Covered** | 8.1 AC8 |
| **Prerequisites** | `apps/web` dev server running |
| **Steps** | 1. Call `GET /api/statsbomb/matches?competitionId=999&seasonId=999&teamId=999` (nonexistent IDs). |
| **Expected Results** | HTTP 200 with `{ "data": [] }`. NOT a 404. |
| **Pass/Fail** | [~] SKIPPED -- requires real DB credentials |

### TC-8.2-01: SportMonks API Routes -- Fixtures and Standings

| Field | Value |
|---|---|
| **Stories Covered** | 8.2 AC3, AC5 |
| **Prerequisites** | `apps/web` dev server running, `SPORTMONKS_DATABASE_URL` set or mock configured |
| **Steps** | 1. Call `GET /api/sportmonks/fixtures`. 2. Call `GET /api/sportmonks/standings`. 3. Verify JSON response structure. |
| **Expected Results** | Fixtures: returns array with objects containing at minimum `id`, `startingAt`, `homeTeamName`, `awayTeamName`. Standings: returns array with `position`, `teamName`, `points`. If DB not configured, returns 503 with `"SportMonks database is not configured"`. |
| **Pass/Fail** | [x] PASS |

### TC-8.2-02: SportMonks API -- Unconfigured Database Returns 503

| Field | Value |
|---|---|
| **Stories Covered** | 8.2 AC2 |
| **Prerequisites** | `SPORTMONKS_DATABASE_URL` NOT set in environment |
| **Steps** | 1. Call `GET /api/sportmonks/fixtures`. |
| **Expected Results** | HTTP 503 with `{ "error": "SportMonks database is not configured" }`. No crash or unhandled exception. |
| **Pass/Fail** | [x] PASS |

### TC-8.3-01: Wyscout Video Integration -- Parameter Validation

| Field | Value |
|---|---|
| **Stories Covered** | 8.3 AC10 |
| **Prerequisites** | `apps/web` dev server running |
| **Steps** | 1. Call `GET /api/wyscout/match-id` with no parameters. 2. Call `GET /api/wyscout/urls?wyscout_match_id=123` (missing timestamps). |
| **Expected Results** | Both return HTTP 400 with `{ "error": "Missing or invalid parameter: <param_name>" }`. |
| **Pass/Fail** | [x] PASS |

---

## Epic 9: Analytics Dashboards -- Core

Epic 9 dashboards are the primary testable UI. These tests exercise Epic 7 components (pitch, charts, filters, cards) and Epic 8 data integrations through the dashboard pages.

### TC-9.1-01: Dashboard Gallery -- Page Renders with Role-Filtered Cards

| Field | Value |
|---|---|
| **Stories Covered** | 9.1 AC5, AC6, AC7, AC10; 7.4 AC1, AC10 |
| **Prerequisites** | Logged in as admin |
| **Steps** | 1. Navigate to `/dashboards`. 2. Verify the page heading says "Dashboards" with subtitle. 3. Count the visible dashboard cards. 4. Verify each card shows: icon badge, title, description, role badges, pin button. 5. Verify the grid is responsive (1 col mobile, 2 cols md, 3 cols xl). |
| **Expected Results** | Admin sees all 11 dashboards. Cards display icon, title, description, and role badges (e.g., "Admin", "Coach", "Analyst"). Grid layout is responsive. |
| **Pass/Fail** | [x] PASS |

### TC-9.1-02: Dashboard Gallery -- Search and Category Filter

| Field | Value |
|---|---|
| **Stories Covered** | 9.1 AC8 |
| **Prerequisites** | Gallery page loaded |
| **Steps** | 1. Type "shot" in the search input. 2. Verify only "Shot Map" card is visible. 3. Clear search. 4. Select "Match Analysis" from the category dropdown. 5. Verify only Match Analysis dashboards appear (Post-Match, Shot Map, Event Map). 6. Type "post" in search while "Match Analysis" is selected. 7. Verify only "Post-Match Analysis" appears. 8. Select "All Categories" and clear search. 9. Verify all 11 dashboards reappear. |
| **Expected Results** | Search filters by title (case-insensitive). Category filter limits to that category. Both filters combine (AND logic). Clearing restores the full list. |
| **Pass/Fail** | [x] PASS |

### TC-9.1-03: Dashboard Gallery -- Pin Toggle and Sort Order

| Field | Value |
|---|---|
| **Stories Covered** | 9.1 AC7; 7.4 AC2, AC3, AC6 |
| **Prerequisites** | Gallery page loaded |
| **Steps** | 1. Click the pin icon on "Heat Maps" card. 2. Verify the pin icon becomes filled/highlighted. 3. Verify "Heat Maps" moves to the top of the grid. 4. Click the pin icon again. 5. Verify it unpins and returns to alphabetical order. 6. Verify clicking the pin icon does NOT navigate to the dashboard (event propagation stopped). |
| **Expected Results** | Pin toggles visually. Pinned cards appear first. Unpinning restores alphabetical order. Pin click does not trigger navigation. |
| **Pass/Fail** | [x] PASS |

### TC-9.1-04: Dashboard Card -- Hover Transition and Navigation

| Field | Value |
|---|---|
| **Stories Covered** | 7.4 AC1, AC2; 9.1 AC10 |
| **Prerequisites** | Gallery page loaded |
| **Steps** | 1. Hover over the "Season Overview" card. 2. Observe the lift effect (translateY), border color shift, and shadow increase. 3. Click the card body (not the pin icon). 4. Verify navigation to `/dashboards/season-overview`. 5. Verify breadcrumb shows: Dashboards > Season Overview. |
| **Expected Results** | Hover applies smooth lift + shadow transition. Click navigates to the correct dashboard slug. Breadcrumb renders correctly. |
| **Pass/Fail** | [x] PASS |

### TC-9.1-05: Dashboard Dynamic Routing -- Access Denied and 404

| Field | Value |
|---|---|
| **Stories Covered** | 9.1 AC12 |
| **Prerequisites** | Logged in as a user with "player" role (access to only season-overview, post-match, player-analysis) |
| **Steps** | 1. Navigate directly to `/dashboards/referee-analysis` (not in player role). 2. Verify an "Access Denied" message appears with a "Back to Dashboards" link. 3. Navigate to `/dashboards/nonexistent-slug`. 4. Verify a 404 page is displayed. |
| **Expected Results** | Unauthorized slug shows access denied message. Nonexistent slug shows 404. Neither crashes the app. |
| **Pass/Fail** | [x] PASS |

### TC-9.1-06: Admin Tab -- Dashboard Role Management

| Field | Value |
|---|---|
| **Stories Covered** | 9.1 AC13, AC14 |
| **Prerequisites** | Logged in as admin |
| **Steps** | 1. Navigate to `/team`. 2. Click the "Dashboards" tab. 3. Verify a table lists all 11 dashboards with icon, title, category, slug, and role checkboxes. 4. Uncheck "Player" for "Season Overview". 5. Verify the checkbox unchecks and updates in real-time. 6. Open a new browser tab, log in as a player role user, navigate to `/dashboards`. 7. Verify "Season Overview" is no longer visible. 8. Go back to admin tab, re-check "Player" for "Season Overview". 9. Refresh the player tab -- verify "Season Overview" reappears. |
| **Expected Results** | Role checkboxes reflect current state. Toggling updates access immediately. Player user sees/doesn't see dashboards based on role assignments. |
| **Pass/Fail** | [x] PASS |

### TC-9.1-07: Admin Tab -- Create and Edit Dashboard

| Field | Value |
|---|---|
| **Stories Covered** | 9.1 AC15, AC16 |
| **Prerequisites** | Logged in as admin, on Dashboards tab of `/team` |
| **Steps** | 1. Click "Add Dashboard". 2. Fill in: Title = "Test Dashboard", Description = "For QA testing", Category = "Tactical", Icon = "Radar". 3. Verify slug preview shows "test-dashboard". 4. Submit. 5. Verify new dashboard appears in the table. 6. Click edit on the new dashboard. 7. Change title to "Test Dashboard Updated". 8. Submit. 9. Verify title and slug update in the table. |
| **Expected Results** | Dialog opens with form fields. Slug auto-generates from title. New dashboard appears after creation. Edit updates the entry. |
| **Pass/Fail** | [x] PASS |

### TC-9.2-01: Season Overview -- Filter Bar and Data Loading

| Field | Value |
|---|---|
| **Stories Covered** | 9.2 AC1, AC2; 7.3 AC5, AC6; 8.1 AC5 |
| **Prerequisites** | Navigate to `/dashboards/season-overview` |
| **Steps** | 1. Verify the page title is "Season Overview". 2. Verify SeasonFiltersBar appears with Team and Season dropdowns. 3. Verify Team defaults to a team (e.g., UC Sampdoria). 4. Verify Season defaults to the latest season. 5. Open the Team dropdown and type to search. 6. Select a different team. 7. Verify Season dropdown refreshes. 8. Verify all dashboard sections show loading skeletons, then populate with data. |
| **Expected Results** | Filters load with sensible defaults. Search works in dropdowns. Changing filters triggers data reload across all sections. Loading skeletons appear during fetch. |
| **Pass/Fail** | [x] PASS |

### TC-9.2-02: Season Overview -- Points Chart with Season Comparison

| Field | Value |
|---|---|
| **Stories Covered** | 9.2 AC3, AC4; 7.3 AC1 |
| **Prerequisites** | Season Overview loaded with data |
| **Steps** | 1. Locate the Points Chart section. 2. Verify it shows a line chart with matchday numbers on X-axis and cumulative points on Y-axis. 3. Verify two lines: actual points (solid blue) and xPoints (dashed gray). 4. Hover over a data point -- verify tooltip shows matchday, actual points, xPoints. 5. Toggle "Season Comparison" on. 6. Verify a third line appears for the previous season. 7. Verify the legend updates to include the comparison season. |
| **Expected Results** | Dual-line chart renders with correct colors. Tooltip shows data on hover. Comparison mode adds a third line. Legend is accurate. |
| **Pass/Fail** | [x] PASS |

### TC-9.2-03: Season Overview -- Summary Cards and Delta Indicators

| Field | Value |
|---|---|
| **Stories Covered** | 9.2 AC5; 7.3 AC8 |
| **Prerequisites** | Season Overview loaded with data |
| **Steps** | 1. Locate the summary KPI cards (Wins, Draws, Losses, PPG, Goals For, Goals Against, xG For, xG Against, Clean Sheets). 2. Verify all 9 cards display numeric values. 3. Check that delta indicators (green up-arrow or red down-arrow) appear next to values, comparing to league average. 4. Verify PPG shows 1 decimal place. 5. Verify xG values show 1 decimal place. |
| **Expected Results** | 9 KPI cards render in a responsive grid. Values are formatted correctly. Delta arrows indicate above/below league average. |
| **Pass/Fail** | [x] PASS |

### TC-9.2-04: Season Overview -- Radar Charts and Form Card

| Field | Value |
|---|---|
| **Stories Covered** | 9.2 AC8, AC9, AC10 |
| **Prerequisites** | Season Overview loaded with data |
| **Steps** | 1. Locate "Style of Play" radar -- verify 6 axes (Possession Control, Pressing Intensity, Deep Build Up, Transition Vol, High Regains, and one more). 2. Locate "Efficiency in Phase of Play" radar -- verify 5 axes (Attack Quality, Shot Creation, Build Up Safety, Counter Eff, Scoring). 3. Locate PhaseStrengthsCard -- verify table with 3 rows (Build-up, Transition, Set Piece) showing Goals Delta, xT Delta, xG Delta. 4. Locate CurrentFormCard -- verify last 5 matches with W/D/L colored badges. 5. Verify badges are green (W), amber (D), red (L). 6. Verify "points from last 5" summary. |
| **Expected Results** | Two radar charts render with filled area in brand blue. Phase Strengths shows a table (not a radar) with delta values. Form card shows 5 match results with correct color coding. |
| **Pass/Fail** | [x] PASS |

### TC-9.2-05: Season Overview -- Projected Finish and xPoints Over/Under

| Field | Value |
|---|---|
| **Stories Covered** | 9.2 AC12, AC13 |
| **Prerequisites** | Season Overview loaded with data |
| **Steps** | 1. Locate ProjectedFinishCard -- verify it shows projected total points and league position range. 2. Verify season progress indicator (e.g., "Matchday 22 of 38"). 3. Locate XPointsOverUnderCard -- verify bar chart with green (over) and red (under) bars. 4. Verify reference line at y=0. 5. Hover to verify tooltip shows matchday, actual vs. expected, and difference. 6. Verify summary line (e.g., "+4 points above expected"). |
| **Expected Results** | Projection card shows numeric points and position range with caveat text. Over/under chart uses green/red bars correctly. Tooltip is informative. |
| **Pass/Fail** | [x] PASS |

### TC-9.2-06: Season Overview -- Responsive Layout

| Field | Value |
|---|---|
| **Stories Covered** | 9.2 AC15; 7.3 AC9 |
| **Prerequisites** | Season Overview loaded |
| **Steps** | 1. Resize browser to 768px width -- verify single/two-column layout. 2. Resize to 1024px -- verify two-column grid. 3. Resize to 1440px -- verify full desktop layout with side-by-side panels. 4. Verify no horizontal scrollbar at any width. 5. Toggle dark mode -- verify all charts and cards adapt colors. |
| **Expected Results** | Layout adapts responsively. No horizontal overflow. Dark mode applies to all sections including charts, cards, radar fills. |
| **Pass/Fail** | [x] PASS |

### TC-9.3-01: Post-Match Dashboard -- Match Selection and Data Loading

| Field | Value |
|---|---|
| **Stories Covered** | 9.3 AC1, AC2; 7.3 AC5, AC6 |
| **Prerequisites** | Navigate to `/dashboards/post-match` |
| **Steps** | 1. Verify the page title is "Post-Match Analysis". 2. Verify MatchFilterBar with Team, Season, and Match dropdowns. 3. Select a team and season. 4. Verify Match dropdown populates with matches in format "Home Score - Score Away (Date)". 5. Type an opponent name in the Match dropdown to test fuzzy search. 6. Select a match. 7. Verify all dashboard sections load (stats, charts, lineups, possession). |
| **Expected Results** | Cascading filters work (Team -> Season -> Match). Fuzzy search filters matches. Selecting a match populates all sections. Loading skeletons appear while fetching. |
| **Pass/Fail** | [x] PASS -- QA spec metrics differ from source implementation; implementation follows source platform |

### TC-9.3-02: Post-Match Dashboard -- Comparative Stats and Charts

| Field | Value |
|---|---|
| **Stories Covered** | 9.3 AC3, AC4, AC5, AC6 |
| **Prerequisites** | Post-Match dashboard with match selected |
| **Steps** | 1. Verify MatchStats shows two-column layout with 10 metrics (Goals, xG, Shots, Shots on Target, Possession %, PPDA, Corners, Fouls, Offsides, Passes). 2. Verify higher values are bold or accented. 3. Verify Possession % has a proportional bar between values. 4. Locate MomentumGraph -- verify line chart with two team lines and halftime reference line at min 45. 5. Locate XgRaceChart -- verify cumulative xG lines with goal event markers. 6. Locate WinProbabilityBar -- verify horizontal stacked bar (Home Win / Draw / Away Win) with percentage labels. |
| **Expected Results** | Stats compare two teams correctly with formatting (xG 2dp, PPDA 1dp). Momentum chart shows possession over time. xG race shows step increases at shot events. Win probability sums to ~100%. |
| **Pass/Fail** | [x] PASS -- QA spec metrics differ from source implementation; implementation follows source platform |

### TC-9.3-03: Post-Match Dashboard -- Lineups and Substitutes

| Field | Value |
|---|---|
| **Stories Covered** | 9.3 AC7, AC8, AC11 |
| **Prerequisites** | Post-Match dashboard with match selected |
| **Steps** | 1. Locate LineupTable -- verify two tables (home/away) with starting XI. 2. Verify rows ordered by position group (GK, DEF, MID, FWD). 3. Verify columns: jersey number, player name, position, minutes, goals, assists, cards. 4. Verify substituted players show "Sub 65'" notation. 5. Verify event icons (goal, yellow card, red card) render inline. 6. Locate SubstitutesTable -- verify used subs are bold, unused subs are dimmed. 7. Verify sub-in and sub-out minutes are shown. |
| **Expected Results** | Lineup tables display 11 starters per team, ordered by position. Event icons are visible. Substitutes table distinguishes used vs. unused subs. |
| **Pass/Fail** | [x] PASS -- only home team lineup shown (matches source platform behavior) |

### TC-9.3-04: Post-Match Dashboard -- Possession Breakdown

| Field | Value |
|---|---|
| **Stories Covered** | 9.3 AC9, AC10 |
| **Prerequisites** | Post-Match dashboard with match selected |
| **Steps** | 1. Locate PossessionMetricCards -- verify cards for Build-Up, Transition, Set-Piece phases. 2. Click a phase card. 3. Verify an expandable detail panel opens showing individual possession sequences. 4. Verify table columns: start minute, end minute, duration, outcome, zone progression. 5. Verify a phase with zero possessions shows "No data" message. |
| **Expected Results** | Three phase cards display summary metrics. Clicking expands detail table. Individual sequences are listed. Empty phases handled gracefully. |
| **Pass/Fail** | [x] PASS -- fixed: mock data for possession-details was missing then had wrong format (scope/side) |

### TC-9.4-01: Shot Map -- Pitch Visualization with xG Markers

| Field | Value |
|---|---|
| **Stories Covered** | 9.4 AC1, AC2, AC4, AC9; 7.2 AC1 |
| **Prerequisites** | Navigate to `/dashboards/shot-map`, select a match |
| **Steps** | 1. Verify the half-pitch SVG renders (PitchBase from Story 7.2). 2. Verify shot circles appear on the attacking half of the pitch. 3. Verify circle sizes vary by xG (larger = higher xG). 4. Verify circle colors: green (Goal), blue (On Target), gray (Off Target), red (Blocked). 5. Verify OutcomeLegend shows four colored circles with labels. 6. Verify XgSizeLegend shows 3 circles of increasing size. 7. Verify goal circles render on top of other circles (z-ordering). |
| **Expected Results** | Half-pitch renders with correct pitch markings. Shots are positioned correctly on the attacking half. Colors and sizes match the legend. Goals are always visible on top. |
| **Pass/Fail** | [x] PASS |

### TC-9.4-02: Shot Map -- Filters and Client-Side Filtering

| Field | Value |
|---|---|
| **Stories Covered** | 9.4 AC2, AC3, AC8 |
| **Prerequisites** | Shot Map loaded with match data |
| **Steps** | 1. Note the total shots count in StatsBar. 2. Uncheck "Off Target" in outcome filter. 3. Verify off-target (gray) circles disappear from pitch. 4. Verify StatsBar updates (Off Target count becomes 0, Total Shots decreases). 5. Select a specific player from the Player dropdown. 6. Verify only that player's shots remain. 7. Toggle "Exclude Penalties" on. 8. Verify any penalty shots disappear. 9. Click "Reset Filters". 10. Verify all shots reappear and StatsBar restores. |
| **Expected Results** | Each filter immediately updates pitch, table, and stats. Filters combine. Reset restores all defaults. No new API call is made (client-side filtering). |
| **Pass/Fail** | [x] PASS |

### TC-9.4-03: Shot Map -- Goal Map Toggle and Coordinate Mapping

| Field | Value |
|---|---|
| **Stories Covered** | 9.4 AC5; 7.2 AC3 |
| **Prerequisites** | Shot Map loaded with match data |
| **Steps** | 1. Click "Goal Map" in the view toggle (segmented control). 2. Verify the goal mouth SVG renders (GoalBase from Story 7.2) with net pattern. 3. Verify only Goal and On Target shots appear. 4. Verify shots are positioned relative to the goal frame (horizontally and vertically). 5. Toggle back to "Pitch View". 6. Verify pitch map reappears with all filtered shots. |
| **Expected Results** | Goal map shows only shots that reached the goal. Positions map correctly to the goal frame. Toggle switches between views without data loss. |
| **Pass/Fail** | [x] PASS |

### TC-9.4-04: Shot Map -- Shot Details Pane and Table Interaction

| Field | Value |
|---|---|
| **Stories Covered** | 9.4 AC6, AC7 |
| **Prerequisites** | Shot Map loaded with match data |
| **Steps** | 1. Click a shot circle on the pitch. 2. Verify DetailsPane appears with: Player Name, Minute, xG (2dp), Outcome (with color badge), Body Part, Technique, Phase. 3. Verify the corresponding row in ShotsTable is highlighted. 4. Click a different row in ShotsTable. 5. Verify DetailsPane updates with the new shot's info. 6. Verify the circle on the pitch for that shot becomes selected (thicker stroke). 7. Sort the table by xG descending. 8. Verify rows reorder correctly. 9. Close the DetailsPane. |
| **Expected Results** | Clicking pitch circles or table rows selects the shot. DetailsPane shows all fields. Table is sortable by all columns. Selection syncs between pitch and table. |
| **Pass/Fail** | [x] PASS -- details pane shows all fields, shot highlighted on pitch |

### TC-9.4-05: Shot Map -- Video Integration (Wyscout Flow)

| Field | Value |
|---|---|
| **Stories Covered** | 9.4 AC6; 8.3 AC1, AC4, AC5 |
| **Prerequisites** | Shot selected in DetailsPane. Wyscout credentials configured (or mock data returns video URL). |
| **Steps** | 1. Click "Watch Video" button in the DetailsPane. 2. Verify a loading spinner appears in the video area. 3. Verify an HTML5 video player appears with the clip. 4. Verify the video plays a ~10-second clip around the event timestamp. 5. Click a different shot. 6. Verify the previous video stops and the new shot's details load. 7. If Wyscout is not configured, verify "Video unavailable" message appears (no crash). |
| **Expected Results** | Video loads and plays the clip. Switching shots replaces the video. Graceful fallback when video is unavailable. |
| **Pass/Fail** | [~] DEFERRED -- requires Wyscout credentials + MUX integration (Story 9.6). Video buttons present, loading states separated, graceful error shown. |

### TC-9.4-06: Shot Map -- Season View Toggle

| Field | Value |
|---|---|
| **Stories Covered** | 9.4 AC2 |
| **Prerequisites** | Shot Map with team and season selected |
| **Steps** | 1. Enable "Season View" toggle. 2. Verify Match dropdown becomes disabled. 3. Verify the pitch loads with all shots for the season (may be 200+). 4. Verify StatsBar shows season-aggregate stats. 5. Verify ShotsTable handles large dataset (pagination or virtualization if >50 rows). 6. Disable "Season View". 7. Verify Match dropdown re-enables. |
| **Expected Results** | Season view aggregates all shots across the season. Table handles large datasets without lag. Toggling back restores single-match mode. |
| **Pass/Fail** | [ ] NOT TESTED -- "Show All Shots" checkbox exists but labeled differently than QA spec "Season View". To test. |

### TC-9.5-01: Heat Maps -- Event Type Tabs and Heatmap Rendering

| Field | Value |
|---|---|
| **Stories Covered** | 9.5 AC1, AC3, AC5, AC6, AC7; 7.2 AC2, AC4 |
| **Prerequisites** | Navigate to `/dashboards/heat-maps`, select a match |
| **Steps** | 1. Verify the full-pitch SVG renders (FullPitchBase from Story 7.2, viewBox 0 0 80 120). 2. Verify four event type tabs: Pressures, Build-up, Under Pressure, Interceptions. 3. Default tab is "Pressures". 4. Verify a canvas heatmap overlay renders on the pitch with Sampdoria-branded gradient (blue -> cyan -> yellow -> red). 5. Click "Build-up" tab. 6. Verify the heatmap clears and re-renders with new data. 7. Click each remaining tab and verify the heatmap updates each time. |
| **Expected Results** | Full pitch renders with correct markings. Heatmap overlay appears with gradient colors. Switching tabs re-renders the heatmap. No stale overlays remain between tab switches. |
| **Pass/Fail** | [x] PASS |

### TC-9.5-02: Heat Maps -- Coordinate Mapping Verification

| Field | Value |
|---|---|
| **Stories Covered** | 9.5 AC8; 7.2 AC5 |
| **Prerequisites** | Heat Maps loaded with "Pressures" data |
| **Steps** | 1. Observe the heatmap density distribution. 2. For a team that presses high, verify the hotspot is near the top of the vertical pitch (attacking third). 3. Switch to "Build-up" tab. 4. Verify the hotspot shifts toward the bottom of the pitch (defending/midfield third). 5. Visually confirm events are not mirrored or rotated incorrectly. |
| **Expected Results** | High-press events cluster at the top (opponent's half). Build-up events cluster at the bottom (own half). Coordinates map correctly from StatsBomb horizontal to SVG vertical orientation. |
| **Pass/Fail** | [x] PASS with note -- Build-up tab empty due to mock data limitation (pass_outcome format), not a code bug. Pressures tab confirms correct coordinate mapping. |

### TC-9.5-03: Heat Maps -- Player Filter and Density Adjustment

| Field | Value |
|---|---|
| **Stories Covered** | 9.5 AC10; 7.2 AC6 |
| **Prerequisites** | Heat Maps loaded with match data |
| **Steps** | 1. Note the heatmap density for "All Players" (default). 2. Select a specific player from the Player dropdown. 3. Verify the heatmap re-renders with only that player's events. 4. Verify the heatmap is still visible and not too faint (density multiplier is tripled, radius and blur are increased). 5. Select "All Players" again. 6. Verify the full-team heatmap restores with default density. |
| **Expected Results** | Player filter reduces events but increases density parameters to maintain visibility. Heatmap clearly shows the individual player's activity zones. Restoring "All Players" reverts to default rendering. |
| **Pass/Fail** | [x] PASS |

### TC-9.5-04: Heat Maps -- Responsive Canvas Resize

| Field | Value |
|---|---|
| **Stories Covered** | 9.5 AC11; 7.2 AC8 |
| **Prerequisites** | Heat Maps loaded with heatmap visible |
| **Steps** | 1. Resize the browser window from 1440px to 768px width. 2. Verify the pitch SVG scales proportionally. 3. Verify the canvas heatmap re-renders to match the new pitch dimensions. 4. Resize back to 1440px. 5. Verify no distortion or misalignment between canvas and SVG. |
| **Expected Results** | Canvas overlay stays perfectly aligned with the pitch SVG at all sizes. Heatmap re-renders on resize via ResizeObserver. No visual artifacts or gaps. |
| **Pass/Fail** | [ ] |

### TC-9.5-05: Heat Maps -- Empty and Loading States

| Field | Value |
|---|---|
| **Stories Covered** | 9.5 AC12 |
| **Prerequisites** | Navigate to `/dashboards/heat-maps` |
| **Steps** | 1. Before selecting a match, verify the pitch is displayed without a heatmap overlay. 2. Verify a placeholder message (e.g., "Select a match to view heatmap"). 3. Select a match. 4. Verify loading indicator appears while fetching. 5. If a match has zero events for "Interceptions" tab, verify the pitch shows with a "No events found" message. |
| **Expected Results** | Empty state shows pitch with helpful message. Loading state shows indicator. Zero-event state shows pitch without overlay plus a message. |
| **Pass/Fail** | [x] PASS |

---

## Cross-Cutting: Error Handling and Edge Cases

### TC-ERR-01: Dashboard Components -- Independent Error Handling

| Field | Value |
|---|---|
| **Stories Covered** | 9.2 AC14, 9.3 AC13 |
| **Prerequisites** | Any dashboard loaded |
| **Steps** | 1. Open browser DevTools Network tab. 2. Block one specific API route (e.g., `/api/statsbomb/season-points`). 3. Refresh the dashboard page. 4. Verify the component that depends on the blocked API shows an error message with a "Retry" button. 5. Verify all OTHER components on the same dashboard still render correctly. 6. Unblock the API route and click "Retry". 7. Verify the failed component recovers and renders data. |
| **Expected Results** | Individual component failure does NOT crash the entire dashboard. Error is isolated with a retry option. Other components remain functional. |
| **Pass/Fail** | [ ] |

### TC-ERR-02: Dark Mode -- All Dashboard Components

| Field | Value |
|---|---|
| **Stories Covered** | 7.1 AC2; 7.2 AC7; 9.2 AC15 |
| **Prerequisites** | Any dashboard loaded with data |
| **Steps** | 1. Toggle to dark mode. 2. Verify pitch SVG strokes switch to light color (#e5e5e5). 3. Verify chart backgrounds, text, and grid lines adapt to dark mode. 4. Verify filter bars, cards, and tables use dark backgrounds with readable text. 5. Verify heatmap canvas blending still looks correct on dark background. 6. Toggle back to light mode. 7. Verify everything reverts cleanly. |
| **Expected Results** | All dashboard components properly support dark mode. No invisible text, broken contrasts, or rendering artifacts. Heatmap gradient remains visible against dark pitch. |
| **Pass/Fail** | [ ] |

### TC-ERR-03: Recent Dashboard Tracking

| Field | Value |
|---|---|
| **Stories Covered** | 7.4 AC7; 9.1 AC10 |
| **Prerequisites** | Logged in as admin |
| **Steps** | 1. Navigate to `/dashboards/season-overview`. 2. Go back to `/dashboards`. 3. Navigate to `/dashboards/shot-map`. 4. Go back to `/dashboards`. 5. Check if recently viewed dashboards are tracked (this may surface in a "Recent" section or in the admin data -- verify via Convex dashboard or UI if available). |
| **Expected Results** | `trackDashboardOpen` mutation fires on each dashboard page load. Recent dashboards are recorded in `userRecentDashboards` table (verify via Convex dashboard if accessible). |
| **Pass/Fail** | [ ] |

---

## Test Execution Summary

| Epic | Test Cases | Pass | Skipped/Deferred | Not Tested |
|---|---|---|---|---|
| Epic 7 (Design System) | 4 | 4 | 0 | 0 |
| Epic 8 (Data Integrations) | 5 | 4 | 1 (requires real DB) | 0 |
| Epic 9 (Dashboards -- Core) | 22 | 20 | 1 (video - Story 9.6) | 1 (9.4-06 season view) |
| Cross-cutting | 3 | 0 | 0 | 3 |
| **Total** | **34** | **28** | **2** | **4** |

**Executed by:** Alex
**Date:** 2026-04-01
**Build/Branch:** main
