# Story 11.5: Internationalization (English / Italian)

Status: draft
Story Type: frontend
Points: 8

> **PROJECT SCOPE:** All frontend work targets `apps/web/`. Do NOT modify `apps/admin/`.

## Story

As a user at an Italian football club,
I want the platform interface available in both English and Italian,
So that Italian-speaking staff and players can use the platform in their native language.

## Acceptance Criteria

### AC1: Language dictionaries exist for EN and IT

**Given** the project has a lib/i18n directory
**When** a developer imports a dictionary
**Then** two complete dictionary files exist: `en.ts` and `it.ts`
**And** both have identical keys covering all user-facing strings in the app
**And** dictionaries are typed with a shared TypeScript interface (no missing keys possible)

### AC2: Language selection on Account page

**Given** the user is on the Account page (`/settings`)
**When** the profile form renders
**Then** a language preference dropdown is present with "English" and "Italian" options
**And** the current selection matches the user's `preferredLanguage` from Convex
**When** the user selects a different language and saves
**Then** the preference is persisted to the user's Convex record
**And** the UI immediately switches to the selected language

### AC3: All existing UI text uses dictionaries

**Given** the user's language preference is set
**When** any page renders
**Then** all user-facing text comes from the active dictionary, not hardcoded strings
**This covers:**
- Sidebar navigation labels (Dashboards, Players, Calendar, Documents, Team)
- Page titles and subtitles
- Button labels (Save, Cancel, Create, Delete, etc.)
- Form labels and placeholders
- Empty states and error messages
- Account page (profile section, access section)
- Dashboard gallery (search placeholder, category labels, empty states)
- Common words (Yes, No, Loading, Error, etc.)

**Does NOT cover (deferred):**
- Dashboard component internals (Season Overview, Post-Match, etc.) — these use dynamic data labels from StatsBomb
- Toast messages from Convex mutations (keep in English)
- Admin-only configuration screens (keep in English for now)

### AC4: useTranslation hook provides typed access

**Given** a component needs translated text
**When** it calls `useTranslation()` (or `useDictionary()`)
**Then** it returns the active dictionary object with full TypeScript autocompletion
**And** the hook reads the user's language preference reactively (Convex subscription)
**And** if no preference is set, it defaults to English

### AC5: User's preferred language persists in Convex

**Given** the users table in Convex
**When** the schema is checked
**Then** a `preferredLanguage` field exists (optional string, default "en")
**And** the `updateProfile` mutation accepts `preferredLanguage` as an optional field
**And** the `currentUserProfile` query returns the `preferredLanguage` value

## Implementation Notes

### Architecture (based on source platform pattern)
The source platform at `football-dashboard-2/src/lib/i18n/` uses a dictionary approach:
- `dictionaries/en.ts` and `dictionaries/it.ts` with nested object structure
- `getDictionary(locale)` function returns the correct dictionary
- Dictionary passed as props or used via context

For our implementation:
1. Create `apps/web/src/lib/i18n/dictionaries/en.ts` and `it.ts`
2. Create a shared type `Dictionary` derived from the EN dictionary structure
3. Create `apps/web/src/lib/i18n/index.ts` with `getDictionary(locale)` helper
4. Create `apps/web/src/hooks/useTranslation.ts` that reads `preferredLanguage` from the Convex `currentUser` and returns the dictionary
5. Replace hardcoded strings in components with `t.section.key` pattern

### Dictionary structure (nested by section)
```typescript
{
  common: { save, cancel, delete, yes, no, loading, error, ... },
  nav: { dashboards, players, calendar, documents, team, account, getHelp, logOut, ... },
  account: { title, profile, profileDescription, fullName, avatar, avatarDrop, access, team, roles, admin, ... },
  dashboards: { title, searchPlaceholder, allCategories, noDashboards, noResults, pinned, ... },
  players: { title, addPlayer, status, active, onLoan, leftClub, ... },
  calendar: { title, createEvent, ... },
  documents: { title, upload, ... },
}
```

### Scope boundaries
- Replace strings in: sidebar, page titles, Account page, dashboard gallery, player list headers, calendar headers, document headers, common UI elements
- Do NOT touch: dashboard chart labels (data-driven), Convex error messages, admin config screens
- The Italian translations should be professional — use the source platform's `it.ts` as reference where available

### Files to modify
- `packages/backend/convex/table/users.ts` or schema — add `preferredLanguage` field
- `packages/backend/convex/users/mutations.ts` — accept `preferredLanguage` in updateProfile
- `packages/backend/convex/users/queries.ts` — return `preferredLanguage` in currentUserProfile
- `apps/web/src/components/app/settings/profile-form.tsx` — add language selector
- `apps/web/src/components/app-sidebar.tsx` — use dictionary for nav labels
- `apps/web/src/components/nav-user.tsx` — use dictionary for menu items
- `apps/web/src/app/(app)/settings/page.tsx` — use dictionary
- `apps/web/src/app/(app)/dashboards/page.tsx` — use dictionary
- Various other page/component files for titles and labels

### Source reference
- `football-dashboard-2/src/lib/i18n/dictionaries/` — their EN and IT dictionaries
- `football-dashboard-2/src/lib/i18n/shared.ts` — locale types
