# Story 13.3: Certification Tracking & Expiry Alerts

Status: draft
Sprint: 2
Epic: 13 (Staff Profiles & Directory)
Story Type: fullstack
Depends On: Story 13.1 (Staff schema + profile page with tabs)

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As an admin or staff member,
I want to log professional certifications (e.g., UEFA coaching license, first aid certificate, medical degree) with issue and expiry dates,
so that the organisation can track credential validity and receive advance warning before certifications expire.

## Acceptance Criteria

1. **`certifications` table defined in Convex schema** — A new `certifications` table exists in `packages/backend/convex/table/certifications.ts` with fields: `teamId: v.id("teams")`, `staffId: v.id("users")`, `name: v.string()` (certification name, e.g. "UEFA Pro License"), `issuingBody: v.string()` (e.g. "UEFA", "FA", "Red Cross"), `issueDate: v.number()` (Unix timestamp ms), `expiryDate: v.optional(v.number())` (Unix timestamp ms — optional because some certifications never expire), `documentId: v.optional(v.id("_storage"))` (optional file attachment), `notes: v.optional(v.string())`, `createdBy: v.id("users")`, `createdAt: v.number()`, `updatedAt: v.number()`. Indexes: `by_staffId` on `["staffId"]`, `by_teamId` on `["teamId"]`, `by_teamId_expiryDate` on `["teamId", "expiryDate"]`. The table is registered in `packages/backend/convex/schema.ts`.

2. **`getStaffCertifications` query returns certifications for a staff member** — A query `staff.queries.getStaffCertifications` accepts `{ staffId: v.id("users") }`, calls `requireAuth(ctx)`, validates the staff member belongs to the authenticated user's team, and returns an array of `certifications` documents for that staff member sorted by `expiryDate` ascending (soonest-expiring first, certifications with no expiry last). Each entry includes all fields plus a computed `status` field: `"valid"` (expiryDate is more than 30 days away or no expiryDate), `"expiring"` (expiryDate is within 30 days from now), `"expired"` (expiryDate is in the past). Returns an empty array if none exist.

3. **`addCertification` mutation creates a certification entry** — A mutation `staff.mutations.addCertification` accepts `{ staffId: v.id("users"), name: v.string(), issuingBody: v.string(), issueDate: v.number(), expiryDate: v.optional(v.number()), documentId: v.optional(v.id("_storage")), notes: v.optional(v.string()) }`. Calls `requireAuth(ctx)`. Authorization: the caller must be either (a) an admin, or (b) the staff member themselves (`user._id === staffId`). If neither, throw `NOT_AUTHORIZED`. Validates `name` is non-empty and <= 200 characters. Validates `issuingBody` is non-empty and <= 200 characters. Validates `notes` <= 2000 characters if provided. Validates `issueDate` is a valid timestamp. Validates `expiryDate` > `issueDate` if provided (throw `VALIDATION_ERROR` with message "Expiry date must be after issue date"). Inserts into `certifications` with `teamId`, all fields, `createdBy: user._id`, `createdAt: Date.now()`, `updatedAt: Date.now()`. Returns the new `_id`.

4. **`updateCertification` mutation updates an existing certification** — A mutation `staff.mutations.updateCertification` accepts `{ certificationId: v.id("certifications"), name: v.string(), issuingBody: v.string(), issueDate: v.number(), expiryDate: v.optional(v.number()), documentId: v.optional(v.id("_storage")), notes: v.optional(v.string()) }`. Calls `requireAuth(ctx)`. Authorization: caller must be admin or the staff member who owns the certification. Validates the entry exists and belongs to the user's team. Applies same field validations as `addCertification`. Patches the document with all provided fields plus `updatedAt: Date.now()`. Returns the `certificationId`.

5. **`deleteCertification` mutation removes a certification entry** — A mutation `staff.mutations.deleteCertification` accepts `{ certificationId: v.id("certifications") }`. Calls `requireAuth(ctx)`. Authorization: caller must be admin or the staff member who owns the certification. Validates the entry exists and belongs to the user's team. Calls `ctx.db.delete(certificationId)`.

6. **"Certifications" tab on the staff profile page** — When an authenticated user navigates to the staff profile page `/staff/[staffId]`, a "Certifications" tab is visible (using Tabler `IconCertificate` or similar icon). The tab content renders a `CertificationLog` component. The tab is visible to all authenticated team members (any team member can see certifications).

7. **Certification log displays as a data table with status badges** — The Certifications tab renders a table with columns: Name, Issuing Body, Issue Date (formatted DD/MM/YYYY using `date-fns` `format(date, "dd/MM/yyyy")`), Expiry Date (formatted DD/MM/YYYY or "No expiry"), Status (badge), and an Actions column. The Status column displays a coloured badge: green badge with text "Valid" when `status === "valid"`, amber/yellow badge with text "Expiring" when `status === "expiring"`, red badge with text "Expired" when `status === "expired"`. The table is sorted by urgency — expired first, then expiring, then valid. An empty state is shown when no certifications exist ("No certifications recorded").

8. **"Add Certification" button visible to admin and self** — When the current user is an admin or is viewing their own staff profile, an "Add Certification" button is displayed above the certifications table. Clicking the button opens a dialog with the certification form. Other users see the table read-only (no add/edit/delete actions).

9. **Certification form validates and submits correctly** — The "Add Certification" form contains fields: name (required — text input, max 200 characters), issuing body (required — text input, max 200 characters), issue date (required — date picker, defaults to today, displayed as DD/MM/YYYY), expiry date (optional — date picker, displayed as DD/MM/YYYY), notes (optional — textarea, max 2000 characters). The form uses `react-hook-form` with Zod validation. Submit is disabled until all required validation passes.

10. **Success feedback after adding a certification** — After successful form submission: a success toast is shown ("Certification added"), the dialog closes, and the new entry appears in the certification table in real time (Convex subscription).

11. **Existing certifications can be edited by admin or self** — Admin or the staff member themselves can click an edit action (pencil icon in a dropdown menu) on any certification row. This opens the form pre-populated with existing values. On submit, the `updateCertification` mutation is called. Success toast: "Certification updated".

12. **Existing certifications can be deleted by admin or self** — Admin or the staff member themselves can click a delete action (trash icon in a dropdown menu) on any certification row. A confirmation dialog appears ("Delete certification '{name}'? This action cannot be undone."). On confirm, the `deleteCertification` mutation is called. Success toast: "Certification deleted".

13. **`getExpiringCertifications` query returns team-wide expiring/expired certs** — A query `staff.queries.getExpiringCertifications` accepts no arguments (uses team from auth context). Calls `requireRole(ctx, ["admin"])`. Queries `certifications` table filtered by `teamId`, returns all certifications where `expiryDate` is defined and `expiryDate` is within 60 days from now (includes already expired and soon-to-expire). Each entry includes all certification fields plus the staff member's `firstName` and `lastName` (joined from `users` table). Results are sorted by `expiryDate` ascending (most urgent first — already expired at the top).

14. **Admin certification summary view** — Admin users can access a "Certification Alerts" section. This can be either: (a) a dedicated page at `/staff/certifications`, or (b) a section within the staff directory page (`/staff`). It displays a table/list showing: Staff Name, Certification Name, Issuing Body, Expiry Date (DD/MM/YYYY), Status badge (red "Expired" or amber "Expiring"). The list is sorted by urgency (expired first, then by nearest expiry date). Summary stats are displayed above the table: count of expired certifications, count of certifications expiring within 30 days. Only visible to admin users.

15. **Date format consistency (DD/MM/YYYY)** — All dates in the certification UI are displayed in European format DD/MM/YYYY using `date-fns` `format(date, "dd/MM/yyyy")`, consistent with Story 12.2 requirements.

16. **Team-scoped data access enforced** — All queries and mutations filter/validate by `teamId` from `requireAuth`/`requireRole`. No cross-team certification data access is possible. Access control is enforced at the Convex mutation/query layer, not just the UI.

17. **Self-service authorization pattern** — Staff members can manage (add/edit/delete) their own certifications without admin involvement. The mutations check `user._id === staffId` (self) OR `user.role === "admin"`. This follows the same self-service pattern established in Story 5.6 for player contact info editing.

18. **Real-time updates** — Because the certification table uses Convex `useQuery`, certifications added, updated, or deleted by any authorized user appear/update/disappear in real time for all connected clients without manual refresh.

19. **Mock data seeded for development** — Mock certification data is added to the seed file (or a dedicated staff seed section) following the same mock data pattern used in Sprint 1. Include at least 5 sample certifications across 2-3 staff members, with a mix of valid, expiring, and expired statuses to exercise all badge states during development and review.

## Tasks / Subtasks

- [ ] **Task 1: Create `certifications` table definition** (AC: #1)
  - [ ] 1.1: Create `packages/backend/convex/table/certifications.ts`. Define the table with fields: `teamId: v.id("teams")`, `staffId: v.id("users")`, `name: v.string()`, `issuingBody: v.string()`, `issueDate: v.number()`, `expiryDate: v.optional(v.number())`, `documentId: v.optional(v.id("_storage"))`, `notes: v.optional(v.string())`, `createdBy: v.id("users")`, `createdAt: v.number()`, `updatedAt: v.number()`. Add indexes: `.index("by_staffId", ["staffId"])`, `.index("by_teamId", ["teamId"])`, `.index("by_teamId_expiryDate", ["teamId", "expiryDate"])`.
  - [ ] 1.2: In `packages/backend/convex/schema.ts`, import and register the `certifications` table. Add import `import { certifications } from "./table/certifications";` and add `certifications` to the `defineSchema()` call (maintain alphabetical ordering).

- [ ] **Task 2: Create `getStaffCertifications` query** (AC: #2, #16)
  - [ ] 2.1: Create `packages/backend/convex/staff/queries.ts` (if it does not exist). Implement `getStaffCertifications` query: accepts `{ staffId: v.id("users") }`, calls `requireAuth(ctx)`. Fetches the staff user via `ctx.db.get(staffId)`, validates `teamId` matches the authenticated user's team (throw `NOT_FOUND` if not). Queries `certifications` table using the `by_staffId` index filtering by `staffId`. For each entry, computes a `status` field based on `expiryDate`: if no `expiryDate` then `"valid"`, if `expiryDate > Date.now() + 30 * 24 * 60 * 60 * 1000` then `"valid"`, if `expiryDate > Date.now()` then `"expiring"`, else `"expired"`. Sorts results by `expiryDate` ascending (no-expiry entries at the end). Returns the array of enriched certification objects.
  - [ ] 2.2: Verify query returns an empty array (not `null`) when no certifications exist for the staff member.

- [ ] **Task 3: Create `addCertification` mutation** (AC: #3, #16, #17)
  - [ ] 3.1: Create `packages/backend/convex/staff/mutations.ts` (if it does not exist). Implement `addCertification` mutation: accepts `{ staffId: v.id("users"), name: v.string(), issuingBody: v.string(), issueDate: v.number(), expiryDate: v.optional(v.number()), documentId: v.optional(v.id("_storage")), notes: v.optional(v.string()) }`. Calls `requireAuth(ctx)`. Checks authorization: `user.role === "admin" || user._id === staffId` — if neither, throw `ConvexError({ code: "NOT_AUTHORIZED", message: "Only admins or the staff member themselves can manage certifications" })`. Fetches the staff user via `ctx.db.get(staffId)`, validates `teamId` matches (throw `NOT_FOUND`). Validates `name` is non-empty and <= 200 chars (throw `VALIDATION_ERROR`). Validates `issuingBody` is non-empty and <= 200 chars. Validates `notes` <= 2000 chars if provided. Validates `expiryDate > issueDate` if `expiryDate` is provided (throw `VALIDATION_ERROR` with message "Expiry date must be after issue date"). Inserts into `certifications` with `teamId`, all fields, `createdBy: user._id`, `createdAt: Date.now()`, `updatedAt: Date.now()`. Returns the new `_id`.

- [ ] **Task 4: Create `updateCertification` mutation** (AC: #4, #16, #17)
  - [ ] 4.1: In `packages/backend/convex/staff/mutations.ts`, implement `updateCertification` mutation: accepts `{ certificationId: v.id("certifications"), name: v.string(), issuingBody: v.string(), issueDate: v.number(), expiryDate: v.optional(v.number()), documentId: v.optional(v.id("_storage")), notes: v.optional(v.string()) }`. Calls `requireAuth(ctx)`. Fetches the certification via `ctx.db.get(certificationId)`, validates it exists and `teamId` matches (throw `NOT_FOUND`). Checks authorization: `user.role === "admin" || user._id === cert.staffId` — throw `NOT_AUTHORIZED` if neither. Applies same field validations as `addCertification`. Patches the document with all provided fields plus `updatedAt: Date.now()`. Returns the `certificationId`.

- [ ] **Task 5: Create `deleteCertification` mutation** (AC: #5, #16, #17)
  - [ ] 5.1: In `packages/backend/convex/staff/mutations.ts`, implement `deleteCertification` mutation: accepts `{ certificationId: v.id("certifications") }`. Calls `requireAuth(ctx)`. Fetches the certification via `ctx.db.get(certificationId)`, validates it exists and `teamId` matches (throw `NOT_FOUND`). Checks authorization: `user.role === "admin" || user._id === cert.staffId` — throw `NOT_AUTHORIZED` if neither. Calls `ctx.db.delete(certificationId)`.

- [ ] **Task 6: Create `getExpiringCertifications` query** (AC: #13, #16)
  - [ ] 6.1: In `packages/backend/convex/staff/queries.ts`, implement `getExpiringCertifications` query: accepts no arguments. Calls `requireRole(ctx, ["admin"])`. Queries `certifications` table using the `by_teamId` index filtered by `teamId`. Filters to entries where `expiryDate` is defined and `expiryDate < Date.now() + 60 * 24 * 60 * 60 * 1000` (within 60 days or already expired). For each entry, joins with the `users` table to get `firstName` and `lastName` of the staff member. Computes `status` field (same logic as `getStaffCertifications`). Sorts by `expiryDate` ascending (most urgent first). Returns the enriched array.

- [ ] **Task 7: Create Zod validation schema for certification form** (AC: #9)
  - [ ] 7.1: Create `apps/web/src/components/staff/certificationFormSchema.ts`. Schema: `name: z.string().min(1, "Certification name is required").max(200, "Name cannot exceed 200 characters")`, `issuingBody: z.string().min(1, "Issuing body is required").max(200, "Issuing body cannot exceed 200 characters")`, `issueDate: z.number({ message: "Issue date is required" })`, `expiryDate: z.number().optional()`, `notes: z.string().max(2000, "Notes cannot exceed 2000 characters").optional().or(z.literal(""))`. Add a `.refine()` that validates `expiryDate > issueDate` when both are provided, with message "Expiry date must be after issue date".

- [ ] **Task 8: Build CertificationLog component** (AC: #6, #7, #8, #10, #15, #18)
  - [ ] 8.1: Create `apps/web/src/components/staff/CertificationLog.tsx`. Accepts `staffId: Id<"users">` and `canEdit: boolean` props.
  - [ ] 8.2: Call `useQuery(api.staff.queries.getStaffCertifications, { staffId })`. Handle loading state with `Skeleton` components. Handle empty state with a centered message ("No certifications recorded") and an icon (e.g., `IconCertificate`).
  - [ ] 8.3: Render summary stats above the table using `useMemo`: count of valid certifications (green), count of expiring certifications (amber), count of expired certifications (red), total certifications.
  - [ ] 8.4: Render the data table with columns: Name, Issuing Body, Issue Date (formatted `dd/MM/yyyy`), Expiry Date (formatted `dd/MM/yyyy` or "No expiry"), Status (badge — green "Valid", amber "Expiring", red "Expired"). If `canEdit` is true, add an Actions column with a `DropdownMenu` containing "Edit" and "Delete" options.
  - [ ] 8.5: If `canEdit`, render an "Add Certification" button above the table (aligned right).
  - [ ] 8.6: Status badge implementation: use the project's existing `Badge` component. Green variant for "Valid" (`className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"`), amber variant for "Expiring" (`className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"`), red/destructive variant for "Expired".

- [ ] **Task 9: Build CertificationFormDialog component** (AC: #9, #10, #11, #15)
  - [ ] 9.1: Create `apps/web/src/components/staff/CertificationFormDialog.tsx`. Accepts props: `staffId: Id<"users">`, `existingCertification?: Certification` (for edit mode), `open: boolean`, `onClose: () => void`.
  - [ ] 9.2: Use `react-hook-form` with `zodResolver` and the Zod schema from Task 7. In edit mode, pre-populate `defaultValues` from `existingCertification`. In create mode, default `issueDate` to today's timestamp.
  - [ ] 9.3: Render the form inside a shadcn `Dialog` with title "Add Certification" (create mode) or "Edit Certification" (edit mode).
  - [ ] 9.4: Form fields: `Input` for name (text), `Input` for issuing body (text), date picker for `issueDate` (displayed as DD/MM/YYYY), date picker for `expiryDate` (optional, displayed as DD/MM/YYYY, with a "No expiry" checkbox or the ability to clear the field), `Textarea` for notes (optional). Display inline validation errors below each field.
  - [ ] 9.5: Submit button calls `addCertification` mutation (create mode) or `updateCertification` mutation (edit mode). On success: show toast ("Certification added" or "Certification updated"), close the dialog. On error: catch `ConvexError` and display via toast.
  - [ ] 9.6: "Cancel" button closes the dialog without saving.

- [ ] **Task 10: Build DeleteCertificationDialog component** (AC: #12)
  - [ ] 10.1: Create `apps/web/src/components/staff/DeleteCertificationDialog.tsx`. Accepts props: `certificationId: Id<"certifications">`, `certificationName: string`, `open: boolean`, `onClose: () => void`.
  - [ ] 10.2: Render a shadcn `AlertDialog` with title "Delete Certification" and description "Delete certification '{certificationName}'? This action cannot be undone."
  - [ ] 10.3: "Delete" button (destructive variant) calls `deleteCertification` mutation. On success: show toast ("Certification deleted"), close the dialog. On error: catch `ConvexError` and display via toast.
  - [ ] 10.4: "Cancel" button closes the dialog.

- [ ] **Task 11: Integrate CertificationLog into the Staff Profile page** (AC: #6)
  - [ ] 11.1: In the staff profile page tabs component (created by Story 13.1), add a "Certifications" tab using `IconCertificate` (or `IconAward` from `@tabler/icons-react`). Render `CertificationLog` in the tab content, passing `staffId` from the profile context and `canEdit` derived from: `isAdmin || isSelf` (where `isSelf` is `currentUser._id === staffId`).
  - [ ] 11.2: Ensure the tab is visible to all authenticated team members (read access is not role-restricted).

- [ ] **Task 12: Build Admin Certification Alerts view** (AC: #13, #14)
  - [ ] 12.1: Create `apps/web/src/components/staff/CertificationAlerts.tsx`. This component calls `useQuery(api.staff.queries.getExpiringCertifications)`. Handles loading state with `Skeleton`. Handles empty state ("All certifications are up to date").
  - [ ] 12.2: Render summary stats above the table: "Expired: {count}" (red), "Expiring within 30 days: {count}" (amber). Computed via `useMemo`.
  - [ ] 12.3: Render a data table with columns: Staff Name (`${firstName} ${lastName}`), Certification Name, Issuing Body, Expiry Date (DD/MM/YYYY), Status badge (red "Expired" or amber "Expiring"). Rows sorted by expiry date ascending (most urgent first).
  - [ ] 12.4: Integrate this component into the staff directory page (`/staff`) as a collapsible section visible only to admin users, OR create a dedicated route at `/staff/certifications`. Decision: prefer integrating into `/staff` page as a section above the staff list, gated by `isAdmin`. If the admin has zero expiring/expired certs, the section is hidden entirely.

- [ ] **Task 13: Add mock/seed certification data** (AC: #19)
  - [ ] 13.1: In `packages/backend/convex/seed.ts` (or the appropriate seed/mock file), add mock certification data. Create at least 5 certifications across 2-3 staff members. Include: one expired certification (expiryDate 30+ days in the past), two expiring certifications (expiryDate within 30 days from seed date), one valid certification (expiryDate 6+ months away), one certification with no expiry date. Use realistic names: "UEFA Pro Coaching License", "FA Level 3 First Aid", "BSc Sports Science", "BASES Accreditation", "DBS Enhanced Check".

- [ ] **Task 14: Write backend unit tests** (AC: #2, #3, #4, #5, #13, #16, #17)
  - [ ] 14.1: Create `packages/backend/convex/staff/__tests__/certifications.test.ts` using `@convex-dev/test` + `vitest`.
  - [ ] 14.2: Test `getStaffCertifications`: (a) returns all certs for a staff member within the same team, (b) returns empty array when none exist, (c) does not return certs for staff from a different team (throws `NOT_FOUND`), (d) unauthenticated user throws error, (e) status computation is correct: expired / expiring / valid, (f) results sorted by expiryDate ascending with no-expiry entries last.
  - [ ] 14.3: Test `addCertification`: (a) admin can add cert for any staff on their team, returns a valid ID, (b) staff member can add cert for themselves, (c) non-admin staff member trying to add cert for someone else gets `NOT_AUTHORIZED`, (d) adding cert for staff on a different team throws `NOT_FOUND`, (e) empty `name` throws `VALIDATION_ERROR`, (f) `name` > 200 chars throws `VALIDATION_ERROR`, (g) `expiryDate < issueDate` throws `VALIDATION_ERROR`, (h) created entry has correct `createdBy`, `createdAt`, `teamId` fields.
  - [ ] 14.4: Test `updateCertification`: (a) admin can update any cert on their team, (b) staff member can update their own cert, (c) non-admin staff member trying to update someone else's cert gets `NOT_AUTHORIZED`, (d) updating cert from a different team throws `NOT_FOUND`, (e) `updatedAt` is refreshed on update, (f) non-existent certificationId throws `NOT_FOUND`.
  - [ ] 14.5: Test `deleteCertification`: (a) admin can delete any cert on their team, (b) staff member can delete their own cert, (c) non-admin staff member trying to delete someone else's cert gets `NOT_AUTHORIZED`, (d) deleting cert from a different team throws `NOT_FOUND`, (e) deleted entry no longer appears in `getStaffCertifications` results, (f) non-existent certificationId throws `NOT_FOUND`.
  - [ ] 14.6: Test `getExpiringCertifications`: (a) returns only expired and soon-to-expire certs (within 60 days), (b) does not return valid certs with expiryDate > 60 days away, (c) does not return certs with no expiryDate, (d) includes staff member name in results, (e) only admin can call this query (non-admin gets `NOT_AUTHORIZED`), (f) results sorted by expiryDate ascending.

- [ ] **Task 15: Final validation** (AC: all)
  - [ ] 15.1: Run `pnpm typecheck` — must pass with zero errors.
  - [ ] 15.2: Run `pnpm lint` — must pass with zero errors.
  - [ ] 15.3: Run backend tests (`vitest run` in packages/backend) — all new tests pass, all existing tests still pass.
  - [ ] 15.4: Start the dev server — navigate to `/staff/[staffId]`, click the "Certifications" tab. Verify the certifications table renders with mock data.
  - [ ] 15.5: Verify status badges display correctly: green "Valid", amber "Expiring", red "Expired".
  - [ ] 15.6: As admin, verify the "Add Certification" button is visible. Click it — verify the form dialog opens with all fields and correct defaults.
  - [ ] 15.7: Submit the form with valid data — verify the entry appears in the table. Verify the success toast appears.
  - [ ] 15.8: Click edit on a certification row — verify the form pre-populates. Update a field and submit — verify the table updates in real time.
  - [ ] 15.9: Click delete on a certification row — verify the confirmation dialog appears. Confirm — verify the entry disappears.
  - [ ] 15.10: Log in as a non-admin staff member — navigate to your own profile. Verify you can add/edit/delete your own certifications.
  - [ ] 15.11: As that non-admin staff member, navigate to a different staff member's profile. Verify the certifications table is visible (read-only) but add/edit/delete actions are NOT visible.
  - [ ] 15.12: As admin, navigate to the staff directory page. Verify the "Certification Alerts" section is visible and shows expired/expiring certifications.
  - [ ] 15.13: All dates displayed in DD/MM/YYYY format throughout.
  - [ ] 15.14: Test form validation: submit with empty name — verify inline error. Set expiry date before issue date — verify validation error.

## Dev Notes

### Architecture Context

This is the **certification tracking CRUD story for Epic 13 (Staff Profiles & Directory)**. It builds on Story 13.1 (which defines the staff profile page with tabs and the staff data model). This story delivers the full read/write path for staff certifications with expiry alerting.

This story directly implements:

- **Certification lifecycle management:** Full CRUD for professional certifications with issue/expiry tracking
- **Expiry alerting:** Visual indicators (green/amber/red badges) for certification validity status
- **Admin oversight:** Team-wide view of expiring/expired certifications for compliance tracking
- **Self-service:** Staff members can manage their own certifications without admin involvement

### Key Architectural Decisions

- **Authorization Pattern:** Uses `requireAuth(ctx)` (not `requireRole`) for all mutations, then checks `user.role === "admin" || user._id === staffId` manually. This enables the self-service pattern where staff can manage their own certifications. The admin-only `getExpiringCertifications` query uses `requireRole(ctx, ["admin"])`.

- **Status Computation:** Certification status (`valid`/`expiring`/`expired`) is computed at query time, not stored. This ensures status is always current without needing background jobs to update stored statuses. The 30-day threshold for "expiring" is defined as a constant.

- **`certifications` as a standalone table** (not embedded in users): Each certification has independent lifecycle, metadata (`createdBy`, timestamps), and needs to be queried by `staffId` and across the team. Follows the same data modelling pattern as `playerStats`, `playerFitness`, and `playerInjuries`.

- **staffId references `users` table:** Staff members are users. Story 13.1 establishes that staff profiles are user records (not a separate `staff` table). Therefore `staffId: v.id("users")`.

- **Date display format:** DD/MM/YYYY using `date-fns` `format(date, "dd/MM/yyyy")` per Story 12.2 requirements. Dates are still stored as Unix timestamp ms (number) in Convex.

- **60-day window for admin alerts:** The `getExpiringCertifications` query uses a 60-day window (not 30) to give admins more lead time. The UI distinguishes between "Expiring" (within 30 days) and certs expiring in 30-60 days (shown as "Valid" but still surfaced in the admin view).

### RBAC Model

| Action | Admin | Staff (self) | Staff (other) | Coach / Analyst / etc. |
|--------|-------|-------------|---------------|----------------------|
| View certifications tab | Yes | Yes | Yes | Yes |
| Add certification | Yes (any staff) | Yes (own only) | No | No |
| Edit certification | Yes (any) | Yes (own only) | No | No |
| Delete certification | Yes (any) | Yes (own only) | No | No |
| View certification alerts | Yes | No | No | No |

### Existing Patterns to Follow

**CRUD Log Pattern (from StatsLog/FitnessLog/InjuryLog):**

```typescript
// Component structure:
// 1. useQuery for data
// 2. useMemo for summary stats
// 3. Loading skeleton
// 4. Empty state
// 5. Summary cards + Add button
// 6. Data table with action dropdown
// 7. Form dialog + Delete dialog
```

**Self-Service Authorization Pattern (from Story 5.6):**

```typescript
// In mutation handler:
const { user, teamId } = await requireAuth(ctx);
const isAdmin = user.role === "admin";
const isSelf = user._id === staffId;
if (!isAdmin && !isSelf) {
  throw new ConvexError({
    code: "NOT_AUTHORIZED",
    message: "Only admins or the staff member themselves can manage certifications",
  });
}
```

**Status Badge Pattern:**

```typescript
function StatusBadge({ status }: { status: "valid" | "expiring" | "expired" }) {
  const variants = {
    valid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    expiring: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    expired: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  const labels = { valid: "Valid", expiring: "Expiring", expired: "Expired" };
  return <Badge className={variants[status]}>{labels[status]}</Badge>;
}
```

**Date Display (DD/MM/YYYY per Story 12.2):**

```typescript
format(new Date(issueDate), "dd/MM/yyyy")
// Output: "15/03/2026"
```

### Convex Module Organisation

This story creates a new `staff` module in Convex:

```
packages/backend/convex/
  staff/
    queries.ts          ← getStaffCertifications, getExpiringCertifications
    mutations.ts        ← addCertification, updateCertification, deleteCertification
    __tests__/
      certifications.test.ts
  table/
    certifications.ts   ← table definition
```

If Story 13.1 has already created `staff/queries.ts` and `staff/mutations.ts`, add to those files rather than creating new ones.

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/backend/convex/table/certifications.ts` | Created | Table definition for `certifications` |
| `packages/backend/convex/schema.ts` | Modified | Register `certifications` table |
| `packages/backend/convex/staff/queries.ts` | Created or Modified | Add `getStaffCertifications`, `getExpiringCertifications` queries |
| `packages/backend/convex/staff/mutations.ts` | Created or Modified | Add `addCertification`, `updateCertification`, `deleteCertification` mutations |
| `apps/web/src/components/staff/CertificationLog.tsx` | Created | Certification table + summary section |
| `apps/web/src/components/staff/CertificationFormDialog.tsx` | Created | Add/edit certification form dialog |
| `apps/web/src/components/staff/DeleteCertificationDialog.tsx` | Created | Confirmation dialog for certification deletion |
| `apps/web/src/components/staff/certificationFormSchema.ts` | Created | Zod validation schema for certification form |
| `apps/web/src/components/staff/CertificationAlerts.tsx` | Created | Admin view of expiring/expired certifications |
| Staff profile tabs component (from Story 13.1) | Modified | Add "Certifications" tab rendering `CertificationLog` |
| Staff directory page (from Story 13.1) | Modified | Add `CertificationAlerts` section for admin users |
| `packages/backend/convex/seed.ts` | Modified | Add mock certification data |
| `packages/backend/convex/staff/__tests__/certifications.test.ts` | Created | Unit tests for certification queries and mutations |

### What This Story Does NOT Include

- **No file upload for certification documents** — the `documentId` field is defined in the schema but the upload UI is deferred to a future story. The form does not include a file upload field in this story.
- **No email/push notifications for expiring certifications** — only in-app visual indicators. Email alerts could be a future enhancement.
- **No bulk import of certifications** — only manual per-certification entry via form
- **No certification templates or auto-complete** — free-text entry for name and issuing body
- **No certification verification workflow** — no approval process; certifications are trusted as entered
- **No PDF generation of certification reports** — out of scope

### Dependencies (Must Be Complete Before Starting)

| Dependency | Story | Status Check |
|------------|-------|-------------|
| Staff profile page with tabs at `/staff/[staffId]` | Story 13.1 | Page and tab component must exist |
| Staff data model (users as staff) | Story 13.1 | Staff profile query must exist |
| Staff directory page at `/staff` | Story 13.1 | Page must exist for admin alerts integration |
| `requireAuth`, `requireRole` helpers | Story 2.1 | `packages/backend/convex/lib/auth.ts` must export these |
| shadcn/ui components: Dialog, AlertDialog, Table, Button, Input, Textarea, Form, Badge, Card, Skeleton, DropdownMenu, Popover | Stories 1.2/1.4 | All must be available in `components/ui/` |
| `react-day-picker` (date picker) | Template | Already installed |
| `date-fns` (date formatting) | Template | Already installed |

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Story 13.1 not complete (no staff profile page or tabs) | This story is fully blocked until Story 13.1 is done. Check for staff profile route and tab component before starting. |
| `staff/queries.ts` and `staff/mutations.ts` may not exist yet | Create them if they don't exist. Follow the same module pattern as `players/queries.ts` and `players/mutations.ts`. |
| Date picker shows dates in different format than DD/MM/YYYY | The date picker (react-day-picker Calendar) shows month view — the DD/MM/YYYY format only applies to displayed date strings in the table and form trigger button. Use `format(date, "dd/MM/yyyy")` for the button label. |
| `documentId` field present but no upload UI | This is intentional. The schema includes it for forward compatibility. The form does not expose it. Document upload will be a separate story. |
| Large number of certifications in admin view | The 60-day window limits the result set. For typical team sizes (20-50 staff), the query returns at most a few dozen entries. No pagination needed for Sprint 2 scale. |

### Performance Considerations

- **Index usage:** `by_staffId` index on `certifications` ensures fast lookup per staff member. `by_teamId` index ensures fast team-wide queries for admin alerts.
- **Status computation:** Done at query time in the Convex handler. O(n) where n is the number of certs for a staff member (typically < 10). Negligible cost.
- **Admin alerts query:** Filters by `teamId` using index, then filters by date in memory. For typical team sizes, this is a fast operation.
- **Real-time updates:** Convex subscription on `getStaffCertifications` triggers re-render only when that staff member's certs change.

### Alignment with Architecture Document

- **Auth Pattern:** `requireAuth` for reads and self-service writes, `requireRole(ctx, ["admin"])` for admin-only queries. `teamId` scoping on all operations.
- **Data Model:** `certifications` as a separate table with independent lifecycle and metadata. Follows `playerStats`/`playerFitness` pattern.
- **Component Structure:** Feature-grouped at `components/staff/`. Follows `components/players/` pattern.
- **Convex Organisation:** `convex/staff/queries.ts` for reads, `convex/staff/mutations.ts` for writes. Tests in `convex/staff/__tests__/`.
- **Form Pattern:** `react-hook-form` + Zod + `zodResolver` + `useMutation` + `toast`.
- **Error Handling:** `ConvexError` with `NOT_FOUND`, `NOT_AUTHORIZED`, `VALIDATION_ERROR` codes.
- **Dates:** Stored as Unix timestamp ms. Displayed using `date-fns` formatting (DD/MM/YYYY per Story 12.2).
- **Loading States:** `Skeleton` for loading, empty state for no data.
- **Naming:** camelCase Convex functions, PascalCase components.
