# Story 11.1: Global Search Across All Entities

Status: draft
Story Type: fullstack
Points: 8

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` -- that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

> **IMPORTANT: Before creating ANY custom component, check if a shadcn/ui component exists that can be used or extended. Use `npx shadcn@latest add <component>` to install missing shadcn components. Only create custom components when no suitable shadcn component exists.**

## Story

As an authenticated user,
I want to press Cmd+K (Mac) or Ctrl+K (Windows) to open a global search palette that searches across dashboards, documents, players, calendar events, and contracts,
so that I can quickly find and navigate to any entity in the platform without manually browsing each section.

## Epic Context

**Epic 11 -- Cross-Cutting Features:** Platform-wide capabilities that span multiple modules. This story is the global search feature -- a command palette that unifies navigation across all entity types.

**Dependencies:**
- **Epics 2-6** (existing data) -- players, documents, calendar events, contracts tables must exist. These are all complete.
- **Story 9.1** (Dashboard Gallery & Role Access Control) -- provides the `dashboards` and `roleDashboards` Convex tables. The search must include dashboards.

**Source files (reference implementation in `football-dashboard-2`):**
- `src/components/topbar-search.tsx` -- cmdk-based command palette searching dashboards, documents, contracts

**Architecture difference:** We use Convex instead of Supabase. We search MORE entity types than the reference implementation (adding players and calendar events). Results are real-time via Convex subscriptions. Role-based filtering respects existing permission models per entity.

---

## Searchable Entities

| Entity | Table | Search Fields | Subtitle Display | Icon | Navigation Target |
|---|---|---|---|---|---|
| Dashboards | `dashboards` | `title`, `description` | Category | `LayoutDashboard` | `/dashboards/{slug}` |
| Documents | `documents` | `name` | Folder path | `FileText` | `/documents?fileId={_id}` |
| Players | `players` | `firstName`, `lastName`, `position`, `squadNumber` | Position + Squad # | `Users` | `/players/{_id}` |
| Calendar Events | `calendarEvents` | `name`, `eventType` | Event type + date | `Calendar` | `/calendar?eventId={_id}` |
| Contracts | `contracts` | Player name (resolved via `playerId` join) | Player name + status | `FileSignature` | `/players/{playerId}?tab=contracts` |

---

## Acceptance Criteria (BDD)

### AC-1: Keyboard Shortcut Opens Command Palette

**Given** the user is authenticated and on any page within the app
**When** the user presses Cmd+K (Mac) or Ctrl+K (Windows)
**Then** a modal command palette overlay opens centered on screen
**And** the search input is automatically focused
**And** the overlay has a semi-transparent backdrop
**When** the user presses Escape or clicks outside the palette
**Then** the palette closes and focus returns to the previous element
**And** the keyboard shortcut works regardless of which page the user is on (it is registered globally)
**And** the shortcut does NOT fire when the user is typing in another input, textarea, or contenteditable element

### AC-2: Search Button in Site Header

**Given** the user is authenticated and viewing any page
**When** the user looks at the site header (right side, next to the notification bell)
**Then** a search button is visible with a search icon and the text "Search..." along with a keyboard shortcut hint badge showing "Cmd+K" (Mac) or "Ctrl+K" (Windows)
**When** the user clicks this button
**Then** the command palette opens (same as pressing the keyboard shortcut)
**And** the button is added to `apps/web/src/components/site-header.tsx` in the right-side actions area, before the `NotificationCenterSafe` component

### AC-3: Convex Query -- globalSearch

**Given** the Convex backend has a `globalSearch` query defined
**When** the query is called with `{ searchTerm: string }` (minimum 2 characters)
**Then** the query:
  1. Authenticates the caller via `getAuthUserId` and retrieves the user's `teamId` and `role`
  2. If `searchTerm` is empty or less than 2 characters, returns an empty result set
  3. Searches the following tables in parallel within the user's `teamId`, applying case-insensitive partial matching on the specified fields:
     - **dashboards**: matches `title` or `description` -- only returns dashboards the user's role has access to (via `roleDashboards` join)
     - **documents**: matches `name` -- only returns documents the user has permission to see (respects `permittedRoles` on the document and its folder)
     - **players**: matches `firstName`, `lastName` (also matches combined "firstName lastName"), `position`, or `squadNumber` (converted to string)
     - **calendarEvents**: matches `name` or `eventType` -- excludes cancelled events (`isCancelled === true`)
     - **contracts**: resolves `playerId` to the player record and matches on the player's `firstName` or `lastName` -- only visible to users with role `admin` (contracts are admin-only per Story 6.2)
  4. Returns results grouped by entity type, each result containing:
     - `id`: the document `_id`
     - `type`: `"dashboard" | "document" | "player" | "calendarEvent" | "contract"`
     - `title`: display name (e.g., dashboard title, document name, player full name)
     - `subtitle`: contextual info (e.g., category, folder path, position, event type)
     - `href`: navigation URL
     - `icon`: icon key string for the frontend to resolve
  5. Each category returns a maximum of 10 results, sorted by relevance (exact prefix match first, then partial match, then alphabetical)

**And** the query file is located at `packages/backend/convex/search/queries.ts`
**And** the query uses `ctx.db.query("tableName").withIndex("by_teamId", ...)` for tenant-scoped reads

### AC-4: Role-Based Result Filtering

**Given** a user with role R triggers a global search
**When** results are returned
**Then** the following role-based rules are enforced server-side in the Convex query:

| Entity | Visibility Rule |
|---|---|
| Dashboards | Only dashboards assigned to role R in `roleDashboards` table |
| Documents | Only documents where `permittedRoles` is undefined/empty (visible to all) OR includes role R; also respects folder-level `permittedRoles` |
| Players | Visible to all authenticated users (all roles can see player list) |
| Calendar Events | Only events where `invitedRoles` is undefined/empty (visible to all) OR includes role R |
| Contracts | Only visible to role `admin` (all other roles see zero contract results) |

**And** a user with role `player` searching "contract" sees zero contract results
**And** a user with role `admin` searching the same term sees matching contracts

### AC-5: Command Palette UI -- Layout and Grouping

**Given** the command palette is open and the user has typed a search term (2+ characters)
**When** results are returned from the Convex query
**Then** results are displayed grouped by entity type with section headers:
  - "Dashboards" with `LayoutDashboard` icon
  - "Documents" with `FileText` icon
  - "Players" with `Users` icon
  - "Calendar Events" with `Calendar` icon
  - "Contracts" with `FileSignature` icon
**And** each section header shows the count of results in that group (e.g., "Players (3)")
**And** sections with zero results are hidden (not rendered at all)
**And** each result row displays:
  - An entity-type icon on the left
  - The title (bolded match highlight is optional, not required)
  - A subtitle in muted text below or to the right of the title
**And** the palette uses the existing shadcn `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, and `CommandItem` components from `apps/web/src/components/ui/command.tsx`

### AC-6: Command Palette UI -- Navigation on Selection

**Given** the command palette is open with search results displayed
**When** the user clicks a result row or highlights it with arrow keys and presses Enter
**Then** the application navigates to the result's `href` URL using Next.js `useRouter().push()`
**And** the command palette closes immediately after navigation
**And** the navigation targets are:
  - Dashboards: `/dashboards/{slug}`
  - Documents: `/documents?fileId={_id}`
  - Players: `/players/{_id}`
  - Calendar Events: `/calendar?eventId={_id}`
  - Contracts: `/players/{playerId}?tab=contracts`

### AC-7: Command Palette UI -- Empty and Loading States

**Given** the command palette is open
**When** the search term is empty or less than 2 characters
**Then** the palette displays a prompt message: "Type at least 2 characters to search..."
**When** the search term is 2+ characters and the Convex query is loading
**Then** a loading spinner or skeleton is displayed inside the command list area
**When** the search term is 2+ characters and the query returns zero results across all entity types
**Then** the palette displays: "No results found for \"{searchTerm}\""
**And** the empty state message is rendered using the shadcn `CommandEmpty` component

### AC-8: Search Input Behavior

**Given** the command palette is open
**When** the user types in the search input
**Then** the search is debounced by 200ms to avoid excessive Convex query calls
**And** the search is case-insensitive (searching "john" matches "John", "JOHN", "Johnson")
**And** partial matches are supported (searching "sea" matches "Season Overview")
**And** the search input has placeholder text: "Search dashboards, documents, players..."
**And** a clear button (X icon) appears when the input has text, clicking it clears the input and resets results

### AC-9: Real-Time Result Updates

**Given** the command palette is open with results displayed
**When** underlying data changes in Convex (e.g., a new player is added, a document is renamed, an event is cancelled)
**Then** the search results update automatically without the user re-typing the query
**And** this works because the `globalSearch` query is a Convex reactive query (subscribed via `useQuery`)
**And** if a result's entity is deleted while the palette is open, it disappears from the list in real-time

### AC-10: Accessibility

**Given** the command palette is open
**When** the user interacts with it using only the keyboard
**Then** the following keyboard interactions work:
  - Arrow Up / Arrow Down: navigate between result items
  - Enter: select the highlighted item and navigate
  - Escape: close the palette
  - Tab: does NOT move focus outside the palette (focus is trapped)
**And** the palette has `role="dialog"` and `aria-label="Global search"`
**And** each result item is focusable and has an accessible name (the result title)
**And** the search input has `aria-label="Search all entities"`
**And** these accessibility features are provided by the underlying cmdk library and shadcn CommandDialog -- no custom ARIA work is needed beyond using the components correctly

---

## Implementation Notes

### File Locations

| Artifact | Path |
|---|---|
| Convex Search Query | `packages/backend/convex/search/queries.ts` |
| Global Search Component | `apps/web/src/components/global-search.tsx` |
| Site Header (modify) | `apps/web/src/components/site-header.tsx` |
| Existing Command UI | `apps/web/src/components/ui/command.tsx` (already exists, do NOT modify) |

### Convex Query Design

The `globalSearch` query fetches from multiple tables within a single query function. Since Convex queries are deterministic and reactive, all table reads within the query are automatically subscribed to.

```typescript
// packages/backend/convex/search/queries.ts
import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const globalSearch = query({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user?.teamId || !user?.role) return { results: [] };

    const term = args.searchTerm.trim().toLowerCase();
    if (term.length < 2) return { results: [] };

    const teamId = user.teamId;
    const role = user.role;

    // Fetch all entities for the team, then filter client-side
    // (Convex does not support LIKE/ILIKE -- filter in the query handler)

    // 1. Dashboards (role-filtered via roleDashboards join)
    // 2. Documents (role-filtered via permittedRoles)
    // 3. Players (visible to all)
    // 4. Calendar Events (role-filtered via invitedRoles, exclude cancelled)
    // 5. Contracts (admin-only, join to players for name search)

    // ... implementation per AC-3 and AC-4 ...

    return {
      dashboards: [...],   // max 10
      documents: [...],    // max 10
      players: [...],      // max 10
      calendarEvents: [...], // max 10
      contracts: [...],    // max 10
    };
  },
});
```

**Performance note:** Since Convex does not support full-text search with LIKE queries, the query must load all records for the team and filter in the handler. For teams with large datasets (thousands of records per table), consider:
- Limiting the initial fetch with `.take(500)` per table to cap memory usage
- Short-circuiting: if 10 matches are found for a category, stop scanning that category
- The 200ms debounce on the frontend prevents excessive re-queries while typing

### Site Header Modification

Add a search trigger button to the right-side actions in `apps/web/src/components/site-header.tsx`:

```tsx
{/* Right-side actions */}
<div className="ml-auto flex items-center gap-2">
  <GlobalSearchTrigger />
  <NotificationCenterSafe />
</div>
```

The `GlobalSearchTrigger` is a button that renders the search icon + shortcut hint and opens the palette on click. It also registers the global Cmd+K / Ctrl+K listener.

### Global Search Component Structure

```tsx
// apps/web/src/components/global-search.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"

// Exports:
// - <GlobalSearchTrigger /> -- button for the site header
// - <GlobalSearchDialog /> -- the command palette (rendered once at layout level or inside the trigger)
```

### Keyboard Shortcut Registration

The global keyboard listener must:
1. Listen for `keydown` events on `document`
2. Check for `(e.metaKey || e.ctrlKey) && e.key === "k"`
3. Prevent default browser behavior (Cmd+K in Chrome opens the address bar)
4. Check that the active element is NOT an `input`, `textarea`, or `[contenteditable]` -- OR, alternatively, always open the palette regardless (cmdk convention is to always open, even from inputs). Choose the cmdk convention: always open.
5. Toggle the palette open/closed state

### Debounce Strategy

Use a local `debouncedSearchTerm` state that lags behind the raw input by 200ms. Pass the debounced value to `useQuery`:

```tsx
const [searchTerm, setSearchTerm] = useState("")
const [debouncedTerm, setDebouncedTerm] = useState("")

useEffect(() => {
  const timer = setTimeout(() => setDebouncedTerm(searchTerm), 200)
  return () => clearTimeout(timer)
}, [searchTerm])

const results = useQuery(
  api.search.queries.globalSearch,
  debouncedTerm.length >= 2 ? { searchTerm: debouncedTerm } : "skip"
)
```

### Convex Patterns to Follow

- Follow the existing query pattern in `packages/backend/convex/contracts/queries.ts` for authentication and tenant scoping.
- Use `getAuthUserId` from `@convex-dev/auth/server` for authentication.
- Look up the user's `teamId` and `role` from their user record -- never trust client-provided values.
- Use `ctx.db.query("tableName").withIndex("by_teamId", q => q.eq("teamId", teamId))` for all reads.
- For the contracts -> players join, use `ctx.db.get(contract.playerId)` to resolve the player name.
- For the documents -> folders join, use `ctx.db.get(document.folderId)` to resolve the folder name for the subtitle.

### Matching Logic

```typescript
function matches(value: string | undefined | null, term: string): boolean {
  if (!value) return false;
  return value.toLowerCase().includes(term);
}

function matchesAny(values: (string | undefined | null)[], term: string): boolean {
  return values.some(v => matches(v, term));
}
```

### Icon Mapping (Frontend)

Use Lucide React icons (already installed in the project):

```typescript
import {
  LayoutDashboard,
  FileText,
  Users,
  Calendar,
  FileSignature,
} from "lucide-react"

const ENTITY_ICONS = {
  dashboard: LayoutDashboard,
  document: FileText,
  player: Users,
  calendarEvent: Calendar,
  contract: FileSignature,
} as const;
```

### Testing Considerations

- Convex `globalSearch` query must be tested to verify:
  - Returns empty results for search terms under 2 characters
  - Matches across all specified fields per entity type
  - Respects role-based filtering (admin sees contracts, player does not)
  - Respects document/folder `permittedRoles`
  - Excludes cancelled calendar events
  - Caps results at 10 per category
  - Requires authentication (unauthenticated call throws)
- Frontend component must be tested to verify:
  - Cmd+K / Ctrl+K opens the palette
  - Escape closes the palette
  - Clicking a result navigates to the correct URL
  - Debounce prevents rapid re-queries
  - Empty and loading states render correctly
- Accessibility: verify focus trapping and keyboard navigation work as expected via the cmdk defaults

---

## Dependencies

- **Story 9.1** (Dashboard Gallery & Role Access Control) -- provides the `dashboards` and `roleDashboards` Convex tables. Must be complete before dashboards can appear in search results. If Story 9.1 is not yet deployed, the search query should gracefully skip dashboards (check if table exists or wrap in try/catch).
- **Epics 2-6** -- players, documents, calendar events, contracts tables already exist in the schema.
- **shadcn/ui Command component** -- already installed at `apps/web/src/components/ui/command.tsx` (uses cmdk under the hood).

## Definition of Done

1. Pressing Cmd+K (Mac) / Ctrl+K (Windows) opens the global search command palette from any page.
2. A search button with shortcut hint is visible in the site header, clicking it opens the palette.
3. The Convex `globalSearch` query searches across dashboards, documents, players, calendar events, and contracts within the user's team.
4. Search is case-insensitive and supports partial matching on the fields specified in the entity table above.
5. Results are grouped by entity type with section headers, icons, and result counts.
6. Role-based filtering is enforced server-side: dashboards respect `roleDashboards`, documents respect `permittedRoles`, contracts are admin-only, calendar events respect `invitedRoles`.
7. Each category returns a maximum of 10 results.
8. Clicking or pressing Enter on a result navigates to the correct entity page and closes the palette.
9. Empty state ("No results found"), loading state (spinner), and minimum-character prompt are displayed appropriately.
10. Search input is debounced by 200ms.
11. Results update in real-time via Convex subscriptions when underlying data changes.
12. Escape or clicking outside closes the palette.
13. Keyboard navigation (arrow keys, Enter, Escape) works correctly via cmdk defaults.
14. All TypeScript types are explicit -- no `any` casts.
15. `pnpm typecheck` and `pnpm lint` pass with zero new errors.
