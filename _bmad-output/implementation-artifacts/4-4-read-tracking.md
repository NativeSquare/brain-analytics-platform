# Story 4.4: Read Tracking

Status: ready-for-dev
Story Type: fullstack

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As an admin,
I want to see how many users have opened each document,
so that I know whether the team is engaging with shared materials.

## Acceptance Criteria

1. **`trackRead` mutation records a document open event** — A Convex mutation `documents.mutations.trackRead` accepts `{ documentId: Id<"documents"> }`, calls `requireAuth(ctx)`, validates the document exists and belongs to the user's team, verifies the user has access to the document (using `checkDocumentAccess` from Story 4.3), then inserts a record into the `documentReads` table with `{ teamId, documentId, userId: user._id, readAt: Date.now() }`. If the user has already read this document (a record with matching `userId` and `documentId` exists), it updates the existing record's `readAt` timestamp instead of creating a duplicate. Returns success.

2. **`trackRead` is called when a user opens or downloads a document** — When a user clicks "Open" (to view) or "Download" on a document in the UI, the `trackRead` mutation is called alongside the document access action. The tracking call is fire-and-forget — it must NOT block or delay the document open/download experience. If the tracking mutation fails (e.g., network issue), the document still opens/downloads normally.

3. **`getReadStats` query returns aggregate read data for documents in a folder** — A Convex query `documents.queries.getReadStats` accepts `{ documentIds: Id<"documents">[] }`, calls `requireRole(ctx, ["admin"])`, queries the `documentReads` table for all records matching the provided document IDs (using `by_documentId` index), groups by `documentId`, and returns `Record<string, { uniqueReaders: number, reads: Array<{ userId: Id<"users">, fullName: string, readAt: number }> }>`. The `uniqueReaders` count is the number of distinct users who have opened each document. The `reads` array includes user details (joined from users table) sorted by most recent `readAt` first.

4. **`getUsersWithAccessCount` query returns total users with access to a document** — A Convex query `documents.queries.getUsersWithAccessCount` accepts `{ documentId: Id<"documents"> }`, calls `requireRole(ctx, ["admin"])`, determines the total number of users who have access to this document by evaluating the document's permissions (or inherited folder permissions from Story 4.3). Logic: if the document is unrestricted (`permittedRoles` is `undefined` on both document and folder), count all active users in the team. If restricted, count users whose role is in `permittedRoles` PLUS users with individual `documentUserPermissions` records. Admins are always included in the count. Returns `{ totalWithAccess: number }`.

5. **Document list shows "Opened by X/Y" indicator for admin users** — In the folder contents view (from Story 4.1), each document card displays a read tracking indicator visible only to admin users. The indicator shows "Opened by X/Y" where X = unique users who have opened the document and Y = total users with access. The indicator uses the `ReadTracker` component (from Story 1.4) with a progress-style visual (e.g., progress bar or circular indicator filling proportionally).

6. **Non-admin users do NOT see read tracking indicators** — The read tracking indicators, counts, and detail views are exclusively for admin users. Non-admin users see no read tracking information. The queries (`getReadStats`, `getUsersWithAccessCount`) enforce admin role checks at the Convex layer.

7. **Admin can click to see the detailed reader list** — When an admin clicks on the "Opened by X/Y" indicator on a document, a popover or dialog appears showing the detailed list of who opened the document and when. Each entry shows: user name, role badge, and the date/time they last opened it (formatted with `date-fns`). Users who have NOT opened the document are listed separately (e.g., "Not yet opened" section) — derived by comparing users with access against the `documentReads` records.

8. **Read tracking updates in real time** — When a user opens a document, the admin's view of "Opened by X/Y" updates in real time via Convex subscription (useQuery). No manual refresh needed — the X count increments as soon as the `trackRead` mutation executes.

9. **`documentReads` table schema** — The `documentReads` table exists in `packages/backend/convex/schema.ts` with fields: `teamId: v.id("teams")`, `documentId: v.id("documents")`, `userId: v.id("users")`, `readAt: v.number()`. Indexes: `by_documentId` (documentId), `by_userId_documentId` (userId, documentId), `by_teamId` (teamId).

10. **Read tracking data is team-scoped** — All `documentReads` queries filter by `teamId` (from `requireAuth`). No cross-team read data is accessible. Enforces NFR6 (multi-tenant isolation).

## Tasks / Subtasks

- [x] **Task 1: Add `documentReads` table to schema** (AC: #9, #10)
  - [x] 1.1: Open `packages/backend/convex/schema.ts`. Add (or verify) the `documentReads` table definition with fields: `teamId: v.id("teams")`, `documentId: v.id("documents")`, `userId: v.id("users")`, `readAt: v.number()`.
  - [x] 1.2: Add indexes: `by_documentId` on `[documentId]`, `by_userId_documentId` on `[userId, documentId]`, `by_teamId` on `[teamId]`.
  - [x] 1.3: Run `npx convex dev` to verify schema deploys without errors.

- [x] **Task 2: Implement `trackRead` mutation** (AC: #1, #10)
  - [x] 2.1: Add `trackRead` to `packages/backend/convex/documents/mutations.ts`. Accepts `{ documentId: v.id("documents") }`.
  - [x] 2.2: Call `requireAuth(ctx)` to get `{ user, teamId }`.
  - [x] 2.3: Fetch the document by ID. Validate it exists and `document.teamId === teamId`. If not, throw `ConvexError({ code: "NOT_FOUND", message: "Document not found" })`.
  - [x] 2.4: Call `checkDocumentAccess(ctx, user, document)` from `convex/lib/permissions.ts` (Story 4.3). If access denied, throw `ConvexError({ code: "NOT_AUTHORIZED", message: "You don't have access to this document" })`.
  - [x] 2.5: Query `documentReads` using the `by_userId_documentId` index to check if a record already exists for this user + document combination.
  - [x] 2.6: If record exists, patch it with `{ readAt: Date.now() }` (update last read timestamp). If no record exists, insert `{ teamId, documentId, userId: user._id, readAt: Date.now() }`.
  - [x] 2.7: Return `{ success: true }`.

- [x] **Task 3: Implement `getReadStats` query** (AC: #3, #6, #10)
  - [x] 3.1: Add `getReadStats` to `packages/backend/convex/documents/queries.ts`. Accepts `{ documentIds: v.array(v.id("documents")) }`.
  - [x] 3.2: Call `requireRole(ctx, ["admin"])` to enforce admin-only access.
  - [x] 3.3: For each `documentId` in the input array, query `documentReads` using the `by_documentId` index. Collect all read records.
  - [x] 3.4: For each read record, fetch the associated user to get `fullName`. Build the grouped result: `Record<string, { uniqueReaders: number, reads: Array<{ userId, fullName, readAt }> }>`.
  - [x] 3.5: Sort each document's `reads` array by `readAt` descending (most recent first).
  - [x] 3.6: Return the grouped stats object.

- [x] **Task 4: Implement `getUsersWithAccessCount` query** (AC: #4, #6, #10)
  - [x] 4.1: Add `getUsersWithAccessCount` to `packages/backend/convex/documents/queries.ts`. Accepts `{ documentId: v.id("documents") }`.
  - [x] 4.2: Call `requireRole(ctx, ["admin"])`.
  - [x] 4.3: Fetch the document. If `document.permittedRoles` is defined (override), use it. If `undefined`, fetch the parent folder and use its `permittedRoles` (inheritance from Story 4.3).
  - [x] 4.4: Determine total users with access:
    - If `permittedRoles` is `undefined`/`null` (unrestricted), count all active users in the team: `ctx.db.query("users").withIndex("by_teamId", q => q.eq("teamId", teamId)).collect()`, then count those with active status.
    - If `permittedRoles` is an array, count users whose `role` is in the array. Additionally, query `documentUserPermissions` for individual grants on this document or its folder (if inheriting). Union the two sets (avoid double-counting users who qualify by both role and individual grant).
    - Always include admin users in the count (admins always have access).
  - [x] 4.5: Return `{ totalWithAccess: number }`.

- [x] **Task 5: Implement `getReadersDetail` query for the detail popover** (AC: #7, #6, #10)
  - [x] 5.1: Add `getReadersDetail` to `packages/backend/convex/documents/queries.ts`. Accepts `{ documentId: v.id("documents") }`.
  - [x] 5.2: Call `requireRole(ctx, ["admin"])`.
  - [x] 5.3: Fetch all `documentReads` for this document (using `by_documentId` index). Join with users table to get `fullName`, `email`, `role`.
  - [x] 5.4: Determine all users with access to this document (same logic as Task 4 — reuse via a shared helper function `_getUsersWithAccess(ctx, document, teamId)` that returns the full user list).
  - [x] 5.5: Split into two lists: `readers` (users who have a `documentReads` record, with their `readAt` timestamp) and `nonReaders` (users with access but no read record).
  - [x] 5.6: Sort `readers` by `readAt` descending. Sort `nonReaders` alphabetically by `fullName`.
  - [x] 5.7: Return `{ readers: Array<{ userId, fullName, role, readAt }>, nonReaders: Array<{ userId, fullName, role }> }`.

- [x] **Task 6: Wire `trackRead` to document open/download actions** (AC: #2)
  - [x] 6.1: Modify `apps/web/src/components/documents/DocumentDetail.tsx` (from Story 4.2). In the "Open" / view action handler, add a call to `trackRead({ documentId })` using `useMutation`. Wrap in a try-catch — the tracking must not block or break the open action.
  - [x] 6.2: In the "Download" action handler, add the same `trackRead({ documentId })` call. The download proceeds regardless of whether tracking succeeds.
  - [x] 6.3: For video links (videoUrl documents), call `trackRead` when the user clicks the video link (before opening in new tab).
  - [x] 6.4: Ensure the `trackRead` call is non-blocking: use `void trackRead({ documentId })` pattern (fire-and-forget, no `await` blocking the open/download action). Example:
    ```typescript
    const handleOpen = async () => {
      // Fire-and-forget tracking
      void trackRead({ documentId: document._id }).catch(() => {})
      // Proceed with document open/download
      window.open(documentUrl, "_blank")
    }
    ```

- [x] **Task 7: Build `ReadTrackerDetail` component (reader list popover)** (AC: #7)
  - [x] 7.1: Create `apps/web/src/components/documents/ReadTrackerDetail.tsx`. This is a `Popover` (shadcn) that shows the detailed reader list. Accepts props: `documentId: Id<"documents">`, `trigger: ReactNode` (the clickable element).
  - [x] 7.2: Inside the popover content, call `useQuery(api.documents.queries.getReadersDetail, { documentId })`. Show skeleton while loading (`undefined`).
  - [x] 7.3: Render two sections:
    - **"Opened" section**: List of users who have opened the document. Each row: user name, role `Badge` (from `components/shared/StatusBadge` or inline), and formatted date/time (e.g., "Mar 25, 2026 at 14:30" using `date-fns format`).
    - **"Not yet opened" section** (collapsible or below a separator): List of users with access who haven't opened. Each row: user name and role badge. Muted text styling.
  - [x] 7.4: If there are no readers yet, show "No one has opened this document yet" with the full list of users in the "Not yet opened" section.
  - [x] 7.5: Add a header showing the document name and summary (e.g., "3 of 12 users have opened this document").

- [x] **Task 8: Integrate read tracking indicators into document list** (AC: #5, #8)
  - [x] 8.1: Modify `apps/web/src/components/documents/DocumentCard.tsx` (from Story 4.1). Add read tracking data display for admin users.
  - [x] 8.2: In the parent folder contents view (the page or component that renders the document list), call `useQuery(api.documents.queries.getReadStats, { documentIds })` where `documentIds` is the array of document IDs currently displayed. Only call this query if the user is an admin; skip for non-admin users (use `"skip"` sentinel or conditional query). Also call `getUsersWithAccessCount` for each document (or batch this — see Dev Notes).
  - [x] 8.3: Pass the read stats data to each `DocumentCard` as props: `readCount: number` (unique readers) and `totalAccess: number` (total with access).
  - [x] 8.4: In `DocumentCard`, render the `ReadTracker` component (from Story 1.4 — `components/shared/` or inline) showing "Opened by X/Y" with a progress visual. Only render for admin users.
  - [x] 8.5: Wrap the `ReadTracker` indicator with `ReadTrackerDetail` popover (from Task 7), making the indicator clickable to show the detail view.
  - [x] 8.6: Ensure the read tracking data updates in real time via Convex subscription — when a new `documentReads` record is inserted, the `getReadStats` query re-evaluates and the UI updates automatically.

- [x] **Task 9: Write backend unit tests** (AC: #1, #2, #3, #4, #6, #9, #10)
  - [x] 9.1: Create `packages/backend/convex/documents/__tests__/readTracking.test.ts`.
  - [x] 9.2: Test `trackRead`:
    - (a) Authenticated user with access can track a read — verify `documentReads` record created with correct `teamId`, `documentId`, `userId`, `readAt`.
    - (b) Second call by same user updates `readAt` instead of creating duplicate — verify only one record exists after two calls.
    - (c) Different user tracking same document creates a separate record — verify two records exist.
    - (d) User without document access receives `NOT_AUTHORIZED` error.
    - (e) Document from different team returns `NOT_FOUND`.
    - (f) Unauthenticated request is rejected.
  - [x] 9.3: Test `getReadStats`:
    - (a) Admin receives correct `uniqueReaders` count for each document.
    - (b) Admin receives correct `reads` array with user details sorted by most recent first.
    - (c) Documents with zero reads return `uniqueReaders: 0` and empty `reads` array.
    - (d) Non-admin receives `NOT_AUTHORIZED`.
  - [x] 9.4: Test `getUsersWithAccessCount`:
    - (a) Unrestricted document returns total active team members count.
    - (b) Restricted document (role-based) returns count of users with matching roles + admins.
    - (c) Document with individual user permissions includes those users in the count.
    - (d) Inherited permissions: document with `permittedRoles: undefined` uses folder permissions for the count.
    - (e) Non-admin receives `NOT_AUTHORIZED`.
  - [x] 9.5: Test `getReadersDetail`:
    - (a) Returns `readers` list with correct user info and timestamps.
    - (b) Returns `nonReaders` list (users with access but no read record).
    - (c) Non-admin receives `NOT_AUTHORIZED`.

- [x] **Task 10: Final validation** (AC: all)
  - [x] 10.1: Run `pnpm typecheck` — must pass with zero errors.
  - [x] 10.2: Run `pnpm lint` — must pass with zero errors.
  - [x] 10.3: Run backend tests (`vitest run` in packages/backend) — all new and existing tests pass.
  - [ ] 10.4: Start the dev server. Navigate to `/documents`. Open a folder with documents.
  - [ ] 10.5: As admin, verify "Opened by 0/Y" indicators appear on each document card (where Y reflects users with access).
  - [ ] 10.6: Switch to a non-admin user account. Verify NO read tracking indicators are visible.
  - [ ] 10.7: As the non-admin user, open a document. Switch back to admin. Verify the indicator now shows "Opened by 1/Y" — updated in real time without refresh.
  - [ ] 10.8: As admin, click the "Opened by" indicator. Verify the detail popover shows the non-admin user's name, role, and read timestamp, plus a "Not yet opened" section listing remaining users.
  - [ ] 10.9: Download a document as another user. Verify the read count increments.
  - [ ] 10.10: Open the same document again as the same user. Verify the count does NOT increment (same unique reader, timestamp updated).
  - [ ] 10.11: Verify that changing document permissions (Story 4.3) updates the Y count in "Opened by X/Y" (real-time via subscription).

## Dev Notes

### Architecture Context

This is the **read tracking story for Epic 4 (Document Hub)**. It implements the analytics layer that lets admins monitor document engagement across the team. Read tracking is an admin-only feature — regular users are tracked but never see tracking data.

This story directly implements:

- **FR16:** The system tracks when each user opens a document and displays aggregate open counts to admins
- **UX-DR7:** Implement read tracking indicator component for document list (e.g., "Opened by 18/25")
- **NFR2:** Real-time updates propagate to all connected clients within 1 second (Convex subscriptions)
- **NFR5:** All data access enforced at the Convex mutation/query layer (admin-only queries)
- **NFR6:** Multi-tenant isolation (teamId scoping on `documentReads`)

### Key Architectural Decisions from architecture.md

- **Junction Table for Read Tracking:** `documentReads` is a junction table (userId, documentId, readAt) — one of the "dynamic relations with metadata" requiring a dedicated table rather than an array. Each read carries its own timestamp and needs to be queried from both the document side (who read this?) and the user side (what did this user read?). [Source: architecture.md#Data-Architecture]

- **Convex Function Organization:** Read tracking queries in `convex/documents/queries.ts` (`getReadStats`, `getUsersWithAccessCount`, `getReadersDetail`). Tracking mutation in `convex/documents/mutations.ts` (`trackRead`). [Source: architecture.md#Convex-Function-Organization]

- **Component Organization:** `ReadTracker` component in `components/documents/ReadTracker.tsx` for the progress-style indicator. The architecture doc references this as one of the planned document components. [Source: architecture.md#Frontend-Architecture]

- **Real-time Subscriptions:** Admin views use `useQuery` for live subscriptions to read stats — the count updates automatically when any user opens a document. No manual polling or cache invalidation. [Source: architecture.md#API-Communication-Patterns]

- **Authorization Pattern:** `requireRole(ctx, ["admin"])` on all read-stat queries. `requireAuth(ctx)` on `trackRead` (any authenticated user can trigger a read). Access check via `checkDocumentAccess` ensures users can only track reads on documents they're authorized to view. [Source: architecture.md#Authentication-&-Security]

- **Error Handling:** `ConvexError` with `NOT_AUTHORIZED`, `NOT_FOUND` codes. [Source: architecture.md#Format-Patterns]

- **Date Formatting:** `date-fns` for all UI date display. Stored as Unix timestamp ms (`Date.now()`). [Source: architecture.md#Format-Patterns]

### Dependencies (Must Be Complete Before Starting)

| Dependency | Story | Status Check |
|------------|-------|-------------|
| `documents` table with CRUD | Story 4.1, 4.2 | `packages/backend/convex/documents/queries.ts` and `mutations.ts` must exist |
| `checkDocumentAccess` permission utility | Story 4.3 | `packages/backend/convex/lib/permissions.ts` must export `checkDocumentAccess` |
| `requireAuth`, `requireRole` helpers | Story 2.1 | `packages/backend/convex/lib/auth.ts` must export both |
| `DocumentCard` component | Story 4.1 | `apps/web/src/components/documents/DocumentCard.tsx` must exist |
| `DocumentDetail` component | Story 4.2 | `apps/web/src/components/documents/DocumentDetail.tsx` must exist |
| `ReadTracker` indicator component | Story 1.4 | `apps/web/src/components/shared/` — "Opened by X/Y" progress indicator. If not built yet, create inline in this story. |
| Documents page with folder contents view | Story 4.1 | `apps/web/src/app/(app)/documents/page.tsx` must exist |
| shadcn/ui Popover, Badge, Skeleton, ScrollArea | Story 1.2 | Components installed in admin app |
| `documentUserPermissions` table and logic | Story 4.3 | Required for computing "Y" (total users with access) |

### Current State (Baseline)

**`documentReads` table:** May or may not exist in schema.ts (defined in Story 4.1's schema but no CRUD logic). This story adds all read/write logic.

**`convex/documents/queries.ts`:** Should exist from Stories 4.1-4.3 with folder and document queries. This story ADDS `getReadStats`, `getUsersWithAccessCount`, `getReadersDetail`.

**`convex/documents/mutations.ts`:** Should exist from Stories 4.1-4.3. This story ADDS `trackRead`.

**`components/documents/DocumentCard.tsx`:** Should exist from Story 4.1. This story MODIFIES it to display read tracking indicators for admin users.

**`components/documents/DocumentDetail.tsx`:** Should exist from Story 4.2. This story MODIFIES it to call `trackRead` on open/download.

**`components/shared/ReadTracker.tsx` or similar:** May exist from Story 1.4 (reusable UI component). If so, use it. If not, create the indicator component within this story.

### Batching Strategy for Read Stats

To avoid N+1 query problems, the `getReadStats` query accepts an array of `documentIds` and returns stats for all of them in a single query call. The frontend collects all visible document IDs and makes one query:

```typescript
// In the folder contents view
const documents = useQuery(api.documents.queries.getFolderContents, { folderId })
const documentIds = documents?.filter(d => d.type === "document").map(d => d._id) ?? []

// Single batched query for all read stats
const readStats = useQuery(
  api.documents.queries.getReadStats,
  isAdmin && documentIds.length > 0 ? { documentIds } : "skip"
)
```

For `getUsersWithAccessCount`, consider two approaches:
1. **Inline with `getReadStats`:** Extend `getReadStats` to also return `totalWithAccess` per document, avoiding a separate query. This is the RECOMMENDED approach — compute access counts while already iterating documents.
2. **Separate query per document:** Simpler but creates N queries. Acceptable for Sprint 1 if folder sizes are small (< 50 documents).

**Recommendation:** Merge `getUsersWithAccessCount` into `getReadStats` as an additional field. Rename to `getDocumentReadStats` if needed for clarity.

### Upsert Pattern for `trackRead`

Convex does not have a native upsert. The pattern is:

```typescript
// Check for existing read
const existing = await ctx.db
  .query("documentReads")
  .withIndex("by_userId_documentId", q =>
    q.eq("userId", user._id).eq("documentId", args.documentId)
  )
  .unique()

if (existing) {
  await ctx.db.patch(existing._id, { readAt: Date.now() })
} else {
  await ctx.db.insert("documentReads", {
    teamId,
    documentId: args.documentId,
    userId: user._id,
    readAt: Date.now(),
  })
}
```

The `by_userId_documentId` composite index makes this lookup efficient.

### Component Architecture

```
Documents Page (page.tsx) [MODIFIED]
├── FolderCard (unchanged)
├── DocumentCard [MODIFIED]
│   ├── Document info (name, type icon, upload date)
│   ├── ReadTracker indicator (admin-only) [NEW]
│   │   └── "Opened by X/Y" with progress visual
│   └── ReadTrackerDetail Popover [NEW — wraps ReadTracker]
│       ├── Header: "Document Name — 3 of 12 opened"
│       ├── "Opened" section
│       │   └── Per reader: Name | Role Badge | "Mar 25, 2026 at 14:30"
│       ├── Separator
│       └── "Not yet opened" section (muted)
│           └── Per non-reader: Name | Role Badge
└── DocumentDetail Sheet [MODIFIED]
    ├── Open/Download buttons → now call trackRead [MODIFIED]
    └── Video link → calls trackRead on click [MODIFIED]
```

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/backend/convex/schema.ts` | Modified | Add/verify `documentReads` table definition with indexes |
| `packages/backend/convex/documents/mutations.ts` | Modified | Add `trackRead` mutation |
| `packages/backend/convex/documents/queries.ts` | Modified | Add `getReadStats`, `getUsersWithAccessCount`, `getReadersDetail` queries |
| `apps/web/src/components/documents/ReadTrackerDetail.tsx` | **Created** | Detail popover showing who opened and who hasn't |
| `apps/web/src/components/documents/DocumentCard.tsx` | Modified | Add read tracking indicator for admin users |
| `apps/web/src/components/documents/DocumentDetail.tsx` | Modified | Call `trackRead` on open/download actions |
| `apps/web/src/app/(app)/documents/page.tsx` | Modified | Add `getReadStats` query call, pass data to DocumentCards |
| `packages/backend/convex/documents/__tests__/readTracking.test.ts` | **Created** | Tests for trackRead, getReadStats, getUsersWithAccessCount, getReadersDetail |

### What This Story Does NOT Include

- **No email/push notifications for unread documents** — admins see read stats on the dashboard, but there's no "remind users to read" action or automated notification. Future enhancement.
- **No per-page read tracking for PDFs** — tracking is at the document level only (opened or not), not how much of the document was consumed.
- **No read tracking on folders** — only individual documents are tracked, not folder views.
- **No read tracking history / timeline** — only the most recent read timestamp per user per document is stored. No historical log of every open event.
- **No export of read data** — no CSV export or report generation for read statistics. Visual only.
- **No "mark as read" without opening** — the only way to register a read is by opening/downloading the document.
- **No bulk read stats dashboard** — read stats are shown per document in the folder view. No aggregate "most read documents" or "least engaged users" dashboard.

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Story 4.3 not implemented yet (no `checkDocumentAccess`) | `trackRead` needs access verification. If 4.3 is not done, temporarily skip the access check in `trackRead` (just validate document exists + teamId), and add a TODO to enforce it when permissions are available. The admin-only queries can still use `requireRole`. |
| ReadTracker component from Story 1.4 may not exist | Check `components/shared/` for the component. If absent, build a simple inline indicator: a small text span "Opened by X/Y" with a proportional progress bar using shadcn `Progress` or a custom div. |
| Computing "Y" (users with access) is expensive for unrestricted documents | For unrestricted documents, Y = total active team members. Cache this count at the page level (single query for all unrestricted docs). For restricted documents, the permission check is bounded by team size (< 100 users for Sprint 1). |
| `getReadStats` with many documentIds may be slow | For Sprint 1, folders typically contain < 50 documents. The query batches all IDs in a single call. For scale, add pagination to folder contents (limiting to 50 docs per page). |
| Fire-and-forget `trackRead` calls may silently fail | The `.catch(() => {})` pattern prevents uncaught promise rejections. For Sprint 1, silent failure is acceptable — the read tracking is analytics, not critical business logic. If needed later, add retry logic or error logging. |

### Alignment with Architecture Document

- **Data Model:** Matches `architecture.md § Data Architecture` — `documentReads` as a junction table with metadata (readAt timestamp), queried from both sides
- **Convex Organization:** Matches `architecture.md § Convex Function Organization` — `getReadStats` and `trackRead` in `convex/documents/`
- **Component Structure:** Matches `architecture.md § Frontend Architecture` — `ReadTracker` in `components/documents/`
- **Auth Pattern:** Matches `architecture.md § Authentication & Security` — `requireAuth` for tracking, `requireRole(["admin"])` for stats queries
- **Real-time:** Matches `architecture.md § API & Communication Patterns` — `useQuery` subscriptions for live updates
- **Date Handling:** Matches `architecture.md § Format Patterns` — stored as `number` (Unix ms), displayed with `date-fns`
- **Error Handling:** Matches `architecture.md § Format Patterns` — `ConvexError` with standardized codes
- **Loading States:** Matches `architecture.md § Process Patterns` — `useQuery` returns `undefined` → skeleton
- **Multi-tenancy:** Matches `architecture.md § Authentication & Security` — all queries filter by `teamId`
- **UX-DR7:** Matches `epics.md § UX Design Requirements` — read tracking indicator "Opened by X/Y" with progress visual
- **No detected conflicts** with the architecture document

### References

- [Source: architecture.md#Data-Architecture] — `documentReads` junction table (userId, documentId, readAt), hybrid normalization approach
- [Source: architecture.md#Authentication-&-Security] — RBAC model (6 roles), requireAuth/requireRole, multi-tenant teamId isolation
- [Source: architecture.md#Frontend-Architecture] — ReadTracker in components/documents/, component organization by feature
- [Source: architecture.md#API-Communication-Patterns] — Convex useQuery subscriptions for real-time data
- [Source: architecture.md#Format-Patterns] — ConvexError codes, dates as Unix ms timestamps, date-fns for UI formatting
- [Source: architecture.md#Process-Patterns] — Loading states (useQuery → undefined → skeleton), mutation feedback (toast)
- [Source: architecture.md#Implementation-Patterns-&-Consistency-Rules] — Naming conventions, enforcement guidelines, anti-patterns
- [Source: architecture.md#Project-Structure-&-Boundaries] — Module boundaries, test co-location
- [Source: epics.md#Story-4.4] — Original story definition, user story, and BDD acceptance criteria
- [Source: epics.md#FR-Coverage-Map] — FR16 mapped to Epic 4 (Document Hub read tracking)
- [Source: epics.md#UX-DR7] — Read tracking indicator component "Opened by X/Y"
- [Source: 4-3-document-permissions-role-user-level.md] — Permission model (checkDocumentAccess, filterByAccess, documentUserPermissions) that determines "Y" in "X/Y"
- [Source: 4-1-document-data-model-folder-structure.md] — Document and folder schema, DocumentCard component
- [Source: 4-2-file-upload-replace-video-links.md] — DocumentDetail component with open/download actions

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 via Claude Code

### Debug Log References

None — clean implementation, no debugging required.

### Completion Notes List

- **Task 1:** `documentReads` table already existed from Story 4.1. Added missing `by_teamId` index per AC #9.
- **Task 2:** `trackRead` mutation uses `requireAuth` (any authenticated user) + `checkDocumentAccess` (Story 4.3). Upsert pattern via `by_userId_documentId` index.
- **Tasks 3-5:** Shared helper `_getUsersWithAccess()` extracts access computation logic, reused by `getUsersWithAccessCount`, `getReadersDetail`, and inlined in `getReadStats`. Per dev notes recommendation, `getReadStats` also returns `totalWithAccess` per document to avoid N+1 queries on the frontend.
- **Task 6:** `trackRead` wired to both `handleOpenDownload` and `handleWatchVideo` in DocumentDetail. Uses `void trackRead({ documentId }).catch(() => {})` fire-and-forget pattern.
- **Task 7:** `ReadTrackerDetail` uses shadcn Popover with ScrollArea. Shows "Opened" and "Not yet opened" sections with role badges and `date-fns` formatted timestamps.
- **Task 8:** ReadTracker indicator built inline in DocumentCard using shadcn Progress + "Opened by X/Y" text. Wrapped with ReadTrackerDetail popover. Documents page fetches batched `getReadStats` for all visible documents (admin-only via `"skip"` sentinel).
- **Task 9:** 18 tests covering all 4 functions: `trackRead` (6 tests), `getReadStats` (4 tests), `getUsersWithAccessCount` (5 tests), `getReadersDetail` (3 tests). All pass.
- **Task 10:** Typecheck passes (0 errors). Pre-existing lint errors in `apps/native/` and `apps/web/src/components/ui/sidebar.tsx` unrelated to this story — all changed files lint clean. All 218 backend tests pass (12 test files).
- **Decision:** ReadTracker component from Story 1.4 did not exist. Built inline in DocumentCard using shadcn Progress bar per the risk mitigation strategy in the story.
- **Decision:** Per dev notes recommendation, `getReadStats` was extended with `totalWithAccess` field to avoid N+1 `getUsersWithAccessCount` calls. The standalone `getUsersWithAccessCount` query still exists for individual document use cases.

### File List

- `packages/backend/convex/table/documentReads.ts` — Modified (added `by_teamId` index)
- `packages/backend/convex/documents/mutations.ts` — Modified (added `trackRead` mutation)
- `packages/backend/convex/documents/queries.ts` — Modified (added `getReadStats`, `getUsersWithAccessCount`, `getReadersDetail` queries + `_getUsersWithAccess` helper)
- `apps/web/src/components/documents/DocumentDetail.tsx` — Modified (wired `trackRead` to open/download/video handlers)
- `apps/web/src/components/documents/ReadTrackerDetail.tsx` — **Created** (reader detail popover)
- `apps/web/src/components/documents/DocumentCard.tsx` — Modified (added read tracking indicator with progress bar + popover)
- `apps/web/src/app/(app)/documents/page.tsx` — Modified (added `getReadStats` query, passes data to DocumentCard)
- `packages/backend/convex/documents/__tests__/readTracking.test.ts` — **Created** (18 tests)
- `_bmad-output/implementation-artifacts/4-4-read-tracking.md` — Updated (tasks marked complete, dev record filled)
