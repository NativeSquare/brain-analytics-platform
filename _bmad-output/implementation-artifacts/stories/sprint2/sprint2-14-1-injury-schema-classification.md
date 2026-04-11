# Story 14.1: Injury Schema & Clinical Classification

Status: ready
Story Type: fullstack
Sprint: 2
Epic: 14 — Injury Reporting
Depends on: Story 5.5 (Injury History — done)

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As a medical staff member,
I want injuries to be classified with body region, mechanism, side, and expanded status workflow,
so that the medical team can analyze injury patterns and the system is ready for the client's custom taxonomy CSV.

## Background / Prior Art

Story 5.5 delivered the foundational injury system. The following already exist and MUST be extended (not replaced from scratch):

| Artifact | Path | What exists |
|---|---|---|
| Table schema | `packages/backend/convex/table/playerInjuries.ts` | Fields: `teamId`, `playerId`, `date`, `injuryType`, `severity`, `estimatedRecovery`, `notes`, `status` (current/recovered), `clearanceDate`, `createdBy`, `createdAt`, `updatedAt`. Indexes: `by_playerId`, `by_teamId`. |
| Mutations | `packages/backend/convex/players/mutations.ts` | `logInjury`, `updateInjury`, `deleteInjury` — all guarded by `requireRole(ctx, ["admin", "physio"])`. |
| Queries | `packages/backend/convex/players/queries.ts` | `getPlayerInjuries` (admin/physio only), `getPlayerInjuryStatus` (any auth, boolean only), `getPlayersInjuryStatuses` (batch boolean), `getPlayerTabAccess`. |
| Shared constants | `packages/shared/players.ts` | `INJURY_SEVERITIES = ["minor", "moderate", "severe"]`, `INJURY_STATUSES = ["current", "recovered"]`. |
| Zod schema | `apps/web/src/components/players/injuryFormSchema.ts` | `injuryCreateSchema`, `injuryEditSchema` (extends create with status + clearanceDate). |
| UI components | `apps/web/src/components/players/InjuryLog.tsx` | Table with summary cards, badges for severity/status, create/edit/delete actions. |
| UI components | `apps/web/src/components/players/InjuryFormDialog.tsx` | Form dialog with date picker, injury type input, severity select, notes, status (edit only), clearance date (edit only). |
| UI components | `apps/web/src/components/players/DeleteInjuryDialog.tsx` | Confirmation dialog for delete. |
| Auth helpers | `packages/backend/convex/lib/auth.ts` | `requireAuth`, `requireRole`, `requireMedical`, `getTeamResource`. |
| Tab integration | `apps/web/src/components/players/PlayerProfileTabs.tsx` | Injuries tab is commented out (lines 115-122 and 215-218). Must be uncommented as part of this story. |
| Tests | `packages/backend/convex/players/__tests__/injuries.test.ts` | RBAC + CRUD tests for existing mutations/queries. |

## Acceptance Criteria (BDD)

### AC 1: Extended shared constants for clinical classification

**Given** the shared constants package at `packages/shared/players.ts`,
**When** clinical injury constants are imported,
**Then** the following new exports are available:

```ts
export const BODY_REGIONS = [
  "head", "neck", "shoulder", "upper_arm", "elbow", "forearm",
  "wrist", "hand", "chest", "abdomen", "upper_back", "lower_back",
  "hip", "groin", "thigh", "knee", "shin", "calf", "ankle", "foot",
] as const;

export type BodyRegion = (typeof BODY_REGIONS)[number];

export const BODY_REGION_LABELS: Record<BodyRegion, string> = {
  head: "Head", neck: "Neck", shoulder: "Shoulder", upper_arm: "Upper Arm",
  elbow: "Elbow", forearm: "Forearm", wrist: "Wrist", hand: "Hand",
  chest: "Chest", abdomen: "Abdomen", upper_back: "Upper Back",
  lower_back: "Lower Back", hip: "Hip", groin: "Groin", thigh: "Thigh",
  knee: "Knee", shin: "Shin", calf: "Calf", ankle: "Ankle", foot: "Foot",
};

export const INJURY_MECHANISMS = ["contact", "non_contact", "overuse"] as const;
export type InjuryMechanism = (typeof INJURY_MECHANISMS)[number];

export const INJURY_MECHANISM_LABELS: Record<InjuryMechanism, string> = {
  contact: "Contact", non_contact: "Non-Contact", overuse: "Overuse",
};

export const INJURY_SIDES = ["left", "right", "bilateral", "na"] as const;
export type InjurySide = (typeof INJURY_SIDES)[number];

export const INJURY_SIDE_LABELS: Record<InjurySide, string> = {
  left: "Left", right: "Right", bilateral: "Bilateral", na: "N/A",
};
```

**And** the existing `INJURY_STATUSES` is extended from `["current", "recovered"]` to:

```ts
export const INJURY_STATUSES = ["active", "rehab", "assessment", "cleared"] as const;
```

with corresponding `INJURY_STATUS_LABELS`:

```ts
export const INJURY_STATUS_LABELS: Record<InjuryStatus, string> = {
  active: "Active", rehab: "In Rehab", assessment: "Under Assessment", cleared: "Cleared",
};
```

**And** the existing `INJURY_SEVERITIES` remains unchanged (`["minor", "moderate", "severe"]`) but a labels map is added:

```ts
export const INJURY_SEVERITY_LABELS: Record<InjurySeverity, string> = {
  minor: "Minor", moderate: "Moderate", severe: "Severe",
};
```

### AC 2: Extended playerInjuries table schema

**Given** the Convex schema at `packages/backend/convex/table/playerInjuries.ts`,
**When** the schema is inspected,
**Then** the `playerInjuries` table has the following fields (new fields marked with *):

| Field | Type | Required | Notes |
|---|---|---|---|
| `teamId` | `v.id("teams")` | yes | Existing |
| `playerId` | `v.id("players")` | yes | Existing |
| `date` | `v.number()` | yes | Existing — renamed semantically to "injury date" |
| `injuryType` | `v.string()` | yes | Existing — kept as free-text string for client CSV flexibility |
| `severity` | `v.string()` | yes | Existing — values: minor/moderate/severe |
| `bodyRegion` * | `v.optional(v.string())` | no | New — one of BODY_REGIONS. Optional for backward compat with existing data. |
| `mechanism` * | `v.optional(v.string())` | no | New — one of INJURY_MECHANISMS |
| `side` * | `v.optional(v.string())` | no | New — one of INJURY_SIDES |
| `expectedReturnDate` * | `v.optional(v.number())` | no | New — Unix timestamp ms |
| `actualReturnDate` * | `v.optional(v.number())` | no | New — Unix timestamp ms, set when status changes to cleared |
| `estimatedRecovery` | `v.optional(v.string())` | no | Existing — kept for backward compat, free-text ("4-6 weeks") |
| `notes` | `v.optional(v.string())` | no | Existing |
| `status` | `v.string()` | yes | Existing — values now: active/rehab/assessment/cleared (was: current/recovered) |
| `clearanceDate` | `v.optional(v.number())` | no | Existing — kept for backward compat but `actualReturnDate` is preferred going forward |
| `createdBy` | `v.id("users")` | yes | Existing |
| `createdAt` | `v.number()` | yes | Existing |
| `updatedAt` | `v.number()` | yes | Existing |

**And** the existing indexes remain, plus a new index:
- `by_teamId_status` on `["teamId", "status"]` — for filtering injuries by status across the team.

**Important migration note:** The `status` field values change from `current`/`recovered` to `active`/`rehab`/`assessment`/`cleared`. The `logInjury` mutation must default new entries to `"active"` (not `"current"`). The `getPlayerInjuryStatus` and `getPlayersInjuryStatuses` queries must be updated to check for `status !== "cleared"` instead of `status === "current"`. Existing data with `status === "current"` should be treated as `"active"` and existing `status === "recovered"` should be treated as `"cleared"`. Add a comment in the query code documenting this backward compatibility.

### AC 3: Extended `logInjury` mutation

**Given** a user with `admin` or `physio` role,
**When** the `logInjury` mutation is called,
**Then** it accepts the following args (new fields marked with *):

```ts
{
  playerId: v.id("players"),
  date: v.number(),
  injuryType: v.string(),
  severity: v.string(),
  bodyRegion: v.optional(v.string()),    // *
  mechanism: v.optional(v.string()),     // *
  side: v.optional(v.string()),          // *
  expectedReturnDate: v.optional(v.number()), // *
  estimatedRecovery: v.optional(v.string()),
  notes: v.optional(v.string()),
}
```

**And** validation is extended:
- `bodyRegion`, if provided, must be one of `BODY_REGIONS` (throw `VALIDATION_ERROR` otherwise).
- `mechanism`, if provided, must be one of `INJURY_MECHANISMS`.
- `side`, if provided, must be one of `INJURY_SIDES`.
- `expectedReturnDate`, if provided, must be a positive number.
- All existing validations (injuryType, severity, estimatedRecovery, notes) remain.

**And** the inserted document sets `status: "active"` (not `"current"`), `actualReturnDate: undefined`, `clearanceDate: undefined`, plus all new fields.

**And** the mutation still requires `requireRole(ctx, ["admin", "physio"])`.

### AC 4: Extended `updateInjury` mutation

**Given** a user with `admin` or `physio` role,
**When** the `updateInjury` mutation is called,
**Then** it accepts the same new fields as `logInjury` plus:

```ts
{
  injuryId: v.id("playerInjuries"),
  // ... all logInjury fields except playerId ...
  status: v.string(),                       // now validates against new INJURY_STATUSES
  clearanceDate: v.optional(v.number()),     // existing
  actualReturnDate: v.optional(v.number()),  // *
}
```

**And** `status` is validated against the new `INJURY_STATUSES` (`active`, `rehab`, `assessment`, `cleared`).
**And** when `status` is changed to `"cleared"` and `actualReturnDate` is not provided, `actualReturnDate` is auto-set to `Date.now()`.
**And** all new optional fields are validated the same way as in `logInjury`.

### AC 5: Updated queries for new status values

**Given** the `getPlayerInjuryStatus` query,
**When** called by any authenticated user,
**Then** it returns `{ hasCurrentInjury: true }` if any `playerInjuries` entry has `status` NOT equal to `"cleared"` (i.e., `active`, `rehab`, or `assessment` all count as "currently injured"). This replaces the old check for `status === "current"`.

**And** the `getPlayersInjuryStatuses` batch query is updated with the same logic.

**And** the `getPlayerInjuries` query returns all entries unchanged (the new fields are simply included in the returned documents automatically since Convex returns full documents).

### AC 6: Extended Zod validation schema

**Given** the form schema at `apps/web/src/components/players/injuryFormSchema.ts`,
**When** the create schema is inspected,
**Then** `injuryCreateSchema` includes:

```ts
bodyRegion: z.enum(BODY_REGIONS).optional(),
mechanism: z.enum(INJURY_MECHANISMS).optional(),
side: z.enum(INJURY_SIDES).optional(),
expectedReturnDate: z.number().optional(),
```

**And** `injuryEditSchema` extends create with:

```ts
status: z.enum(INJURY_STATUSES),   // now 4 values
clearanceDate: z.number().optional(),
actualReturnDate: z.number().optional(),
```

### AC 7: Extended InjuryFormDialog with new fields

**Given** a medical/admin user opens the injury form dialog,
**When** the form is displayed,
**Then** the following new fields are rendered (in addition to existing fields):

1. **Body Region** — `Select` dropdown with all 20 body regions from `BODY_REGIONS`, displaying labels from `BODY_REGION_LABELS`. Optional field. Positioned after "Injury Type".
2. **Mechanism** — `Select` dropdown with 3 options from `INJURY_MECHANISMS`, displaying labels. Optional field. Positioned after "Body Region".
3. **Side** — `Select` dropdown with 4 options from `INJURY_SIDES`, displaying labels. Optional field. Positioned after "Mechanism".
4. **Expected Return Date** — Date picker (same pattern as existing date fields). Optional field. Positioned after "Estimated Recovery".

**And** in edit mode, the Status select now shows 4 options: Active, In Rehab, Under Assessment, Cleared.
**And** in edit mode, an **Actual Return Date** date picker is shown (optional, auto-suggested when status changes to "Cleared").

**And** the form dialog width is increased to `sm:max-w-lg` (from `sm:max-w-md`) to accommodate additional fields without feeling cramped.

### AC 8: Extended InjuryLog table with new columns

**Given** a medical/admin user views the Injuries tab,
**When** the injury table is rendered,
**Then** the table includes the following new columns (interleaved with existing ones):

| Column | Content | Position |
|---|---|---|
| Date | Existing — formatted date | 1st |
| Injury Type | Existing — free-text | 2nd |
| Body Region | New — label from `BODY_REGION_LABELS` or "--" if null | 3rd |
| Severity | Existing — colored badge | 4th |
| Mechanism | New — label from `INJURY_MECHANISM_LABELS` or "--" if null | 5th |
| Side | New — label from `INJURY_SIDE_LABELS` or "--" if null | 6th |
| Status | Existing — colored badge, updated for 4 statuses | 7th |
| Est. Return | New — formatted date or "--" | 8th |
| Actions | Existing — edit/delete dropdown | 9th |

**And** the status badge colors are updated:
- `active` = red/destructive (same as old `current`)
- `rehab` = orange
- `assessment` = yellow
- `cleared` = green (same as old `recovered`)

**And** the summary section above the table is updated:
- "Current Injuries" card renamed to "Active Injuries" and counts entries with `status !== "cleared"`.
- "Recovered" card renamed to "Cleared" and counts entries with `status === "cleared"`.

### AC 9: Injuries tab uncommented and active

**Given** the `PlayerProfileTabs.tsx` component,
**When** a user with `admin` or `physio` role views a player profile,
**Then** the Injuries tab is visible and functional (the commented-out code at lines 115-122 and 215-218 is uncommented and active).

### AC 10: Mock injury data for development

**Given** the mock data directory at `apps/web/src/lib/mock-data/`,
**When** a developer needs sample injury data,
**Then** a file `apps/web/src/lib/mock-data/injuries.json` exists with 6 sample injury records covering varied classifications:

1. Active hamstring strain — thigh, non-contact, right side, moderate severity
2. Cleared ankle sprain — ankle, contact, left side, minor severity, with actualReturnDate
3. In rehab ACL reconstruction — knee, contact, right side, severe severity, with expectedReturnDate
4. Under assessment concussion — head, contact, na side, moderate severity
5. Active groin strain — groin, overuse, bilateral, minor severity
6. Cleared shoulder dislocation — shoulder, contact, left side, severe severity, with both dates

Each record includes all fields matching the extended schema. Dates should be realistic relative to each other (injury date before expected return, actual return after injury, etc.).

**Note:** This mock data file is for developer reference and potential future UI seeding. It is NOT wired into the Convex backend — real data comes through the CRUD mutations.

### AC 11: Unit tests for new fields and RBAC

**Given** the test file at `packages/backend/convex/players/__tests__/injuries.test.ts`,
**When** tests are run,
**Then** the following new test cases pass:

1. `logInjury` accepts and stores all new optional fields (bodyRegion, mechanism, side, expectedReturnDate).
2. `logInjury` rejects invalid `bodyRegion` value with `VALIDATION_ERROR`.
3. `logInjury` rejects invalid `mechanism` value with `VALIDATION_ERROR`.
4. `logInjury` rejects invalid `side` value with `VALIDATION_ERROR`.
5. `updateInjury` accepts and stores all new fields including new status values.
6. `updateInjury` rejects invalid new status values (e.g., "current" is no longer valid).
7. `updateInjury` auto-sets `actualReturnDate` when status changes to `"cleared"` and no `actualReturnDate` provided.
8. `getPlayerInjuryStatus` returns `hasCurrentInjury: true` for `active`, `rehab`, and `assessment` statuses.
9. `getPlayerInjuryStatus` returns `hasCurrentInjury: false` only when all injuries are `cleared`.
10. RBAC: `logInjury` with new fields still rejects `coach`, `analyst`, `player`, `staff` roles.
11. RBAC: `deleteInjury` still rejects non-medical roles (unchanged behavior, regression test).

**And** existing tests continue to pass (update any that reference old status values `"current"` / `"recovered"`).

### AC 12: Backward compatibility for existing data

**Given** existing `playerInjuries` documents with `status: "current"` or `status: "recovered"`,
**When** the system queries or displays these entries,
**Then** they are handled gracefully:
- `status: "current"` is treated as equivalent to `"active"` in the UI (mapped in display logic).
- `status: "recovered"` is treated as equivalent to `"cleared"` in the UI.
- The `getPlayerInjuryStatus` query handles both old and new status values correctly.
- No migration script is needed — the mapping happens in query/display logic.

## Tasks / Subtasks

- [ ] **Task 1: Add shared constants** (AC: #1)
  - [ ] 1.1: In `packages/shared/players.ts`, add `BODY_REGIONS`, `BodyRegion`, `BODY_REGION_LABELS`.
  - [ ] 1.2: Add `INJURY_MECHANISMS`, `InjuryMechanism`, `INJURY_MECHANISM_LABELS`.
  - [ ] 1.3: Add `INJURY_SIDES`, `InjurySide`, `INJURY_SIDE_LABELS`.
  - [ ] 1.4: Update `INJURY_STATUSES` from `["current", "recovered"]` to `["active", "rehab", "assessment", "cleared"]`. Add `INJURY_STATUS_LABELS`.
  - [ ] 1.5: Add `INJURY_SEVERITY_LABELS` for the existing severity values.
  - [ ] 1.6: Fix all TypeScript compilation errors caused by the `INJURY_STATUSES` change across the codebase (mutations, queries, Zod schemas, UI components). Search for all usages of `INJURY_STATUSES` and update accordingly.

- [ ] **Task 2: Extend table schema** (AC: #2)
  - [ ] 2.1: In `packages/backend/convex/table/playerInjuries.ts`, add new optional fields: `bodyRegion`, `mechanism`, `side`, `expectedReturnDate`, `actualReturnDate`.
  - [ ] 2.2: Add index `by_teamId_status` on `["teamId", "status"]`.
  - [ ] 2.3: Run `npx convex dev` (user must execute) to verify schema deploys without errors. Existing data remains intact because all new fields are optional.

- [ ] **Task 3: Update `logInjury` mutation** (AC: #3)
  - [ ] 3.1: In `packages/backend/convex/players/mutations.ts`, add new optional args to `logInjury`: `bodyRegion`, `mechanism`, `side`, `expectedReturnDate`.
  - [ ] 3.2: Add validation for new fields: `bodyRegion` must be in `BODY_REGIONS` if provided, `mechanism` must be in `INJURY_MECHANISMS` if provided, `side` must be in `INJURY_SIDES` if provided, `expectedReturnDate` must be positive if provided.
  - [ ] 3.3: Update the insert call to include new fields and set `status: "active"` (was `"current"`).
  - [ ] 3.4: Import new constants from `@packages/shared/players`.

- [ ] **Task 4: Update `updateInjury` mutation** (AC: #4)
  - [ ] 4.1: Add new optional args: `bodyRegion`, `mechanism`, `side`, `expectedReturnDate`, `actualReturnDate`.
  - [ ] 4.2: Update status validation to check against new `INJURY_STATUSES`.
  - [ ] 4.3: Add auto-set logic: when `status === "cleared"` and `actualReturnDate` is not provided, set `actualReturnDate: Date.now()`.
  - [ ] 4.4: Update the patch call to include all new fields.

- [ ] **Task 5: Update `validateInjuryFields` helper** (AC: #3, #4)
  - [ ] 5.1: Extend the validation helper (or create a separate `validateClinicalFields` helper) to validate `bodyRegion`, `mechanism`, `side` against their respective constant arrays.
  - [ ] 5.2: Update status validation to use the new `INJURY_STATUSES` array (currently validates "current" / "recovered" — must now validate "active" / "rehab" / "assessment" / "cleared").

- [ ] **Task 6: Update queries for new statuses** (AC: #5, #12)
  - [ ] 6.1: In `getPlayerInjuryStatus`, change the filter from `status === "current"` to `status !== "cleared"`. Add backward compat: also treat `"current"` as not cleared and `"recovered"` as cleared. Add a code comment explaining the backward compatibility.
  - [ ] 6.2: In `getPlayersInjuryStatuses`, apply the same filter update.
  - [ ] 6.3: `getPlayerInjuries` needs no changes — Convex returns full documents including new fields automatically.

- [ ] **Task 7: Update Zod schemas** (AC: #6)
  - [ ] 7.1: In `apps/web/src/components/players/injuryFormSchema.ts`, add new optional fields to `injuryCreateSchema`: `bodyRegion`, `mechanism`, `side`, `expectedReturnDate`.
  - [ ] 7.2: Update `injuryEditSchema` to add `actualReturnDate` and update the `status` enum to use the new 4-value `INJURY_STATUSES`.
  - [ ] 7.3: Import new constants (`BODY_REGIONS`, `INJURY_MECHANISMS`, `INJURY_SIDES`) from `@packages/shared/players`.

- [ ] **Task 8: Extend InjuryFormDialog** (AC: #7)
  - [ ] 8.1: In `apps/web/src/components/players/InjuryFormDialog.tsx`, add Body Region select (using `BODY_REGIONS` and `BODY_REGION_LABELS`) after the Injury Type field. Optional field with "Select body region" placeholder.
  - [ ] 8.2: Add Mechanism select (using `INJURY_MECHANISMS` and `INJURY_MECHANISM_LABELS`) after Body Region.
  - [ ] 8.3: Add Side select (using `INJURY_SIDES` and `INJURY_SIDE_LABELS`) after Mechanism.
  - [ ] 8.4: Add Expected Return Date picker after Estimated Recovery. Same pattern as existing date pickers.
  - [ ] 8.5: In edit mode, update Status select to show 4 options using `INJURY_STATUSES` and `INJURY_STATUS_LABELS`.
  - [ ] 8.6: In edit mode, add Actual Return Date picker. When status changes to "cleared", auto-suggest today's date if not already set (same pattern as existing clearance date auto-suggestion).
  - [ ] 8.7: Update dialog width from `sm:max-w-md` to `sm:max-w-lg`.
  - [ ] 8.8: Update the `onSubmit` handler to pass new fields to `logInjury` / `updateInjury` mutations.
  - [ ] 8.9: Update the `defaultValues` and `form.reset()` logic to include new fields (defaulting to `undefined`).

- [ ] **Task 9: Extend InjuryLog table** (AC: #8)
  - [ ] 9.1: In `apps/web/src/components/players/InjuryLog.tsx`, add new columns to the table: Body Region, Mechanism, Side, Est. Return Date.
  - [ ] 9.2: Import label maps (`BODY_REGION_LABELS`, `INJURY_MECHANISM_LABELS`, `INJURY_SIDE_LABELS`, `INJURY_STATUS_LABELS`) and use them to display human-readable values. Display "--" for null/undefined values.
  - [ ] 9.3: Update status badge styling for 4 statuses: `active` = red, `rehab` = orange, `assessment` = yellow, `cleared` = green. Add backward compat: map `"current"` to `active` styling, `"recovered"` to `cleared` styling.
  - [ ] 9.4: Update summary section: rename "Current Injuries" to "Active Injuries" (count = entries where `status !== "cleared"` and `status !== "recovered"`). Rename "Recovered" to "Cleared" (count = entries where `status === "cleared"` or `status === "recovered"`).
  - [ ] 9.5: Remove the "Est. Recovery" and "Clearance Date" columns from the table (replaced by "Est. Return" date column and the `actualReturnDate` is visible in the edit form). Keep `estimatedRecovery` field in the form for backward compat but it is now a secondary field.

- [ ] **Task 10: Uncomment Injuries tab** (AC: #9)
  - [ ] 10.1: In `apps/web/src/components/players/PlayerProfileTabs.tsx`, uncomment the Injuries tab trigger (lines 115-122) and the Injuries tab content (lines 215-218). Remove the `[Sprint 2 -- Story 5.5]` comment markers.

- [ ] **Task 11: Create mock injury data** (AC: #10)
  - [ ] 11.1: Create `apps/web/src/lib/mock-data/injuries.json` with 6 sample records as specified in AC #10. Use realistic dates relative to April 2026.

- [ ] **Task 12: Extend unit tests** (AC: #11)
  - [ ] 12.1: In `packages/backend/convex/players/__tests__/injuries.test.ts`, add test cases for new field validation in `logInjury` (valid bodyRegion, invalid bodyRegion, valid mechanism, invalid mechanism, valid side, invalid side).
  - [ ] 12.2: Add test cases for `updateInjury` with new status values and auto-set `actualReturnDate` behavior.
  - [ ] 12.3: Update existing tests that reference `"current"` / `"recovered"` status values to use `"active"` / `"cleared"`.
  - [ ] 12.4: Add test cases for `getPlayerInjuryStatus` with new status values (active/rehab/assessment all return `hasCurrentInjury: true`, only cleared returns false).
  - [ ] 12.5: Add RBAC regression tests: verify coach/analyst/player/staff roles are rejected for `logInjury` with new fields.

## Dev Notes

### Import patterns

All new shared constants are exported from `packages/shared/players.ts` and imported as:
```ts
import { BODY_REGIONS, INJURY_MECHANISMS, INJURY_SIDES, INJURY_STATUS_LABELS, ... } from "@packages/shared/players";
```

### Auth patterns

Use the existing pattern — all mutations use `requireRole(ctx, ["admin", "physio"])`. The `requireMedical(ctx)` shorthand from `packages/backend/convex/lib/auth.ts` can also be used (it calls `requireRole(ctx, ["admin", "physio"])` internally).

Team scoping uses `getTeamResource(ctx, teamId, tableName, resourceId)` for single-resource validation.

### Convex CLI

**IMPORTANT:** Never run Convex CLI commands directly. Give the following commands to the user to execute manually:
```bash
npx convex dev    # to deploy schema changes
npx convex push   # for production deployment
```

### injuryType field — flexibility for client taxonomy

The `injuryType` field is intentionally kept as a free-text `v.string()` (not an enum). The client has mentioned they will share a CSV of injury classifications. When that CSV arrives, a future story will:
1. Create an `injuryClassifications` lookup table seeded from the CSV.
2. Add a `classificationId` optional field to `playerInjuries`.
3. Build an autocomplete/combobox UI that suggests from the classification table but still allows free-text entry.

For now, keep `injuryType` as free-text input to avoid blocking development.

### Backward compatibility strategy

The status field value change (`current` -> `active`, `recovered` -> `cleared`) is handled at the query and display layer, NOT via a data migration. This means:
- Queries check for `status !== "cleared" && status !== "recovered"` to find active injuries.
- UI components map `"current"` -> `active` styling and `"recovered"` -> `cleared` styling.
- New records always use the new status values.
- Old records continue to work without modification.

### Testing with `convex-test`

Follow the existing test pattern in `injuries.test.ts`:
- Use `convexTest()` with mocked `getAuthUserId`.
- Seed test data with the `seedTeamAndUser` helper.
- Test validation errors with `expect(error.data.code).toBe("VALIDATION_ERROR")`.
- Test RBAC with `expect(error.data.code).toBe("NOT_AUTHORIZED")`.

## References

- Story 5.5 implementation: `_bmad-output/implementation-artifacts/stories/sprint1/sprint2-5-5-injury-history-medical-staff-only.md`
- Auth library: `packages/backend/convex/lib/auth.ts`
- Shared constants: `packages/shared/players.ts`
- Existing injury UI: `apps/web/src/components/players/InjuryLog.tsx`, `InjuryFormDialog.tsx`
