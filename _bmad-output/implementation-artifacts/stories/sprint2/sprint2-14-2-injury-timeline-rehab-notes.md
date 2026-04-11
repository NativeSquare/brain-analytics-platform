# Story 14.2: Injury Timeline & Rehab Notes

Status: ready
Story Type: fullstack
Sprint: 2
Epic: 14 — Injury Reporting

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As a medical staff member or admin,
I want to see a visual timeline of a player's injury history and add timestamped rehab notes to each injury,
so that I can quickly assess a player's injury pattern over time and track rehabilitation progress with clinical context.

## Dependencies

| Dependency | Story | What Must Exist |
|------------|-------|-----------------|
| `playerInjuries` table with clinical classification fields | Story 14.1 | Schema extended with `bodyRegion`, `mechanism`, `side` fields. CRUD mutations with medical role guard. |
| Injury Log UI on player profile | Story 5.5 (done) | `InjuryLog.tsx`, `InjuryFormDialog.tsx`, `DeleteInjuryDialog.tsx` exist and are functional |
| `requireRole`, `requireAuth` helpers | Story 2.1 (done) | `packages/backend/convex/lib/auth.ts` exports these |
| `INJURY_SEVERITIES`, `INJURY_STATUSES` constants | Story 5.1 (done) | Exported from `packages/shared/players` |
| shadcn/ui components | Story 1.2 (done) | Card, Badge, Button, Textarea, Dialog, Skeleton, Tooltip, ScrollArea available |

## Acceptance Criteria (BDD)

### AC 1: Vertical injury timeline component exists

**Given** the user has the `admin` or `physio` role and navigates to a player's "Injuries" tab,
**When** injuries exist for the player,
**Then** a new "Timeline" view is available alongside the existing table view (toggle via segmented control or tabs: "Table" / "Timeline"),
**And** the timeline displays injuries in reverse chronological order (most recent first),
**And** each timeline entry is connected by a vertical line with a severity-colored dot/marker.

### AC 2: Timeline entries show complete injury context

**Given** the timeline view is displayed,
**When** each injury entry is rendered,
**Then** it shows:
- **Injury type** (e.g. "Hamstring strain") as the entry title
- **Body region** (e.g. "Upper Leg") as a secondary label (from Story 14.1 schema)
- **Severity badge**: color-coded (`minor` = green, `moderate` = amber/orange, `severe` = red)
- **Injury date** formatted as DD/MM/YYYY
- **Expected return date** formatted as DD/MM/YYYY (or "TBD" if not set)
- **Actual return date** (clearance date) formatted as DD/MM/YYYY (or "—" if still active)
- **Days out counter**: calculated as the difference between injury date and actual return date (if recovered) or between injury date and today (if still active), displayed as "X days"
- **Status indicator**: "Active" injuries have a pulsing/highlighted left border or background; "Recovered" entries are visually muted

### AC 3: Severity color-coding is consistent

**Given** an injury entry in the timeline,
**When** the severity is rendered,
**Then** the following color mapping is applied throughout (dot, badge, and optional left border accent):
- `minor` → green (`bg-green-100 text-green-800` / dark mode `bg-green-900/40 text-green-300`)
- `moderate` → amber/orange (`bg-orange-100 text-orange-800` / dark mode `bg-orange-900/40 text-orange-300`)
- `severe` → red (`bg-red-100 text-red-800` / dark mode `bg-red-900/40 text-red-300`)

### AC 4: Active injuries are visually distinguished

**Given** the timeline displays both active and recovered injuries,
**When** an injury has `status === "current"`,
**Then** it is rendered with:
- A highlighted left border or subtle background highlight
- A "Currently Active" or "Active" badge in destructive variant
- The days out counter shows "X days (ongoing)" with the count updating based on today's date

**And** when an injury has `status === "recovered"`,
**Then** it is rendered with:
- A muted/default styling
- A "Recovered" badge in green variant
- The days out counter shows the final total days between injury date and clearance date

### AC 5: `injuryRehabNotes` table schema exists

**Given** the Convex backend is deployed,
**When** the schema is inspected,
**Then** an `injuryRehabNotes` table exists with the following fields:
- `teamId` (id reference to `teams`) — required
- `injuryId` (id reference to `playerInjuries`) — required
- `authorId` (id reference to `users`) — required (the medical staff member who wrote the note)
- `note` (string) — required, max 2000 characters
- `createdAt` (number) — Unix timestamp ms
- `updatedAt` (number) — Unix timestamp ms

**And** the table has indexes:
- `by_injuryId` on `["injuryId"]`
- `by_teamId` on `["teamId"]`

### AC 6: `getRehabNotes` query returns notes for an injury

**Given** the user has the `admin` or `physio` role,
**When** `players.queries.getRehabNotes` is called with `{ injuryId: Id<"playerInjuries"> }`,
**Then** it calls `requireRole(ctx, ["admin", "physio"])`, validates the injury exists and belongs to the user's team, queries `injuryRehabNotes` using the `by_injuryId` index, resolves each note's author name by joining with the `users` table, returns an array of notes sorted by `createdAt` ascending (oldest first) with shape: `{ _id, injuryId, authorId, authorName, note, createdAt, updatedAt }`.

### AC 7: `addRehabNote` mutation creates a rehab note

**Given** the user has the `admin` or `physio` role,
**When** `players.mutations.addRehabNote` is called with `{ injuryId: Id<"playerInjuries">, note: string }`,
**Then** it calls `requireRole(ctx, ["admin", "physio"])`, validates the injury exists and belongs to the user's team, validates `note` is non-empty and <= 2000 characters, inserts a new `injuryRehabNotes` document with `teamId`, `injuryId`, `authorId: user._id`, `note`, `createdAt: Date.now()`, `updatedAt: Date.now()`, and returns the new note `_id`.

### AC 8: `updateRehabNote` mutation updates an existing note

**Given** the user has the `admin` or `physio` role,
**When** `players.mutations.updateRehabNote` is called with `{ noteId: Id<"injuryRehabNotes">, note: string }`,
**Then** it calls `requireRole(ctx, ["admin", "physio"])`, validates the note exists and belongs to the user's team, validates `note` is non-empty and <= 2000 characters, patches the document with the new `note` and `updatedAt: Date.now()`, and returns the `noteId`.

### AC 9: `deleteRehabNote` mutation removes a note

**Given** the user has the `admin` or `physio` role,
**When** `players.mutations.deleteRehabNote` is called with `{ noteId: Id<"injuryRehabNotes"> }`,
**Then** it calls `requireRole(ctx, ["admin", "physio"])`, validates the note exists and belongs to the user's team, deletes the document.

### AC 10: Rehab notes are displayed under each injury (timeline and table)

**Given** an injury record is expanded or selected in the timeline or table view,
**When** rehab notes exist for that injury,
**Then** they are displayed chronologically (oldest first) below the injury details, each showing:
- Author name
- Timestamp formatted as "DD/MM/YYYY HH:mm"
- Note text
- Edit and Delete action buttons (visible to admin/physio users)

**And** when no notes exist, a message "No rehab notes yet" is shown.

### AC 11: Add rehab note form

**Given** the user has the `admin` or `physio` role and is viewing an injury's detail or timeline entry,
**When** they click "Add Note" or expand the notes section,
**Then** a textarea input (max 2000 chars) with a "Save Note" button appears,
**And** submitting calls `addRehabNote`, shows a success toast ("Rehab note added"), clears the textarea, and the new note appears in real time.
**And** the submit button is disabled while the textarea is empty.

### AC 12: Edit and delete rehab notes

**Given** a rehab note is displayed,
**When** the user clicks "Edit" on a note,
**Then** the note text becomes editable in a textarea, with "Save" and "Cancel" buttons,
**And** clicking "Save" calls `updateRehabNote` and shows a success toast ("Rehab note updated").

**Given** a rehab note is displayed,
**When** the user clicks "Delete" on a note,
**Then** a confirmation prompt appears ("Delete this rehab note? This action cannot be undone."),
**And** confirming calls `deleteRehabNote`, shows a success toast ("Rehab note deleted"), and the note disappears in real time.

### AC 13: Mock data for rehab notes

**Given** `USE_MOCK_DATA=true` is set,
**When** rehab notes data is needed during development,
**Then** a mock data file `apps/web/src/lib/mock-data/injury-rehab-notes.json` provides 6-8 sample rehab notes spread across 2-3 existing mock injuries, authored by different mock medical staff users, with realistic rehabilitation content (e.g., "Initial assessment: Grade 2 hamstring strain. MRI scheduled for tomorrow.", "Completed first week of rehab protocol. Pain-free walking achieved.", "Returned to light jogging. Cleared for non-contact training next week.").

### AC 14: Timeline summary stats

**Given** the timeline view is displayed,
**When** injuries exist for the player,
**Then** a summary bar at the top of the timeline shows:
- **Total injuries**: count of all injury records
- **Total days lost**: sum of all days out across all injuries
- **Currently active**: count of injuries with `status === "current"`
- **Average recovery**: average days out for recovered injuries (or "N/A" if no recovered injuries)

### AC 15: Team-scoped data access enforced

**Given** any rehab note query or mutation,
**When** it executes,
**Then** all operations validate `teamId` from `requireRole`. No cross-team rehab note data is ever returned or modifiable.

### AC 16: Real-time updates

**Given** the timeline or notes section is open,
**When** another medical staff member adds, edits, or deletes a rehab note or injury,
**Then** the changes appear in real time without manual refresh (via Convex `useQuery` subscriptions).

### AC 17: i18n translation keys

**Given** the i18n system is in place,
**When** the timeline and rehab notes UI is rendered,
**Then** all user-facing strings use translation keys from the existing `useTranslation` hook pattern (add `injuryTimeline` and `rehabNotes` sections to both English and Italian translation files).

## Tasks / Subtasks

### Task 1: Define `injuryRehabNotes` Convex schema table (AC: #5)

- [ ] 1.1: Create `packages/backend/convex/table/injuryRehabNotes.ts` defining the table with fields: `teamId: v.id("teams")`, `injuryId: v.id("playerInjuries")`, `authorId: v.id("users")`, `note: v.string()`, `createdAt: v.number()`, `updatedAt: v.number()`. Add indexes: `by_injuryId` on `["injuryId"]`, `by_teamId` on `["teamId"]`.
- [ ] 1.2: Import and register the `injuryRehabNotes` table in `packages/backend/convex/schema.ts`: add `import { injuryRehabNotes } from "./table/injuryRehabNotes"` and include `injuryRehabNotes` in the `defineSchema` call.
- [ ] 1.3: Provide the Convex CLI command to the user to verify schema deploys: `npx convex dev`

### Task 2: Create rehab notes query function (AC: #6, #15)

- [ ] 2.1: In `packages/backend/convex/players/queries.ts`, implement `getRehabNotes` query: accepts `{ injuryId: v.id("playerInjuries") }`, calls `requireRole(ctx, ["admin", "physio"])`. Fetches the injury via `ctx.db.get(injuryId)`, validates it exists and `teamId` matches (throw `NOT_FOUND` if not). Queries `injuryRehabNotes` using the `by_injuryId` index filtering by `injuryId`. For each note, fetches the author from the `users` table to resolve `authorName` (use `user.name ?? user.email ?? "Unknown"`). Sorts results by `createdAt` ascending. Returns array of `{ _id, injuryId, authorId, authorName, note, createdAt, updatedAt }`.
- [ ] 2.2: Verify query returns an empty array (not `null`) when no notes exist for the injury.
- [ ] 2.3: Verify query throws `NOT_AUTHORIZED` when called by a non-admin/non-physio user.

### Task 3: Create rehab notes mutation functions (AC: #7, #8, #9, #15)

- [ ] 3.1: In `packages/backend/convex/players/mutations.ts`, implement `addRehabNote` mutation: accepts `{ injuryId: v.id("playerInjuries"), note: v.string() }`. Calls `requireRole(ctx, ["admin", "physio"])`. Fetches the injury via `ctx.db.get(injuryId)`, validates it exists and `teamId` matches (throw `NOT_FOUND` if not). Validates `note` is non-empty after trimming (throw `VALIDATION_ERROR` with "Note is required"). Validates `note.length <= 2000` (throw `VALIDATION_ERROR` with "Note cannot exceed 2000 characters"). Inserts into `injuryRehabNotes` with `teamId`, `injuryId`, `authorId: user._id`, `note`, `createdAt: Date.now()`, `updatedAt: Date.now()`. Returns the new `_id`.
- [ ] 3.2: Implement `updateRehabNote` mutation: accepts `{ noteId: v.id("injuryRehabNotes"), note: v.string() }`. Calls `requireRole(ctx, ["admin", "physio"])`. Fetches the note via `ctx.db.get(noteId)`, validates it exists and `teamId` matches (throw `NOT_FOUND` if not). Validates note content (same rules as addRehabNote). Patches with new `note` and `updatedAt: Date.now()`. Returns `noteId`.
- [ ] 3.3: Implement `deleteRehabNote` mutation: accepts `{ noteId: v.id("injuryRehabNotes") }`. Calls `requireRole(ctx, ["admin", "physio"])`. Fetches the note via `ctx.db.get(noteId)`, validates it exists and `teamId` matches (throw `NOT_FOUND` if not). Calls `ctx.db.delete(noteId)`.

### Task 4: Create mock data for rehab notes (AC: #13)

- [ ] 4.1: Create `apps/web/src/lib/mock-data/injury-rehab-notes.json` with 6-8 sample rehab notes. Each note includes: `injuryId` (reference placeholder matching existing mock injuries), `authorName` (e.g. "Dr. Marco Rossi", "Lucia Bianchi"), `note` (realistic rehabilitation content), `createdAt` (Unix timestamp ms, spaced across days/weeks). Cover different rehab phases: initial assessment, treatment plan, progress updates, return-to-play clearance.

Sample notes content:
```json
[
  { "injuryId": "mock-injury-1", "authorName": "Dr. Marco Rossi", "note": "Initial assessment: Grade 2 hamstring strain, right leg. MRI confirms partial tear of the biceps femoris. Estimated 4-6 weeks recovery. Ice and compression protocol initiated.", "createdAt": 1711900800000 },
  { "injuryId": "mock-injury-1", "authorName": "Dr. Marco Rossi", "note": "Day 5: Swelling reduced significantly. Patient reports reduced pain at rest (3/10). Started passive ROM exercises. No weight-bearing activities yet.", "createdAt": 1712332800000 },
  { "injuryId": "mock-injury-1", "authorName": "Lucia Bianchi", "note": "Week 2: Progressed to active ROM and light resistance band work. Pain-free walking achieved. Hydrotherapy sessions 3x/week.", "createdAt": 1712937600000 },
  { "injuryId": "mock-injury-1", "authorName": "Dr. Marco Rossi", "note": "Week 4: Cleared for light jogging on grass. Strength at 80% of contralateral limb. Continue progressive loading protocol.", "createdAt": 1714147200000 },
  { "injuryId": "mock-injury-1", "authorName": "Lucia Bianchi", "note": "Week 5: Completed return-to-run programme. Full sprint testing scheduled for next session. No adverse reaction to increased load.", "createdAt": 1714752000000 },
  { "injuryId": "mock-injury-2", "authorName": "Dr. Marco Rossi", "note": "Initial assessment: Right ankle lateral ligament sprain (Grade 1). RICE protocol initiated. X-ray negative for fracture. Expected return 10-14 days.", "createdAt": 1713542400000 },
  { "injuryId": "mock-injury-2", "authorName": "Lucia Bianchi", "note": "Day 7: Ankle stability improving. Started proprioception exercises on wobble board. Strapping for light training from tomorrow.", "createdAt": 1714147200000 },
  { "injuryId": "mock-injury-2", "authorName": "Dr. Marco Rossi", "note": "Day 12: Full range of motion restored. Completed agility drills without pain. Cleared for full training and match selection.", "createdAt": 1714579200000 }
]
```

### Task 5: Build InjuryTimeline component (AC: #1, #2, #3, #4, #14)

- [ ] 5.1: Create `apps/web/src/components/players/InjuryTimeline.tsx`. Accepts `{ playerId: Id<"players">, injuries: PlayerInjury[] }` props (injuries passed from parent to avoid duplicate queries).
- [ ] 5.2: Render a summary stats bar at the top (AC #14): "Total Injuries: {count}", "Total Days Lost: {sum}", "Currently Active: {activeCount}", "Avg Recovery: {avgDays} days". Use the existing `SummaryCard` pattern from `InjuryLog.tsx`. Compute all values via `useMemo`.
- [ ] 5.3: Render a vertical timeline layout. Each entry is a card positioned along a vertical line. The line connects severity-colored dots (circular markers). Use Tailwind CSS for the timeline layout:
  - Vertical line: `absolute left-4 top-0 bottom-0 w-0.5 bg-border` (or similar)
  - Dot: `absolute left-2.5 w-3 h-3 rounded-full border-2` with severity-based background color
  - Content card: `ml-10` offset from the line with `Card` component
- [ ] 5.4: For each injury entry, render inside the card:
  - Row 1: Injury type (bold) + severity badge (color-coded per AC #3) + status badge (Active = destructive, Recovered = green)
  - Row 2: Body region label (muted text, from Story 14.1 schema)
  - Row 3: Date details — "Injured: DD/MM/YYYY" | "Expected return: DD/MM/YYYY or TBD" | "Returned: DD/MM/YYYY or —"
  - Row 4: Days out counter — computed as `differenceInDays(clearanceDate ?? Date.now(), date)`. Display "X days" for recovered, "X days (ongoing)" for active.
- [ ] 5.5: Active injuries (`status === "current"`) get a highlighted left border (e.g., `border-l-4 border-destructive`) and subtle background accent. Recovered injuries use default card styling.
- [ ] 5.6: Below each timeline entry card, render the `RehabNotesSection` component (Task 7) for that injury.

### Task 6: Add Timeline/Table view toggle to InjuryLog (AC: #1)

- [ ] 6.1: In `apps/web/src/components/players/InjuryLog.tsx`, add a segmented control (use `ToggleGroup` from shadcn or a pair of `Button` variants) above the injury data with two options: "Table" (icon: `IconTable` or `IconList`) and "Timeline" (icon: `IconTimeline` or `IconHistory`). Default to "Table" view.
- [ ] 6.2: When "Table" is selected, render the existing table as-is.
- [ ] 6.3: When "Timeline" is selected, render the `InjuryTimeline` component, passing the `entries` data from the existing `useQuery`.
- [ ] 6.4: Persist the view preference in component state (no need for localStorage persistence in this story).

### Task 7: Build RehabNotesSection component (AC: #10, #11, #12, #16)

- [ ] 7.1: Create `apps/web/src/components/players/RehabNotesSection.tsx`. Accepts `{ injuryId: Id<"playerInjuries"> }` prop.
- [ ] 7.2: Call `useQuery(api.players.queries.getRehabNotes, { injuryId })`. Handle loading with a small `Skeleton`. Handle empty state with "No rehab notes yet" text.
- [ ] 7.3: Render notes chronologically (oldest first). Each note shows:
  - Author name (bold) + timestamp formatted as "DD/MM/YYYY HH:mm" (muted text)
  - Note text (preserving line breaks with `whitespace-pre-wrap`)
  - Action dropdown (three dots) with "Edit" and "Delete" options
- [ ] 7.4: Render an "Add Note" section below the notes list: a `Textarea` (placeholder: "Add a rehab note...", max 2000 chars) with a "Save Note" `Button`. Disable the button when textarea is empty. On submit: call `addRehabNote` mutation, show success toast ("Rehab note added"), clear the textarea. Handle errors via `ConvexError` catch and toast.
- [ ] 7.5: Edit mode: When "Edit" is clicked on a note, replace the note text with an editable `Textarea` pre-populated with the current text. Show "Save" and "Cancel" buttons. "Save" calls `updateRehabNote`, shows toast ("Rehab note updated"), exits edit mode. "Cancel" discards changes and exits edit mode.
- [ ] 7.6: Delete: When "Delete" is clicked, show a small inline confirmation ("Delete this note?") with "Confirm" and "Cancel" buttons (or use an `AlertDialog`). "Confirm" calls `deleteRehabNote`, shows toast ("Rehab note deleted"). Note disappears in real time.

### Task 8: Integrate RehabNotesSection into table view (AC: #10)

- [ ] 8.1: In `InjuryLog.tsx`, add an expandable row mechanism to the injury table. When a user clicks on an injury row (or clicks an expand chevron icon), the row expands to reveal the `RehabNotesSection` for that injury below the row.
- [ ] 8.2: Use a collapsible pattern: store `expandedInjuryId` in state. Only one injury can be expanded at a time (clicking another collapses the previous). Use `Collapsible` from shadcn/ui or a simple conditional render with animation.

### Task 9: Add i18n translation keys (AC: #17)

- [ ] 9.1: Add translation keys to the English translation file (`apps/web/src/locales/en.json` or equivalent). Keys to add under a new `injuryTimeline` section: `viewTable`, `viewTimeline`, `totalInjuries`, `totalDaysLost`, `currentlyActive`, `avgRecovery`, `injuredOn`, `expectedReturn`, `returnedOn`, `daysOut`, `ongoing`, `tbd`, `noInjuries`. Keys under `rehabNotes` section: `title`, `addNote`, `saveNote`, `editNote`, `deleteNote`, `deleteConfirm`, `noNotes`, `notePlaceholder`, `noteAdded`, `noteUpdated`, `noteDeleted`, `noteRequired`, `noteTooLong`.
- [ ] 9.2: Add the corresponding Italian translations to the Italian translation file.

### Task 10: Write backend unit tests (AC: #6, #7, #8, #9, #15)

- [ ] 10.1: Create `packages/backend/convex/players/__tests__/rehabNotes.test.ts` using `@convex-dev/test` + `vitest`.
- [ ] 10.2: Test `getRehabNotes`: (a) admin can retrieve notes for an injury on their team sorted by createdAt ascending, (b) physio can retrieve notes, (c) coach gets `NOT_AUTHORIZED` error, (d) returns empty array when no notes exist, (e) resolves author name correctly, (f) wrong team injury throws `NOT_FOUND`, (g) non-existent injuryId throws `NOT_FOUND`.
- [ ] 10.3: Test `addRehabNote`: (a) admin can add a note — returns a valid ID, (b) physio can add a note, (c) coach gets `NOT_AUTHORIZED`, (d) empty note throws `VALIDATION_ERROR`, (e) note > 2000 chars throws `VALIDATION_ERROR`, (f) wrong team injury throws `NOT_FOUND`, (g) created note has correct `authorId`, `teamId`, `createdAt`.
- [ ] 10.4: Test `updateRehabNote`: (a) admin can update a note, (b) physio can update a note, (c) coach gets `NOT_AUTHORIZED`, (d) wrong team note throws `NOT_FOUND`, (e) empty note throws `VALIDATION_ERROR`, (f) `updatedAt` is refreshed, (g) non-existent noteId throws `NOT_FOUND`.
- [ ] 10.5: Test `deleteRehabNote`: (a) admin can delete a note, (b) physio can delete a note, (c) coach gets `NOT_AUTHORIZED`, (d) wrong team note throws `NOT_FOUND`, (e) deleted note no longer appears in `getRehabNotes`, (f) non-existent noteId throws `NOT_FOUND`.

### Task 11: Final validation (AC: all)

- [ ] 11.1: Run `pnpm typecheck` — must pass with zero errors.
- [ ] 11.2: Run `pnpm lint` — must pass with zero errors.
- [ ] 11.3: Run backend tests (`vitest run` in packages/backend) — all new and existing tests pass.
- [ ] 11.4: Start the dev server — log in as admin. Navigate to `/players/[playerId]`, click "Injuries" tab. Verify the Table/Timeline toggle appears above the data.
- [ ] 11.5: Click "Timeline" — verify the vertical timeline renders with correct layout, severity-colored dots, and injury cards.
- [ ] 11.6: Verify active injuries are visually highlighted (border, badge, ongoing counter) and recovered injuries are muted.
- [ ] 11.7: Verify the summary stats bar shows correct values: total injuries, total days lost, currently active count, average recovery days.
- [ ] 11.8: Verify severity badges use correct colors: green (minor), amber/orange (moderate), red (severe).
- [ ] 11.9: Verify dates display in DD/MM/YYYY format throughout the timeline.
- [ ] 11.10: Click on an injury in the timeline — verify the `RehabNotesSection` is visible below the injury card.
- [ ] 11.11: Add a rehab note: type text in the textarea, click "Save Note" — verify success toast, note appears in list with author name and timestamp.
- [ ] 11.12: Edit a rehab note: click "Edit", modify text, click "Save" — verify success toast, note text updated.
- [ ] 11.13: Delete a rehab note: click "Delete", confirm — verify success toast, note removed.
- [ ] 11.14: Switch back to "Table" view — click on a row to expand it — verify `RehabNotesSection` appears below the row.
- [ ] 11.15: Verify rehab note add/edit/delete also works from the table expanded row view.
- [ ] 11.16: Log in as physio — verify full access to timeline and rehab notes (add, edit, delete).
- [ ] 11.17: Log in as coach — verify "Injuries" tab is NOT visible (inherited from Story 5.5 access control).
- [ ] 11.18: Verify real-time updates: open two browser tabs as admin/physio, add a rehab note in one tab — verify it appears in the other without refresh.

## Dev Notes

### Architecture Context

This story adds two features to the existing injury module:
1. **Injury Timeline** — a visual alternative to the existing table view, providing chronological context with severity-coded visual markers and recovery duration tracking.
2. **Rehab Notes** — a new `injuryRehabNotes` table enabling timestamped clinical notes per injury, supporting the medical team's workflow for tracking rehabilitation progress.

This story directly implements:
- **FR24 (extended):** Medical staff can track rehabilitation progress per injury with timestamped notes
- **NFR7:** Rehab note data accessible only to users with medical staff role (admin/physio)
- **NFR2:** Real-time updates via Convex subscriptions for both timeline and notes

### Data Model Decision: Separate Table vs. Embedded Notes

**Chosen: Separate `injuryRehabNotes` table** (not embedded in `playerInjuries.notes` field).

Rationale:
- Each note has its own author, timestamp, and lifecycle (create/edit/delete)
- Avoids growing the `playerInjuries` document with unbounded array fields
- Enables per-note access control and audit trail
- Convex reactive queries work naturally — subscribing to notes for one injury doesn't trigger re-renders when unrelated injury data changes
- The existing `notes` field on `playerInjuries` remains as a general clinical notes field (from Story 5.5), distinct from timestamped rehab progress notes

### Severity Color Mapping Change

Story 5.5 used `minor = yellow`, but the epic description says `minor = green`. This story uses the epic-specified colors:
- `minor` = green (low concern, expected quick recovery)
- `moderate` = amber/orange (notable, moderate recovery time)
- `severe` = red (high concern, extended recovery)

This is a deliberate update from Story 5.5's yellow-for-minor to align with the Epic 14 specification. The `InjuryLog.tsx` table view severity badges should also be updated to use green for minor in this story.

### Days Out Calculation

```typescript
import { differenceInDays } from "date-fns";

function getDaysOut(injuryDate: number, clearanceDate?: number): { days: number; ongoing: boolean } {
  if (clearanceDate) {
    return { days: differenceInDays(new Date(clearanceDate), new Date(injuryDate)), ongoing: false };
  }
  return { days: differenceInDays(new Date(), new Date(injuryDate)), ongoing: true };
}
```

### Timeline Layout Pattern (CSS-only, no external library)

The timeline uses pure Tailwind CSS — no additional timeline library needed:

```tsx
<div className="relative space-y-6 pl-8">
  {/* Vertical line */}
  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />

  {injuries.map((injury) => (
    <div key={injury._id} className="relative">
      {/* Severity-colored dot */}
      <div className={cn(
        "absolute left-[-1.125rem] top-4 h-3 w-3 rounded-full border-2 border-background",
        severityDotColor[injury.severity]
      )} />

      {/* Content card */}
      <Card className={cn(
        injury.status === "current" && "border-l-4 border-l-destructive bg-destructive/5"
      )}>
        {/* ... card content ... */}
      </Card>
    </div>
  ))}
</div>
```

### Existing Patterns to Follow

**Query pattern (same as `getPlayerInjuries`):**
```typescript
export const getRehabNotes = query({
  args: { injuryId: v.id("playerInjuries") },
  handler: async (ctx, { injuryId }) => {
    const { user, teamId } = await requireRole(ctx, ["admin", "physio"]);
    const injury = await ctx.db.get(injuryId);
    if (!injury || injury.teamId !== teamId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Injury not found" });
    }

    const notes = await ctx.db
      .query("injuryRehabNotes")
      .withIndex("by_injuryId", (q) => q.eq("injuryId", injuryId))
      .collect();

    // Resolve author names
    const notesWithAuthors = await Promise.all(
      notes.map(async (note) => {
        const author = await ctx.db.get(note.authorId);
        return {
          ...note,
          authorName: author?.name ?? author?.email ?? "Unknown",
        };
      })
    );

    return notesWithAuthors.sort((a, b) => a.createdAt - b.createdAt);
  },
});
```

**Mutation pattern (same as `logInjury`):**
```typescript
export const addRehabNote = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireRole(ctx, ["admin", "physio"]);
    const injury = await ctx.db.get(args.injuryId);
    if (!injury || injury.teamId !== teamId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Injury not found" });
    }

    const trimmed = args.note.trim();
    if (!trimmed) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Note is required" });
    }
    if (trimmed.length > 2000) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Note cannot exceed 2000 characters" });
    }

    return await ctx.db.insert("injuryRehabNotes", {
      teamId,
      injuryId: args.injuryId,
      authorId: user._id,
      note: trimmed,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
```

### Key File References

| File | Relevance |
|------|-----------|
| `apps/web/src/components/players/InjuryLog.tsx` | Existing injury table — add toggle and expandable rows |
| `apps/web/src/components/players/InjuryFormDialog.tsx` | Existing form pattern reference |
| `apps/web/src/components/players/DeleteInjuryDialog.tsx` | Existing delete confirmation pattern |
| `apps/web/src/components/players/injuryFormSchema.ts` | Existing Zod schema pattern |
| `packages/backend/convex/table/playerInjuries.ts` | Existing injury schema |
| `packages/backend/convex/players/queries.ts` | Add `getRehabNotes` query |
| `packages/backend/convex/players/mutations.ts` | Add `addRehabNote`, `updateRehabNote`, `deleteRehabNote` mutations |
| `packages/backend/convex/schema.ts` | Register `injuryRehabNotes` table |
| `packages/shared/players.ts` | `INJURY_SEVERITIES`, `INJURY_STATUSES` constants |

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/backend/convex/table/injuryRehabNotes.ts` | Created | New table schema for rehab notes |
| `packages/backend/convex/schema.ts` | Modified | Register `injuryRehabNotes` table |
| `packages/backend/convex/players/queries.ts` | Modified | Add `getRehabNotes` query |
| `packages/backend/convex/players/mutations.ts` | Modified | Add `addRehabNote`, `updateRehabNote`, `deleteRehabNote` mutations |
| `apps/web/src/components/players/InjuryTimeline.tsx` | Created | Vertical timeline component |
| `apps/web/src/components/players/RehabNotesSection.tsx` | Created | Rehab notes CRUD component |
| `apps/web/src/components/players/InjuryLog.tsx` | Modified | Add Table/Timeline toggle, expandable rows for notes |
| `apps/web/src/lib/mock-data/injury-rehab-notes.json` | Created | Mock rehab notes data |
| `packages/backend/convex/players/__tests__/rehabNotes.test.ts` | Created | Unit tests for rehab note queries and mutations |
| `apps/web/src/locales/en.json` (or equivalent) | Modified | Add timeline and rehab notes translation keys |
| `apps/web/src/locales/it.json` (or equivalent) | Modified | Add Italian translations |

### What This Story Does NOT Include

- **No return-to-play workflow** — that is Story 14.3 (status workflow: Active -> Rehab -> Assessment -> Cleared)
- **No medical dashboard** — that is Story 14.3 (squad availability %, injury frequency charts)
- **No injury access control changes** — that is Story 14.4 (non-medical status indicator, admin reports)
- **No body map/anatomical diagram** — body region is displayed as text label from Story 14.1 schema
- **No rehab program templates** — notes are free-text, not structured rehab protocols
- **No file/image attachments on notes** — text-only notes in this story
- **No note edit history tracking** — notes have `updatedAt` but no versioning

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Story 14.1 not complete (no clinical classification fields on injury schema) | Hard blocker. The timeline component references `bodyRegion` from Story 14.1. If 14.1 is not done, fall back to omitting body region from timeline entries and add a TODO comment. |
| Large number of rehab notes per injury causing performance issues | Unlikely in practice (most injuries will have 5-20 notes). If needed, add pagination in a future story. |
| N+1 query for author name resolution in `getRehabNotes` | Acceptable for small note counts. If performance becomes an issue, denormalize `authorName` on the note document. |
| Timeline layout breaking on mobile | Use responsive Tailwind classes. Cards stack vertically with timeline line and dots sized for mobile. Test at 375px width. |

### Performance Considerations

- **Index usage:** `by_injuryId` index on `injuryRehabNotes` ensures fast lookup per injury. No full table scan.
- **Author resolution:** N author lookups per injury's notes. Acceptable for typical note counts (< 20 per injury). `ctx.db.get()` by ID is O(1) in Convex.
- **Timeline rendering:** `useMemo` for summary stats computation. Injury list is typically small (5-30 per player career).
- **Lazy loading notes:** `RehabNotesSection` makes its own `useQuery` call per injury. Notes are only fetched when the timeline entry or table row is visible/expanded, not all at once.

### Alignment with Architecture Document

- **Auth Pattern:** `requireRole(ctx, ["admin", "physio"])` for all rehab note operations — matches architecture.md
- **Medical Data Guard:** Role-gated query — satisfies NFR7
- **Data Model:** Separate `injuryRehabNotes` table with `teamId` scoping — matches multi-tenant pattern
- **Component Structure:** New components in `components/players/` — matches architecture.md
- **Convex Organization:** Queries/mutations in `convex/players/` — matches architecture.md
- **Form Pattern:** Inline textarea with mutation — simpler than dialog pattern, appropriate for notes
- **Error Handling:** `ConvexError` with `NOT_FOUND`, `NOT_AUTHORIZED`, `VALIDATION_ERROR` codes
- **Dates:** Timestamps as numbers, `date-fns` for display, DD/MM/YYYY format
- **No detected conflicts** with the architecture document
