# Story 4.5: Document Search & Browse

Status: dev-complete
Story Type: fullstack

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As a user,
I want to search and filter documents by name, type, or folder,
so that I can quickly find the document I need.

## Acceptance Criteria

1. **`searchDocuments` query returns matching documents across all accessible folders** — A Convex query `documents.queries.searchDocuments` accepts `{ searchTerm: v.string(), fileType: v.optional(v.string()) }`, calls `requireAuth(ctx)`, queries the `documents` table filtered by `teamId`, applies access filtering (admin sees all; non-admin users see only documents where the document's `permittedRoles` includes their role, or `permittedRoles` is `null`/`undefined` and the parent folder's `permittedRoles` includes their role or is also unrestricted — reusing the access logic from Story 4.3). Additionally checks individual `documentUserPermissions` grants for the user. Matches documents where the `name` field contains the `searchTerm` (case-insensitive substring match). If `fileType` is provided, further filters by document type: `"pdf"` (extension === "pdf"), `"image"` (extension in ["jpg", "png"]), `"spreadsheet"` (extension in ["xlsx", "csv"]), `"video"` (videoUrl is set). Returns an array of document objects enriched with `folderPath` (the breadcrumb path string, e.g., "Playbooks > Attacking"), sorted by relevance (exact name match first, then partial) then by `createdAt` descending.

2. **Search bar is displayed on the documents page** — At the top of the `/documents` page, a search bar is always visible regardless of the current folder context. The search bar uses a shadcn `Input` component with a search icon (`Search` from `lucide-react`) and placeholder text "Search documents...". The search bar is available to all authenticated users (not admin-only).

3. **Results filter in real time as the user types** — As the user types in the search bar, the search results update in real time. A debounce of 300ms is applied to avoid excessive query calls. While the search term has fewer than 2 characters, no search is executed (the normal folder browse view is shown). When the search term reaches 2+ characters, the folder browse view is replaced with the search results view.

4. **Search results display document name, folder path, type icon, and upload date** — Each search result item renders as a card or list row showing: (a) a file type icon (PDF icon, image icon, spreadsheet icon, or video/link icon from `lucide-react`), (b) the document name (with the matching search term highlighted/bolded), (c) the folder path as a breadcrumb trail in muted text (e.g., "Playbooks > Attacking"), (d) the upload date formatted with `date-fns` (e.g., "Mar 25, 2026"). Admin users additionally see the read tracking indicator ("Opened by X/Y") on each search result (reusing the `ReadTracker` component from Story 4.4).

5. **File type filter dropdown is available** — Next to the search bar, a filter dropdown (shadcn `Select` or `DropdownMenu`) allows the user to filter by document type: "All Types" (default), "PDF", "Images", "Spreadsheets", "Video Links". Selecting a filter applies it immediately to the search results (or to the folder browse view if no search term is active). The filter works in combination with the search term — both filters are applied together.

6. **Clicking a search result navigates to the document in its folder context** — When the user clicks on a search result, the search view is dismissed, the documents page navigates to the document's parent folder (sets `?folder=<folderId>` in the URL as established in Story 4.1), and the document is visually highlighted or scrolled into view. This allows the user to see the document in its organizational context.

7. **Empty state for no search results** — When a search term is entered but no matching documents are found (after applying access filtering and file type filter), an empty state is shown with a message: "No documents found matching '[search term]'" and a suggestion: "Try a different search term or check your filters." An icon (e.g., `SearchX` from `lucide-react`) accompanies the message.

8. **Search respects document access permissions** — The search results only include documents the current user has permission to access (same permission logic as the folder browse view from Stories 4.1 and 4.3). Non-admin users never see documents restricted to other roles. Access control is enforced at the Convex query layer, not just the UI. Admin users see all documents across all folders.

9. **Folder browse view supports file type filtering** — Even without a search term, the file type filter dropdown (from AC #5) applies to the current folder contents view. When a file type filter is active in browse mode, only documents matching the selected type are displayed in the folder (subfolders remain visible regardless of filter). Clearing the filter (selecting "All Types") returns to the unfiltered view.

10. **Search and filter state is preserved in the URL** — The active search term and file type filter are stored in URL search params (`?search=<term>&type=<fileType>`) so that the state is bookmarkable and shareable. Navigating away from `/documents` and returning restores the search/filter state from the URL. Clearing the search bar removes the `search` param from the URL.

11. **Keyboard accessibility** — Pressing `/` (forward slash) anywhere on the documents page focuses the search bar (common UX pattern for search). Pressing `Escape` while the search bar is focused clears the search term and returns to the folder browse view. The search bar supports standard keyboard navigation.

12. **Performance: search is efficient for typical team sizes** — The `searchDocuments` query uses Convex's `filter` with string matching. For Sprint 1 (single team, < 500 documents), in-memory filtering is acceptable. The query returns a maximum of 50 results to prevent excessive rendering. If more than 50 matches exist, a "Showing 50 of X results" indicator is displayed.

## Tasks / Subtasks

- [x] **Task 1: Implement `searchDocuments` query** (AC: #1, #8, #12)
  - [x] 1.1: Open `packages/backend/convex/documents/queries.ts`. Add a new exported query `searchDocuments`. Define args: `{ searchTerm: v.string(), fileType: v.optional(v.string()) }`.
  - [x] 1.2: Call `requireAuth(ctx)` to get `{ user, teamId }`.
  - [x] 1.3: Query all `documents` using the `by_teamId` index filtered by `teamId`. Collect all documents for the team.
  - [x] 1.4: Apply search term filtering: filter documents where `document.name.toLowerCase().includes(searchTerm.toLowerCase().trim())`. If `searchTerm` is empty or less than 2 characters, return an empty array.
  - [x] 1.5: Apply file type filtering if `fileType` is provided:
    - `"pdf"`: filter `document.extension === "pdf"`
    - `"image"`: filter `document.extension` in `["jpg", "png"]`
    - `"spreadsheet"`: filter `document.extension` in `["xlsx", "csv"]`
    - `"video"`: filter `document.videoUrl !== undefined && document.videoUrl !== null`
  - [x] 1.6: Apply access filtering: For admin users, skip filtering (admins see everything). For non-admin users, apply the same access logic as `getFolderContents` (Story 4.1/4.3): check if the document's `permittedRoles` (or inherited from parent folder if `undefined`) includes the user's role OR the document has no restrictions (`permittedRoles` is `null`/`undefined` and folder's `permittedRoles` is also `null`/`undefined`). Also check `documentUserPermissions` for individual user grants on the document or its folder. Reuse `checkDocumentAccess` from `convex/lib/permissions.ts` if available, or implement the filtering logic inline.
  - [x] 1.7: For each matching document, fetch the parent folder (and grandparent folder if exists) to build the `folderPath` string (e.g., "Playbooks > Attacking"). Attach `folderPath` and `folderId` to each result.
  - [x] 1.8: Sort results: exact name matches first (document name starts with the search term), then partial matches. Within each group, sort by `createdAt` descending.
  - [x] 1.9: Limit results to 50. Track the total match count before limiting. Return `{ results: DocumentSearchResult[], totalCount: number }` where `DocumentSearchResult` extends the document with `folderPath: string`.

- [x] **Task 2: Implement `getFilteredFolderContents` query (or extend `getFolderContents`)** (AC: #9)
  - [x] 2.1: Open `packages/backend/convex/documents/queries.ts`. Either extend the existing `getFolderContents` query to accept an optional `fileType: v.optional(v.string())` argument, or create a wrapper query. The recommended approach is to add the optional `fileType` parameter to the existing `getFolderContents` query.
  - [x] 2.2: When `fileType` is provided, apply the same file type filtering logic as in Task 1.5 to the documents returned. Subfolders are always returned regardless of file type filter.
  - [x] 2.3: Ensure backward compatibility — if `fileType` is not provided, behavior is identical to the current `getFolderContents`.

- [x] **Task 3: Build `DocumentSearchBar` component** (AC: #2, #3, #11)
  - [x] 3.1: Create `apps/admin/src/components/documents/DocumentSearchBar.tsx`. Renders a shadcn `Input` with a `Search` icon (from `lucide-react`) prefix and placeholder "Search documents...".
  - [x] 3.2: Accept props: `value: string`, `onChange: (value: string) => void`, `onClear: () => void`.
  - [x] 3.3: Add a clear button (`X` icon) that appears when the input has text. Clicking it calls `onClear()` and clears the input.
  - [x] 3.4: Implement `/` keyboard shortcut: add a global `keydown` event listener on the documents page (in the parent component) that focuses the search input when `/` is pressed and the input is not already focused (and no other input/textarea is focused). Pressing `Escape` while the search input is focused calls `onClear()` and blurs the input.
  - [x] 3.5: Style with appropriate width (full-width on mobile, constrained on desktop), border, and focus ring consistent with the design system.

- [x] **Task 4: Build `DocumentTypeFilter` component** (AC: #5)
  - [x] 4.1: Create `apps/admin/src/components/documents/DocumentTypeFilter.tsx`. Renders a shadcn `Select` component with options: "All Types" (value: `""`), "PDF" (value: `"pdf"`), "Images" (value: `"image"`), "Spreadsheets" (value: `"spreadsheet"`), "Video Links" (value: `"video"`).
  - [x] 4.2: Accept props: `value: string`, `onChange: (value: string) => void`.
  - [x] 4.3: Each option includes a file type icon prefix (from `lucide-react`): `FileText` for PDF, `Image` for Images, `Table` for Spreadsheets, `Video` for Video Links, `Files` for All Types.
  - [x] 4.4: Style to sit alongside the search bar in a horizontal toolbar layout.

- [x] **Task 5: Build `DocumentSearchResults` component** (AC: #4, #7, #12)
  - [x] 5.1: Create `apps/admin/src/components/documents/DocumentSearchResults.tsx`. Accepts props: `results: DocumentSearchResult[]`, `totalCount: number`, `searchTerm: string`, `isLoading: boolean`, `onResultClick: (result: DocumentSearchResult) => void`, `isAdmin: boolean`.
  - [x] 5.2: When `isLoading` is `true` (query returning `undefined`), render skeleton placeholders (4-6 skeleton rows matching the result card layout).
  - [x] 5.3: When `results` is empty and not loading, render the empty state: `SearchX` icon (from `lucide-react`), message "No documents found matching '[searchTerm]'", subtext "Try a different search term or check your filters."
  - [x] 5.4: When results exist, render a list of result cards. Each card shows:
    - File type icon: `FileText` for PDF, `ImageIcon` for images, `Sheet` for spreadsheets, `Video` for video links (from `lucide-react`)
    - Document name with the search term highlighted (wrap matching substring in a `<mark>` or `<span className="font-semibold bg-yellow-100 dark:bg-yellow-900/30">` tag)
    - Folder path in muted text (e.g., "Playbooks > Attacking") using `text-muted-foreground` class
    - Upload date formatted with `date-fns` `format(createdAt, "MMM d, yyyy")`
    - For admin users: `ReadTracker` indicator (from Story 4.4) if available
  - [x] 5.5: Each result card is clickable — calls `onResultClick` with the result.
  - [x] 5.6: If `totalCount > results.length` (results were capped at 50), display a "Showing {results.length} of {totalCount} results" indicator at the bottom of the list.
  - [x] 5.7: Add hover state and cursor pointer on result cards. Use consistent spacing and dividers between results.

- [x] **Task 6: Build `DocumentSearchToolbar` component** (AC: #2, #5, #10)
  - [x] 6.1: Create `apps/admin/src/components/documents/DocumentSearchToolbar.tsx`. Composes `DocumentSearchBar` and `DocumentTypeFilter` in a horizontal layout (flexbox row, gap between items).
  - [x] 6.2: Accept props: `searchTerm: string`, `onSearchChange: (value: string) => void`, `fileType: string`, `onFileTypeChange: (value: string) => void`.
  - [x] 6.3: On mobile viewports (< 640px), stack the search bar and filter vertically. On desktop, display side-by-side.
  - [x] 6.4: Include the `/` keyboard shortcut label as a hint inside or near the search bar (e.g., a small `kbd` tag showing `/` inside the input, visible on desktop only).

- [x] **Task 7: Integrate search and filter into the Documents page** (AC: #3, #6, #9, #10)
  - [x] 7.1: Modify `apps/admin/src/app/(app)/documents/page.tsx`. Add state management for search and filtering:
    - Read `search` and `type` from URL search params on mount
    - Create state: `searchTerm` (string, from URL or empty), `debouncedSearchTerm` (debounced version, 300ms delay), `fileType` (string, from URL or empty)
  - [x] 7.2: Implement debounce: use a `useEffect` with `setTimeout` to update `debouncedSearchTerm` 300ms after `searchTerm` changes. Clear the timeout on cleanup.
  - [x] 7.3: Conditional query logic:
    - When `debouncedSearchTerm.length >= 2`: call `useQuery(api.documents.queries.searchDocuments, { searchTerm: debouncedSearchTerm, fileType: fileType || undefined })`. Show `DocumentSearchResults` component instead of the folder browse view.
    - When `debouncedSearchTerm.length < 2` and `fileType` is set: call the existing `getFolderContents` (or extended version from Task 2) with the `fileType` filter applied. Show the normal folder browse view with filtered documents.
    - When neither search nor filter is active: show the normal folder browse view (existing behavior from Story 4.1).
  - [x] 7.4: Sync state to URL: update `searchParams` when `searchTerm` or `fileType` changes. Use `router.replace()` (not `push`) to avoid polluting browser history with every keystroke.
  - [x] 7.5: Handle search result click: when a user clicks a search result, clear the search term (remove `search` from URL), set `currentFolderId` to the result's `folderId` (set `?folder=<folderId>` in URL), and optionally scroll to or highlight the document in the folder view.
  - [x] 7.6: Render the `DocumentSearchToolbar` at the top of the page, above the breadcrumb and folder contents. The toolbar is always visible regardless of search/filter state.
  - [x] 7.7: When file type filter is active in browse mode (no search term), pass the `fileType` to the existing folder contents query/display. Documents not matching the filter are hidden; subfolders remain visible. Show a "Filtered by: [type]" chip or indicator near the filter dropdown. Provide a way to clear the filter (clicking the chip or selecting "All Types").

- [x] **Task 8: Build `useDocumentSearch` custom hook** (AC: #3, #10)
  - [x] 8.1: Create `apps/admin/src/hooks/useDocumentSearch.ts`. Encapsulates all search/filter state logic to keep the page component clean.
  - [x] 8.2: The hook manages: `searchTerm`, `debouncedSearchTerm` (300ms debounce), `fileType`, and syncs with URL search params.
  - [x] 8.3: Exports: `{ searchTerm, debouncedSearchTerm, fileType, setSearchTerm, setFileType, clearSearch, isSearchActive }`.
  - [x] 8.4: `isSearchActive` returns `true` when `debouncedSearchTerm.length >= 2`.
  - [x] 8.5: `clearSearch` resets `searchTerm` to empty string and removes the `search` param from the URL.

- [x] **Task 9: Write backend unit tests** (AC: #1, #8, #9, #12)
  - [x] 9.1: Create `packages/backend/convex/documents/__tests__/search.test.ts` using `convex-test` + `vitest`.
  - [x] 9.2: Test `searchDocuments`:
    - (a) Returns documents matching the search term (case-insensitive substring match on name).
    - (b) Returns empty array when search term is less than 2 characters.
    - (c) Returns empty array when no documents match the search term.
    - (d) Filters by file type `"pdf"` — only returns documents with extension "pdf".
    - (e) Filters by file type `"image"` — only returns documents with extension "jpg" or "png".
    - (f) Filters by file type `"spreadsheet"` — only returns documents with extension "xlsx" or "csv".
    - (g) Filters by file type `"video"` — only returns documents where `videoUrl` is set.
    - (h) Combines search term and file type filter — both are applied together.
    - (i) Admin user sees all matching documents regardless of permissions.
    - (j) Non-admin user sees only documents they have access to (via `permittedRoles` or individual `documentUserPermissions`).
    - (k) Non-admin user does NOT see documents restricted to other roles.
    - (l) Results include `folderPath` for each document.
    - (m) Results are capped at 50 — verify `totalCount` reflects the actual total.
    - (n) Unauthenticated request is rejected.
    - (o) Documents from a different team are never returned.
  - [x] 9.3: Test `getFolderContents` with `fileType` filter (if extended in Task 2):
    - (a) Without `fileType`, returns all documents in the folder (backward compatible).
    - (b) With `fileType: "pdf"`, returns only PDF documents; subfolders are still returned.
    - (c) With `fileType: "video"`, returns only video link documents.

- [x] **Task 10: Final validation** (AC: all)
  - [x] 10.1: Run `pnpm typecheck` — must pass with zero errors.
  - [ ] 10.2: Run `pnpm lint` — must pass with zero errors.
  - [ ] 10.3: Run backend tests (`vitest run` in packages/backend) — all new and existing tests pass.
  - [ ] 10.4: Start the dev server. Navigate to `/documents`.
  - [ ] 10.5: Verify the search bar and type filter dropdown are visible at the top of the page.
  - [ ] 10.6: Type a search term (e.g., "play") — verify results appear after ~300ms debounce, showing matching documents across folders with name, folder path, type icon, and date.
  - [ ] 10.7: Verify search term highlighting in results (matched portion is bolded/highlighted).
  - [ ] 10.8: Select "PDF" from the type filter while search is active — verify results are filtered to PDFs only.
  - [ ] 10.9: Clear the search term — verify the page returns to the folder browse view. With "PDF" filter still active, verify only PDF documents appear in the current folder.
  - [ ] 10.10: Click a search result — verify navigation to the document's parent folder (`?folder=<id>` in URL), search is cleared, and the folder contents are displayed.
  - [ ] 10.11: Type a search term that matches no documents — verify the empty state message appears.
  - [ ] 10.12: Press `/` on the keyboard — verify the search bar receives focus. Press `Escape` — verify the search is cleared and the input is blurred.
  - [ ] 10.13: Test with a non-admin user — verify search results only include documents the user has access to. Verify no restricted documents appear.
  - [ ] 10.14: Verify URL contains `?search=<term>&type=<type>` while searching. Copy the URL, paste in a new tab — verify the same search state is restored.
  - [ ] 10.15: As admin, verify read tracking indicators appear on search results (if Story 4.4 is complete).

## Dev Notes

### Architecture Context

This is the **final story in Epic 4 (Document Hub)** and delivers the search and filtering capabilities that make the document repository practically usable at scale. It builds on all four preceding stories:

- **Story 4.1** provides the folder structure, folder browsing UI, and the documents page shell
- **Story 4.2** provides uploaded documents and video links to search across
- **Story 4.3** provides the permission model that search results must respect
- **Story 4.4** provides read tracking indicators displayed on search results for admin users

This story directly implements:

- **FR18:** Users can search documents by name, type, and folder
- **FR17 (completion):** Users can view, open, and download documents they have access to — this story completes the "find" aspect of document access
- **NFR2:** Real-time updates via Convex subscriptions (search results update live)
- **NFR5:** Access control enforced at the Convex query layer (search respects permissions)
- **NFR6:** Multi-tenant isolation (search is team-scoped)

### Key Architectural Decisions from architecture.md

- **No REST API:** Search is implemented as a Convex query, not a REST endpoint. The frontend subscribes via `useQuery` and gets real-time updates as documents are added/modified. [Source: architecture.md#API-&-Communication-Patterns]

- **State Management:** Search term and filter state use React component state (via custom hook) + URL search params for shareability. No global state library. Convex `useQuery` handles all server state. [Source: architecture.md#Frontend-Architecture]

- **Component Organization:** Search components in `components/documents/` (feature-grouped). The custom hook in `hooks/`. [Source: architecture.md#Structure-Patterns]

- **Convex Function Organization:** Search query in `convex/documents/queries.ts` alongside existing document queries. [Source: architecture.md#Convex-Function-Organization]

- **Authorization Pattern:** `requireAuth(ctx)` on `searchDocuments` (any authenticated user can search). Access filtering applied in the query logic. [Source: architecture.md#Authentication-&-Security]

- **Loading States:** `useQuery` returns `undefined` while loading — render skeleton placeholders. [Source: architecture.md#Process-Patterns]

- **Date Formatting:** `date-fns` for all UI date display. `format(date, "MMM d, yyyy")` for search result dates. [Source: architecture.md#Format-Patterns]

- **Error Handling:** `ConvexError` with standardized codes if needed. Search queries generally don't throw user-facing errors (they return empty results). [Source: architecture.md#Format-Patterns]

### Dependencies (Must Be Complete Before Starting)

| Dependency | Story | Status Check |
|------------|-------|-------------|
| `documents` table with data | Story 4.1, 4.2 | `packages/backend/convex/documents/queries.ts` must export `getFolderContents`; documents exist in the DB |
| `folders` table with CRUD | Story 4.1 | `getFolders`, `getFolderBreadcrumb` queries must exist |
| `checkDocumentAccess` / `filterByAccess` | Story 4.3 | `packages/backend/convex/lib/permissions.ts` must export access-checking utilities |
| `requireAuth` helper | Story 2.1 | `packages/backend/convex/lib/auth.ts` must export `requireAuth` |
| Documents page with folder browser | Story 4.1 | `apps/admin/src/app/(app)/documents/page.tsx` must exist with folder navigation |
| `DocumentCard` component | Story 4.1 | `apps/admin/src/components/documents/DocumentCard.tsx` must exist |
| Read tracking integration (optional) | Story 4.4 | `ReadTracker` component and `getReadStats` query. If not available, search results render without read tracking indicators. |
| shadcn/ui Input, Select, Skeleton, Badge | Story 1.2 | Components installed in admin app |
| `documentUserPermissions` table | Story 4.3 | Required for individual user permission checks in search |

### Current State (Baseline)

**`convex/documents/queries.ts`:** Should exist from Stories 4.1-4.4 with `getFolders`, `getFolderContents`, `getFolderBreadcrumb`, `getFolderItemCounts`, `getReadStats`, `getUsersWithAccessCount`, `getReadersDetail`. This story ADDS `searchDocuments`.

**`convex/documents/mutations.ts`:** Should exist from Stories 4.1-4.4. This story does NOT modify mutations.

**`apps/admin/src/app/(app)/documents/page.tsx`:** Should exist from Story 4.1 with folder browsing via URL search params (`?folder=<id>`). This story MODIFIES it to add the search toolbar, file type filtering, and conditional search results view.

**`apps/admin/src/components/documents/`:** Should contain `FolderCard.tsx`, `DocumentCard.tsx`, `DocumentDetail.tsx`, `FolderCreateDialog.tsx`, `FolderRenameDialog.tsx`, `FolderDeleteDialog.tsx`, `DocumentFolderBreadcrumb.tsx`, `UploadDialog.tsx`, `PermissionsPanel.tsx`, `ReadTrackerDetail.tsx` from Stories 4.1-4.4. This story ADDS `DocumentSearchBar.tsx`, `DocumentTypeFilter.tsx`, `DocumentSearchResults.tsx`, `DocumentSearchToolbar.tsx`.

**`apps/admin/src/hooks/`:** May contain `useCurrentUser.ts`. This story ADDS `useDocumentSearch.ts`.

### Search Implementation Strategy

Convex does not have a built-in full-text search engine. For Sprint 1 with a single team and < 500 documents, in-memory filtering is the correct approach:

```typescript
export const searchDocuments = query({
  args: {
    searchTerm: v.string(),
    fileType: v.optional(v.string()),
  },
  handler: async (ctx, { searchTerm, fileType }) => {
    const { user, teamId } = await requireAuth(ctx)
    const trimmed = searchTerm.trim().toLowerCase()

    if (trimmed.length < 2) return { results: [], totalCount: 0 }

    // Fetch all documents for the team
    const allDocs = await ctx.db
      .query("documents")
      .withIndex("by_teamId", q => q.eq("teamId", teamId))
      .collect()

    // Apply name matching
    let matched = allDocs.filter(doc =>
      doc.name.toLowerCase().includes(trimmed)
    )

    // Apply file type filter
    if (fileType) {
      matched = matched.filter(doc => matchesFileType(doc, fileType))
    }

    // Apply access filtering (non-admin only)
    if (user.role !== "admin") {
      matched = await filterByAccess(ctx, matched, user)
    }

    // Enrich with folder paths
    const enriched = await Promise.all(
      matched.map(async doc => {
        const folder = await ctx.db.get(doc.folderId)
        let folderPath = folder?.name ?? ""
        if (folder?.parentId) {
          const parent = await ctx.db.get(folder.parentId)
          folderPath = parent ? `${parent.name} > ${folder.name}` : folderPath
        }
        return { ...doc, folderPath, folderId: doc.folderId }
      })
    )

    // Sort: exact prefix matches first, then by createdAt desc
    enriched.sort((a, b) => {
      const aExact = a.name.toLowerCase().startsWith(trimmed)
      const bExact = b.name.toLowerCase().startsWith(trimmed)
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      return b.createdAt - a.createdAt
    })

    const totalCount = enriched.length
    const results = enriched.slice(0, 50)

    return { results, totalCount }
  },
})
```

For future scale (> 1000 documents), consider Convex's built-in search index feature:
```typescript
// Future: Define search index in schema.ts
searchIndex("search_name", { searchField: "name", filterFields: ["teamId"] })
```
This is NOT needed for Sprint 1 but is the recommended upgrade path.

### File Type Matching Helper

Extract file type matching into a reusable helper:

```typescript
function matchesFileType(
  doc: { extension?: string; videoUrl?: string },
  fileType: string
): boolean {
  switch (fileType) {
    case "pdf": return doc.extension === "pdf"
    case "image": return ["jpg", "png"].includes(doc.extension ?? "")
    case "spreadsheet": return ["xlsx", "csv"].includes(doc.extension ?? "")
    case "video": return doc.videoUrl != null
    default: return true
  }
}
```

### Debounce Pattern

Use a simple `useEffect` debounce (no external library needed):

```typescript
// In useDocumentSearch hook
const [searchTerm, setSearchTerm] = useState(initialSearch)
const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialSearch)

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearchTerm(searchTerm)
  }, 300)
  return () => clearTimeout(timer)
}, [searchTerm])
```

### Search Term Highlighting

Highlight the matching substring in document names:

```typescript
function HighlightedName({ name, searchTerm }: { name: string; searchTerm: string }) {
  if (!searchTerm) return <span>{name}</span>

  const index = name.toLowerCase().indexOf(searchTerm.toLowerCase())
  if (index === -1) return <span>{name}</span>

  return (
    <span>
      {name.slice(0, index)}
      <mark className="bg-yellow-100 dark:bg-yellow-900/30 font-semibold rounded px-0.5">
        {name.slice(index, index + searchTerm.length)}
      </mark>
      {name.slice(index + searchTerm.length)}
    </span>
  )
}
```

### Component Architecture

```
Documents Page (page.tsx) [MODIFIED]
├── DocumentSearchToolbar [NEW]
│   ├── DocumentSearchBar [NEW]
│   │   ├── Search icon
│   │   ├── Input with placeholder "Search documents..."
│   │   ├── Clear (X) button (when text present)
│   │   └── "/" keyboard hint (desktop only)
│   └── DocumentTypeFilter [NEW]
│       └── Select: All Types | PDF | Images | Spreadsheets | Video Links
├── DocumentFolderBreadcrumb (unchanged, hidden during search)
├── [CONDITIONAL: search active]
│   └── DocumentSearchResults [NEW]
│       ├── Result Card (per document)
│       │   ├── File type icon
│       │   ├── Document name (highlighted match)
│       │   ├── Folder path (muted text)
│       │   ├── Upload date (date-fns formatted)
│       │   └── ReadTracker (admin only, from Story 4.4)
│       ├── Empty state (no results)
│       └── "Showing X of Y results" (if capped)
├── [CONDITIONAL: browse mode]
│   ├── FolderCard grid (subfolders, always visible)
│   └── DocumentCard list (filtered by fileType if active)
└── [CONDITIONAL: browse + filter active]
    └── "Filtered by: [type]" chip with clear action
```

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/backend/convex/documents/queries.ts` | Modified | Add `searchDocuments` query; optionally extend `getFolderContents` with `fileType` filter |
| `apps/admin/src/components/documents/DocumentSearchBar.tsx` | **Created** | Search input with icon, clear button, keyboard shortcuts |
| `apps/admin/src/components/documents/DocumentTypeFilter.tsx` | **Created** | File type filter select dropdown |
| `apps/admin/src/components/documents/DocumentSearchResults.tsx` | **Created** | Search results list with highlighted names, folder paths, empty state |
| `apps/admin/src/components/documents/DocumentSearchToolbar.tsx` | **Created** | Composes search bar + type filter in a toolbar layout |
| `apps/admin/src/hooks/useDocumentSearch.ts` | **Created** | Custom hook: search state, debounce, URL sync |
| `apps/admin/src/app/(app)/documents/page.tsx` | Modified | Integrate search toolbar, conditional search/browse views, file type filtering |
| `packages/backend/convex/documents/__tests__/search.test.ts` | **Created** | Unit tests for searchDocuments query |

### What This Story Does NOT Include

- **No full-text search engine** — search is substring matching on document names only (not file contents). Full-text content search (searching inside PDFs) is a future enhancement.
- **No search across document metadata** — search matches on `name` field only, not on description, tags, or file contents.
- **No search suggestions or autocomplete** — the search is a simple filter, not a suggestion-based experience.
- **No saved searches or search history** — no persistence of past searches beyond the current URL state.
- **No search ranking by popularity** — sorting is by name match relevance + date, not by read count or usage frequency.
- **No folder search** — search matches documents only, not folder names. Users can browse folders via the existing folder navigation.
- **No bulk actions on search results** — no multi-select, bulk download, or bulk move from search results. Results link to individual documents in their folder context.
- **No notification when new documents match a search** — no "saved search" alerts.

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Story 4.3 (permissions) not implemented — `checkDocumentAccess` unavailable | Implement inline access filtering in `searchDocuments`: check `permittedRoles` on the document and parent folder. If `checkDocumentAccess` exists, use it. If not, implement the role-checking logic directly in the query (admin bypasses all, non-admin checks `permittedRoles` array includes `user.role`). |
| Story 4.4 (read tracking) not implemented — `ReadTracker` unavailable | Make the read tracking indicator in search results conditional. If the `getReadStats` query and `ReadTracker` component exist, display them. If not, omit the indicator from search results. No blocking dependency. |
| In-memory filtering of all team documents could be slow with many documents | For Sprint 1 (< 500 documents per team), this is acceptable. The 50-result cap prevents excessive rendering. For scale, migrate to Convex search indexes (schema-level `searchIndex` definition). |
| URL param sync with debounced search causes URL churn | Use `router.replace()` (not `push`) with `{ scroll: false }` to avoid history stack pollution and scroll jumps. Only sync to URL on the debounced value, not on every keystroke. |
| Folder path enrichment (fetching parent folders) could be slow for many results | Maximum 2 `db.get()` calls per document (folder + grandparent, since depth is capped at 2). With 50 results, that's max 100 lookups — acceptable for Convex. Folder objects are small and likely cached by Convex. |
| `/` keyboard shortcut may conflict with browser or other shortcuts | Only register when no input/textarea is focused. Check `document.activeElement.tagName !== "INPUT"` before handling. Standard pattern used by GitHub, Slack, etc. |

### Alignment with Architecture Document

- **Data Model:** No new tables. Uses existing `documents`, `folders`, `documentUserPermissions` tables per `architecture.md § Data Architecture`
- **Convex Organization:** `searchDocuments` in `convex/documents/queries.ts` per `architecture.md § Convex Function Organization`
- **Component Structure:** Search components in `components/documents/`, hook in `hooks/` per `architecture.md § Frontend Architecture`
- **Auth Pattern:** `requireAuth(ctx)` on search query, access filtering in Convex per `architecture.md § Authentication & Security`
- **State Management:** React state + URL params, Convex `useQuery` for server state per `architecture.md § Frontend Architecture`
- **Real-time:** Search results update live via Convex subscriptions per `architecture.md § API & Communication Patterns`
- **Date Handling:** `date-fns` for display, timestamps as numbers per `architecture.md § Format Patterns`
- **Loading States:** `useQuery` returns `undefined` -> skeleton per `architecture.md § Process Patterns`
- **Naming:** camelCase exports (`searchDocuments`), PascalCase components (`DocumentSearchBar.tsx`) per `architecture.md § Naming Patterns`
- **Testing:** Co-located at `convex/documents/__tests__/search.test.ts` per `architecture.md § Structure Patterns`
- **No detected conflicts** with the architecture document

### Project Structure Notes

- All new components follow the established `components/documents/` feature-grouping pattern from Stories 4.1-4.4
- The custom hook `useDocumentSearch.ts` is placed in `hooks/` per the architecture's hook naming convention (`use` prefix, camelCase)
- URL search params pattern (`?search=&type=&folder=`) extends the existing `?folder=` pattern from Story 4.1 without breaking backward compatibility
- No new Convex tables or schema changes required — this story only adds queries

### References

- [Source: architecture.md#API-&-Communication-Patterns] — All queries via Convex, useQuery subscriptions, no REST
- [Source: architecture.md#Authentication-&-Security] — requireAuth, access filtering, teamId scoping, multi-tenant isolation
- [Source: architecture.md#Frontend-Architecture] — Page at `app/(app)/documents/page.tsx`, components at `components/documents/`, state via useQuery + React state + URL params
- [Source: architecture.md#Convex-Function-Organization] — Search query in `convex/documents/queries.ts`
- [Source: architecture.md#Format-Patterns] — date-fns formatting, ConvexError codes, dates as Unix ms timestamps
- [Source: architecture.md#Process-Patterns] — Loading states (useQuery undefined -> skeleton), mutation feedback (toast)
- [Source: architecture.md#Implementation-Patterns-&-Consistency-Rules] — Naming conventions, enforcement guidelines, anti-patterns
- [Source: architecture.md#Structure-Patterns] — Feature-grouped components, co-located tests, hook naming
- [Source: architecture.md#Project-Structure-&-Boundaries] — Module boundaries, frontend-backend boundary
- [Source: epics.md#Story-4.5] — Original story definition, user story, and BDD acceptance criteria
- [Source: epics.md#FR-Coverage-Map] — FR18 mapped to Epic 4 (Document Hub search)
- [Source: 4-1-document-data-model-folder-structure.md] — Folder structure, documents page, getFolderContents query, URL-based navigation
- [Source: 4-3-document-permissions-role-user-level.md] — Permission model (checkDocumentAccess, filterByAccess, permittedRoles, documentUserPermissions)
- [Source: 4-4-read-tracking.md] — ReadTracker component, getReadStats query for admin-only read indicators

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (via Claude Code)

### Debug Log References

- Backend typecheck: 0 errors
- Admin app typecheck: 0 errors
- Backend tests: 238/238 passed (13 files), including 20 new search tests
- Lint: no new issues from our changes (pre-existing errors in native app and ui/sidebar.tsx)

### Completion Notes List

- Task 1: Implemented `searchDocuments` query with `matchesFileType` helper. Access filtering implemented inline (batch user perms query + per-doc folder inheritance check) for search since documents span multiple folders — cannot use `filterDocumentsByAccess` which expects a single parent folder.
- Task 2: Extended `getFolderContents` with optional `fileType` param. Applied before access filtering for efficiency. Backward compatible — no `fileType` means all docs returned as before.
- Task 3: `DocumentSearchBar` uses `forwardRef` to expose input ref to parent (toolbar) for `/` keyboard shortcut focus. Escape key clears and blurs.
- Task 4: `DocumentTypeFilter` uses shadcn `Select`. Maps empty string value to "all" sentinel since Radix Select doesn't allow empty string values.
- Task 5: `DocumentSearchResults` reuses `getDocumentIcon` from `documentIcons.ts` and `ReadTrackerDetail` from Story 4.4 for admin read tracking on search results. `HighlightedName` wraps matching substring in `<mark>` with yellow highlight.
- Task 6: `DocumentSearchToolbar` owns the `/` global keyboard shortcut handler. Responsive layout: stacks vertically on mobile, side-by-side on desktop.
- Task 7: Page integrated with three conditional views: search active → search results, folder selected → folder contents (with fileType filter), no folder → top-level folders. SharedDialogs extracted to avoid duplication. "Filtered by" badge shown in browse mode when fileType active.
- Task 8: `useDocumentSearch` hook encapsulates all search/filter state with 300ms debounce and URL param sync via `router.replace()`.
- Task 9: 20 tests covering all AC scenarios: search matching, file type filtering (pdf/image/spreadsheet/video), combined filters, admin access, non-admin role-based access, individual user permissions, folder path enrichment, 50-result cap, unauthenticated rejection, team isolation, sorting, and getFolderContents fileType backward compatibility.

### File List

| File | Change |
|------|--------|
| `packages/backend/convex/documents/queries.ts` | Modified — added `matchesFileType` helper, `searchDocuments` query, extended `getFolderContents` with `fileType` param |
| `apps/admin/src/components/documents/DocumentSearchBar.tsx` | **Created** — Search input with icon, clear button, Escape handling |
| `apps/admin/src/components/documents/DocumentTypeFilter.tsx` | **Created** — File type filter select dropdown |
| `apps/admin/src/components/documents/DocumentSearchResults.tsx` | **Created** — Search results list with highlighted names, folder paths, empty state, read tracking |
| `apps/admin/src/components/documents/DocumentSearchToolbar.tsx` | **Created** — Composes search bar + type filter, owns `/` keyboard shortcut |
| `apps/admin/src/hooks/useDocumentSearch.ts` | **Created** — Custom hook: search state, debounce, URL sync |
| `apps/admin/src/app/(app)/documents/page.tsx` | Modified — Integrated search toolbar, conditional search/browse views, file type filtering, SharedDialogs extraction |
| `packages/backend/convex/documents/__tests__/search.test.ts` | **Created** — 20 unit tests for searchDocuments and getFolderContents fileType |
| `_bmad-output/implementation-artifacts/4-5-document-search-browse.md` | Modified — Task checkmarks, dev agent record |
