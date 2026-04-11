# Story 12.2: UX Feedback Fixes

Status: ready-for-dev
Sprint: 2
Epic: 12 (Sprint 1 Polish)
Story Type: frontend

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/`.

## Story

As a club staff member,
I want the platform's UX issues identified during the Sprint 1 demo to be fixed,
so that the interface matches the client's expectations for date formatting, player layout, nationality entry, and calendar navigation.

This story bundles four discrete UX fixes raised during the Sprint 1 client demo:

1. **Calendar navigation bug** -- a visual glitch when navigating to May and then back to the current month.
2. **Players page layout** -- redesign the table-based player list into a card-based layout grouped by position (Goalkeepers, Defenders, Midfielders, Forwards), matching the client's reference screenshots.
3. **Nationality dropdown** -- replace the free-text nationality input field with a searchable country dropdown.
4. **Date format DD/MM/YYYY** -- switch all dates across the platform from US-style (`MMM d, yyyy` / `MM/dd`) to European-style (`dd/MM/yyyy`).

## Acceptance Criteria (BDD)

### Fix 1: Calendar Navigation Bug

```gherkin
Scenario: Calendar month navigation does not produce visual glitches
  Given I am viewing the calendar on the current month
  When I navigate forward to May and then back to the current month
  Then the calendar grid renders correctly without duplicate rows, overlapping cells, or stale day labels
  And the events for the current month are displayed correctly
```

1. **Calendar navigation renders cleanly after forward/back navigation** -- Navigating forward one or more months (e.g., to May 2026) and then back to the starting month produces a clean render with no visual artifacts. The Schedule-X `onRangeUpdate` callback and the `calendarApp.events.set()` sync in `CalendarView.tsx` must not leave stale state. Verify by navigating forward 2 months, back 2 months, and confirming the grid and events render correctly each time.

2. **No duplicate or missing events after navigation** -- After navigating away and back, the event count displayed matches the expected count for that month. The `prevSnapshotRef` deduplication logic must correctly invalidate when the month changes.

### Fix 2: Players Page -- Card Layout Grouped by Position

```gherkin
Scenario: Players page displays cards grouped by position
  Given I am on the /players page
  And there are players with positions Goalkeeper, Defender, Midfielder, Forward
  When the page loads
  Then I see four position sections with headers: "Goalkeepers", "Defenders", "Midfielders", "Forwards"
  And each section contains player cards for players of that position
  And each card displays the player's photo, name, squad number, and status indicator
  And empty position groups are hidden
```

3. **Players are displayed as cards grouped into four position sections** -- The `/players` page replaces the current `PlayerTable` (data table with columns) with a card-based layout. Players are grouped into four sections displayed in positional order: Goalkeepers, Defenders, Midfielders, Forwards. Each section has a heading (e.g., "Goalkeepers") with a colored left-border accent. Sections with no players of that position are not rendered.

4. **Player card design matches the client reference screenshots** -- Each player card displays:
   - A circular avatar/photo (or initials fallback) centered at the top of the card
   - The player's full name below the avatar
   - The squad number (if assigned)
   - A colored border or accent on the card (the screenshots show cards with a colored left or top border that varies -- green for most, red/orange for certain statuses)
   - A status indicator consistent with the existing `PlayerStatusBadge` (the screenshots show small colored dots/indicators on the card corner)
   - Cards within each group are arranged in a responsive grid (the screenshots show roughly 5-6 cards per row on desktop, wrapping on smaller screens)

5. **Card-based layout target design (from client screenshots)** -- The dev agent MUST study the four reference screenshots in `docs/reference/screenshots/player profile screenshots/` to match the visual design:
   - **Screenshot `14.15.15.png`**: Shows the full page with position sections. The page title is "SQUAD" at top. Each position group has a colored section header/label on the left side (yellow for "Goalkeepers", green for "Defenders", green for "Midfielders", red/coral for "Forwards"). Cards are arranged in a horizontal grid, ~5 per row. Each card has a circular photo, player name, and a subtle colored border. The overall layout is clean, with generous spacing between sections.
   - **Screenshot `14.15.26.png`**: Closer view showing individual cards more clearly. Cards show: round avatar photo, player name in bold below, and a status color-coding on the card border (green border = available, red/orange = other status). Some cards show squad numbers. Cards are compact but readable.
   - **Screenshot `14.16.32.png`**: Shows a "STAFF PROFILES" page with a different layout -- staff grouped by role (Performance, Coach, Recruitment, Medical). This is NOT the players page but shows the position-grouping pattern the client likes: a colored label on the left, then member cards to the right. This confirms the grouping UI pattern.
   - **Screenshot `14.16.41.png`**: Another "STAFF PROFILES" view. Reinforces the pattern: role-based grouping with a label badge, then circular avatars with names. Clean, minimal cards.

   The key takeaway: the players page should use horizontal card grids grouped by position, with each group having a distinct colored label/header, and each card showing a centered circular avatar + name + status indicator.

6. **Clicking a player card navigates to the player profile** -- Clicking any player card navigates to `/players/[playerId]`, preserving the existing `onPlayerClick` behavior.

7. **Filters and search still work with the new layout** -- The existing `PlayerListFilters` component (status tabs + search input) remains above the card grid. Filtering by status or searching by name still works correctly, filtering which cards are displayed. The "Add Player" button for admins remains in the page header.

8. **The existing `PlayerTable` component is preserved but no longer used on the main page** -- Do NOT delete `PlayerTable.tsx`. It may be reused elsewhere. Create a new `PlayerCardGrid.tsx` (or similar) component for the card layout. The players page (`apps/web/src/app/(app)/players/page.tsx`) switches to rendering the new card grid component instead of `PlayerTable`.

### Fix 3: Nationality Dropdown

```gherkin
Scenario: Nationality field is a searchable dropdown
  Given I am creating or editing a player profile
  When I click the Nationality field
  Then a searchable dropdown appears with a list of countries
  And I can type to filter the list
  And selecting a country populates the field
```

9. **Nationality field uses a searchable combobox/dropdown** -- In `ProfileForm.tsx`, the nationality field (currently a plain `<Input>` with `placeholder="e.g. England"`) is replaced with a searchable dropdown (combobox pattern using shadcn `Command` + `Popover`, or shadcn `Select` with search). The dropdown contains a comprehensive list of countries/nationalities (use a static list of ~200 countries, e.g., ISO 3166-1 country names or common nationality demonyms like "English", "Italian", "French", etc.). The user can type to filter the list. The selected value is stored as a string (same schema, no backend changes needed).

10. **The country list is comprehensive and sorted alphabetically** -- The dropdown list contains at minimum all FIFA-recognized nations, sorted alphabetically. The list is defined as a constant array in a dedicated file (e.g., `apps/web/src/lib/countries.ts` or `apps/web/src/constants/countries.ts`).

11. **Existing nationality values are preserved** -- When editing a player who already has a nationality value set (free-text from before), the combobox pre-selects the matching entry if found, or displays the raw value if no match exists. The form does not break for legacy data.

### Fix 4: European Date Format (DD/MM/YYYY)

```gherkin
Scenario: All dates display in DD/MM/YYYY format
  Given I am viewing any page with dates
  Then all dates are displayed in DD/MM/YYYY or "dd MMM yyyy" European-style format
  And no dates use MM/DD/YYYY or US-style month-first ordering
```

12. **All `date-fns` `format()` calls use European-style date ordering** -- Every file in `apps/web/src/` that calls `format()` from `date-fns` for user-visible date display must use European date ordering. The specific transformations required:

| Current pattern | New pattern | Example |
|---|---|---|
| `"MMM d, yyyy"` | `"dd/MM/yyyy"` | `07/04/2026` |
| `"d MMM yyyy"` | `"dd/MM/yyyy"` | `07/04/2026` |
| `"dd MMM yyyy"` | `"dd/MM/yyyy"` | `07/04/2026` |
| `"EEEE, d MMMM yyyy"` | `"EEEE dd/MM/yyyy"` | `Tuesday 07/04/2026` |
| `"EEE, d MMM yyyy 'at' HH:mm"` | `"EEE dd/MM/yyyy 'at' HH:mm"` | `Tue 07/04/2026 at 14:00` |
| `"EEEE, d MMMM yyyy 'at' HH:mm"` | `"EEEE dd/MM/yyyy 'at' HH:mm"` | `Tuesday 07/04/2026 at 14:00` |
| `"PPP"` (locale-dependent long date) | `"dd/MM/yyyy"` | `07/04/2026` |

Time-only formats (`"HH:mm"`) remain unchanged. The `"dd MMM yyyy"` pattern already used in some player components (e.g., `StatsLog.tsx`, `InjuryLog.tsx`) should also be changed to `"dd/MM/yyyy"` for full consistency.

13. **`toLocaleDateString("en-US", ...)` calls are switched to European formatting** -- The files `user-table.tsx`, `user-detail.tsx`, and `admin-table.tsx` use `toLocaleDateString("en-US", ...)`. These must be changed to use `date-fns` `format()` with `"dd/MM/yyyy"` or switched to `toLocaleDateString("en-GB", ...)` to produce day-first ordering.

14. **Date pickers display in DD/MM/YYYY format** -- The calendar date picker trigger buttons in `EventForm.tsx` and `RecurrenceOptions.tsx` (currently using `format(date, "PPP")`) display dates as `dd/MM/yyyy`.

## Tasks / Subtasks

### Task 1: Fix Calendar Navigation Bug (AC: #1, #2)

- [ ] **1.1: Investigate the Schedule-X navigation glitch** -- Open `apps/web/src/components/calendar/CalendarView.tsx`. The likely cause is that the `prevSnapshotRef` deduplication prevents re-rendering events when navigating back to a previously visited month because the snapshot string matches. Alternatively, the `onRangeUpdate` callback may fire mid-transition causing a render flash. Add `console.log` traces to `onRangeUpdate` and the `useEffect` that calls `calendarApp.events.set()` to identify the exact sequence.

- [ ] **1.2: Fix the root cause** -- Likely fix: ensure `calendarApp.events.set()` is called with the correct event set every time the month changes, even if the snapshot string has not changed (the visible range may differ). Consider clearing `prevSnapshotRef` when `onRangeUpdate` fires so the next render always pushes events. Test by navigating forward 3 months and back 3 months rapidly.

- [ ] **1.3: Manual QA** -- Verify navigation between months (including crossing year boundaries) produces no visual glitches, duplicate rows, or missing events.

### Task 2: Build Player Card Grid Component (AC: #3, #4, #5, #6, #7, #8)

- [ ] **2.1: Study the four client reference screenshots** -- Before writing any code, read and analyze all four images in `docs/reference/screenshots/player profile screenshots/`. Note the card dimensions, avatar size, typography, spacing between cards, section header styling, and color-coding scheme.

- [ ] **2.2: Create `PlayerCardGrid.tsx`** -- Create a new component at `apps/web/src/components/players/PlayerCardGrid.tsx`. It should:
  - Accept the same `PlayerSummary[]` and `onPlayerClick` props as `PlayerTable`
  - Group players by `position` into four ordered buckets: Goalkeeper, Defender, Midfielder, Forward
  - For each non-empty group, render a section with:
    - A heading/label with a colored accent (use position-specific colors: e.g., yellow/amber for GK, green for Defenders, blue/teal for Midfielders, red/coral for Forwards -- matching the screenshot color scheme)
    - A responsive card grid (CSS grid or flexbox, ~4-6 columns on desktop, 2-3 on tablet, 1-2 on mobile)
  - Each card renders:
    - Circular `Avatar` component (with photo or initials fallback)
    - Player full name (bold, truncated if long)
    - Squad number (if assigned)
    - `PlayerStatusBadge` or a colored dot indicator
    - The whole card is clickable (calls `onPlayerClick`)
  - Use shadcn `Card` component as the card container

- [ ] **2.3: Update players page to use `PlayerCardGrid`** -- In `apps/web/src/app/(app)/players/page.tsx`, replace `<PlayerTable>` with `<PlayerCardGrid>`. Keep `PlayerListFilters` and the header/admin button unchanged.

- [ ] **2.4: Update the loading skeleton** -- Update `PlayerListSkeleton` in the players page to show card-shaped skeletons instead of table rows, matching the new layout.

### Task 3: Nationality Searchable Dropdown (AC: #9, #10, #11)

- [ ] **3.1: Create a countries constant file** -- Create `apps/web/src/lib/countries.ts` exporting a `COUNTRIES` array of `{ value: string, label: string }` objects. Include all FIFA-recognized nations (at minimum). Use country names as both value and label (e.g., `{ value: "England", label: "England" }`, `{ value: "Italy", label: "Italy" }`). Sort alphabetically. This keeps the nationality field storing a human-readable country name string (no schema change).

- [ ] **3.2: Replace the nationality `<Input>` with a searchable combobox** -- In `apps/web/src/components/players/ProfileForm.tsx` (around line 292-307), replace the plain `<Input>` for nationality with a combobox built from shadcn `Popover` + `Command` (CommandInput + CommandList + CommandItem). The combobox should:
  - Show a trigger button displaying the currently selected country (or placeholder "Select nationality...")
  - Open a popover with a search input at the top
  - Filter the `COUNTRIES` list as the user types
  - Set the form field value on selection
  - Support clearing the selection (optional/nullable field)

- [ ] **3.3: Verify backwards compatibility** -- Test that editing a player whose nationality was entered as free text (e.g., "English" instead of "England") does not cause errors. The combobox should attempt to match the existing value; if no match, display the raw value and allow the user to re-select.

### Task 4: European Date Format (DD/MM/YYYY) (AC: #12, #13, #14)

- [ ] **4.1: Create a shared date formatting utility** -- Create `apps/web/src/lib/date-format.ts` exporting helper functions:
  ```ts
  import { format } from "date-fns";

  /** Standard date: 07/04/2026 */
  export function formatDate(date: Date | number): string {
    return format(new Date(date), "dd/MM/yyyy");
  }

  /** Date with time: 07/04/2026 at 14:00 */
  export function formatDateTime(date: Date | number): string {
    return format(new Date(date), "dd/MM/yyyy 'at' HH:mm");
  }

  /** Full date with day name: Tuesday 07/04/2026 */
  export function formatDateFull(date: Date | number): string {
    return format(new Date(date), "EEEE dd/MM/yyyy");
  }

  /** Short date with day name: Tue 07/04/2026 at 14:00 */
  export function formatDateTimeShort(date: Date | number): string {
    return format(new Date(date), "EEE dd/MM/yyyy 'at' HH:mm");
  }
  ```

- [ ] **4.2: Update all date-fns `format()` calls in calendar components** -- Update the following files to use the new helpers or direct `dd/MM/yyyy` patterns:
  - `apps/web/src/components/calendar/EventDetail.tsx` -- lines 200, 337 (full date), lines 246 (date)
  - `apps/web/src/components/calendar/EventForm.tsx` -- lines 354, 392 (`"PPP"` -> `"dd/MM/yyyy"`)
  - `apps/web/src/components/calendar/TodayDisplay.tsx` -- line 88 (full date)
  - `apps/web/src/components/calendar/DayEventsPanel.tsx` -- line 62 (full date)
  - `apps/web/src/components/calendar/RecurrenceOptions.tsx` -- line 140 (`"PPP"` -> `"dd/MM/yyyy"`)
  - `apps/web/src/components/calendar/CalendarView.tsx` -- line 127 (time only -- no change needed)

- [ ] **4.3: Update all date-fns `format()` calls in player components** -- Update:
  - `apps/web/src/components/players/StatsLog.tsx` -- line 174
  - `apps/web/src/components/players/StatsFormDialog.tsx` -- line 162
  - `apps/web/src/components/players/PlayerProfileTabs.tsx` -- line 158
  - `apps/web/src/components/players/InjuryLog.tsx` -- lines 91, 117, 260
  - `apps/web/src/components/players/InjuryFormDialog.tsx` -- lines 207, 389
  - `apps/web/src/components/players/FitnessLog.tsx` -- lines 169, 186, 199, 235
  - `apps/web/src/components/players/FitnessFormDialog.tsx` -- line 158
  - `apps/web/src/components/players/DeleteStatsDialog.tsx` -- line 41
  - `apps/web/src/components/players/DeleteInjuryDialog.tsx` -- line 39
  - `apps/web/src/components/players/DeleteFitnessDialog.tsx` -- line 41

- [ ] **4.4: Update all date-fns `format()` calls in document components** -- Update:
  - `apps/web/src/components/documents/DocumentDetail.tsx` -- lines 147, 154
  - `apps/web/src/components/documents/DocumentCard.tsx` -- line 119
  - `apps/web/src/components/documents/DocumentSearchResults.tsx` -- line 165
  - `apps/web/src/components/documents/ReadTrackerDetail.tsx` -- line 45

- [ ] **4.5: Update all date-fns `format()` calls in home/homepage components** -- Update:
  - `apps/web/src/components/home/upcoming-fixtures.tsx` -- line 108-110
  - `apps/web/src/components/home/recent-results.tsx` -- line 152
  - `apps/web/src/components/home/match-countdown.tsx` -- lines 164-167
  - `apps/web/src/components/homepage/TodayEventsWidget.tsx` -- line 42 (full date), lines 65-66 (time only -- no change)
  - `apps/web/src/components/homepage/NextMatchWidget.tsx` -- line 47

- [ ] **4.6: Update `toLocaleDateString` calls** -- In the following files, replace `toLocaleDateString("en-US", ...)` with `format(new Date(timestamp), "dd/MM/yyyy")` (importing from date-fns):
  - `apps/web/src/components/app/dashboard/user-table.tsx` -- line 123
  - `apps/web/src/components/app/dashboard/user-detail.tsx` -- line 176
  - `apps/web/src/components/app/dashboard/admin-table.tsx` -- line 113

- [ ] **4.7: Verify no remaining US-format dates** -- Search the entire `apps/web/src/` for any remaining `format(` calls using `"MMM d"`, `"d MMM"`, `"PPP"`, or `toLocaleDateString("en-US"` patterns. Fix any that are found. Confirm all user-visible dates follow `dd/MM/yyyy`.

## Dev Notes

- **No backend changes required.** All four fixes are purely frontend. The nationality field stores a string regardless of whether it comes from free text or a dropdown. Date formatting is a display concern only.
- **Schedule-X version:** The calendar uses `@schedule-x/react` with `@schedule-x/calendar` v4 (Temporal-based API). The navigation bug may be related to Temporal.ZonedDateTime conversion or the event snapshot deduplication. Check Schedule-X GitHub issues for known month-navigation bugs.
- **Player positions in the database** use the exact strings from `PLAYER_POSITIONS` in `packages/shared/players.ts`: `"Goalkeeper"`, `"Defender"`, `"Midfielder"`, `"Forward"`. The card grid grouping should match on these exact values.
- **Country list source:** Use a well-known static list. Good options: copy from an npm package like `country-list` or use the ISO 3166-1 list. Include common football nations and territories (e.g., England, Scotland, Wales, Northern Ireland as separate entries -- not just "United Kingdom").
- **Preserve `PlayerTable.tsx`** -- do not delete it. It may be reused for other views (e.g., admin reports).
- **The `PPP` format token** in date-fns is locale-dependent. Replacing it with an explicit `"dd/MM/yyyy"` removes locale ambiguity entirely.

### References

- Client player profile screenshots: `docs/reference/screenshots/player profile screenshots/`
  - `Screenshot 2026-04-07 at 14.15.15.png` -- Full squad page with position-grouped cards
  - `Screenshot 2026-04-07 at 14.15.26.png` -- Closer view of individual player cards
  - `Screenshot 2026-04-07 at 14.16.32.png` -- Staff profiles page showing grouping pattern
  - `Screenshot 2026-04-07 at 14.16.41.png` -- Staff profiles alternate view
- Original platform: `brainAnalytics/football-dashboard-2/src/app/(dashboard)/`
- Current player list page: `apps/web/src/app/(app)/players/page.tsx`
- Current player table: `apps/web/src/components/players/PlayerTable.tsx`
- Current profile form (nationality field): `apps/web/src/components/players/ProfileForm.tsx`
- Calendar view: `apps/web/src/components/calendar/CalendarView.tsx`
- Player positions definition: `packages/shared/players.ts`

## Dev Agent Record

- **Status:** not started
- **Started:** --
- **Completed:** --
- **Notes:** --
