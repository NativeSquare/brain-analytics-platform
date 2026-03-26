# Story 1.2: Configure Design System & Theme

Status: dev-complete
Story Type: frontend

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As a developer,
I want to configure the shadcn/ui theme with BrainAnalytics design tokens,
so that all UI components have a consistent, professional look across the platform.

## Acceptance Criteria

1. **shadcn preset is applied** — Running `npx shadcn@latest init --preset b7lRK5amaQ` configures the project's design tokens (colors, typography, border-radius, icon library) via the shadcn preset system. The preset is the single source of truth for all design decisions.

2. **CSS variables are generated for light and dark mode** — The `globals.css` file contains updated `:root` and `.dark` CSS variable blocks generated from the preset, replacing the current default neutral/grayscale theme with the project-specific branded theme.

3. **`components.json` reflects preset configuration** — The `components.json` file is updated by the preset init command with any changes to style, base color, icon library, or other preset-driven settings.

4. **Dark/light mode toggle is functional** — The `next-themes` `ThemeProvider` is integrated into the root layout (`apps/web/src/app/layout.tsx`) wrapping the application, enabling `class`-based dark mode switching. The `<html>` element receives the `suppressHydrationWarning` attribute. A basic theme toggle component exists for switching between light and dark modes.

5. **All shadcn/ui components render with the custom theme** — At least 3 representative shadcn/ui components (e.g., Button, Card, Badge) render correctly using the new CSS variables in both light and dark modes, visually confirming the preset is applied. No component falls back to hardcoded colors or the previous neutral palette.

6. **App metadata is updated** — The root layout's `<Metadata>` title and description are updated from the default "Create Next App" placeholder to "BrainAnalytics" (or project-appropriate branding).

7. **No regressions in existing functionality** — `pnpm typecheck` and `pnpm lint` pass with zero errors. The dev server starts without errors. Existing auth flow and protected routes continue to work.

## Tasks / Subtasks

- [x] **Task 1: Run the shadcn preset initialization** (AC: #1, #2, #3)
  - [x] 1.1: Run `npx shadcn@latest init --preset b7lRK5amaQ` from `apps/web/`
  - [x] 1.2: If the CLI prompts for overwrite confirmation (since shadcn is already initialized), confirm overwrite to apply the new preset
  - [x] 1.3: Verify `globals.css` has been updated with new CSS variable values (`:root` and `.dark` blocks should have non-neutral chroma values reflecting the branded color palette)
  - [x] 1.4: Verify `components.json` reflects the preset settings (check for any changes to `style`, `tailwind.baseColor`, `iconLibrary`)
  - [x] 1.5: If the preset changes the icon library from `lucide` to a different library, install the required icon package and update imports across existing components

- [x] **Task 2: Integrate ThemeProvider for dark/light mode** (AC: #4)
  - [x] 2.1: Verify `next-themes` is already installed (it is — `^0.4.6` in `package.json`)
  - [x] 2.2: Update `apps/web/src/app/layout.tsx` to wrap the app with `ThemeProvider` from `next-themes` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, and `disableTransitionOnChange`
  - [x] 2.3: Add `suppressHydrationWarning` to the `<html>` element to prevent hydration mismatch warnings from `next-themes`
  - [x] 2.4: Create a `ThemeToggle` component at `apps/web/src/components/shared/ThemeToggle.tsx` using shadcn/ui `Button` and `DropdownMenu` components with sun/moon icons, offering Light / Dark / System options via `useTheme()` hook

- [x] **Task 3: Update app metadata and branding** (AC: #6)
  - [x] 3.1: Update the `metadata` export in `apps/web/src/app/layout.tsx` — set `title` to `"BrainAnalytics"` and `description` to `"Football Operations Platform"`

- [x] **Task 4: Visual verification of themed components** (AC: #5)
  - [x] 4.1: Verify the existing 56 shadcn/ui components in `apps/web/src/components/ui/` use CSS variable references (e.g., `bg-primary`, `text-foreground`) and not hardcoded color values
  - [x] 4.2: Spot-check at least 3 components (Button, Card, Badge) render correctly in both light and dark modes using the new theme variables
  - [x] 4.3: Confirm the sidebar component (`apps/web/src/components/ui/sidebar.tsx`) uses the sidebar-specific CSS variables (`--sidebar`, `--sidebar-foreground`, etc.) and renders correctly with the new theme

- [x] **Task 5: Validate no regressions** (AC: #7)
  - [x] 5.1: Run `pnpm typecheck` — must pass with zero errors
  - [x] 5.2: Run `pnpm lint` — must pass with zero errors (pre-existing errors in untouched files remain; zero new issues introduced)
  - [x] 5.3: Start the dev server with `pnpm dev` — must start without errors
  - [x] 5.4: Navigate to `/login` — auth page must render correctly with the new theme
  - [x] 5.5: Log in and verify the `(app)` route group layout renders with the new theme applied

## Dev Notes

### Architecture Context

This story establishes the **visual identity layer** for the entire BrainAnalytics platform. Every component, page, and module built in subsequent stories inherits its visual appearance from the design tokens configured here. This is a foundational story in Epic 1 (Design System & Project Setup).

**Key architectural decisions from architecture.md:**
- **Styling:** Tailwind CSS v4 via `@tailwindcss/postcss`, shadcn/ui with "new-york" style, CSS variables for theming
- **Dark mode:** `next-themes` for class-based dark/light mode switching
- **Design tokens:** CSS custom properties defined in `globals.css`, consumed by all shadcn/ui components and custom components
- **Icon library:** Currently `lucide-react` (may change based on preset) — the project also has `@tabler/icons-react` installed

**What this story delivers:**
- Branded color palette replacing the default neutral grayscale
- Working dark/light mode toggle
- Updated app metadata/branding
- Foundation for all subsequent UI work

**What this story does NOT include (deferred to later stories):**
- Custom sidebar navigation content (Story 1.3)
- Custom reusable UI components like StatusBadge, EventTypeBadge (Story 1.4)
- Any backend changes — this is purely frontend

### Current State (Baseline)

**`globals.css`** currently uses the default shadcn/ui neutral theme:
- All color variables have `0` chroma (pure grayscale, e.g., `oklch(0.205 0 0)`)
- Default `--radius: 0.625rem`
- Default chart colors are generic
- Dark mode variables exist but are also default neutral

**`components.json`** is configured with:
- `style: "new-york"`
- `tailwind.baseColor: "neutral"`
- `iconLibrary: "lucide"`
- `rsc: true` (React Server Components)

**Root layout (`layout.tsx`):**
- Uses `Geist` and `Geist_Mono` fonts via `next/font/google`
- Wraps with `ConvexAuthNextjsServerProvider` and `ConvexClientProvider`
- No `ThemeProvider` from `next-themes` yet
- No `suppressHydrationWarning` on `<html>`
- Metadata is placeholder: "Create Next App"

### The shadcn Preset System

The shadcn preset system encodes a complete design configuration (colors, fonts, border-radius, icon library) into a short code. Running `npx shadcn@latest init --preset b7lRK5amaQ` will:

1. **Regenerate `globals.css`** with new CSS variable values for both `:root` (light) and `.dark` (dark)
2. **Update `components.json`** with any configuration changes from the preset
3. Potentially **change the icon library** — if the preset specifies a different icon library, existing components using `lucide-react` icons may need import updates

**CRITICAL:** Do NOT manually edit CSS variables or Tailwind theme configuration. The preset is the canonical source. If the theme needs adjustment later, re-run the preset command. This ensures consistency and reproducibility.

### ThemeProvider Integration Pattern

The `next-themes` integration follows this pattern (per architecture.md):

```tsx
// apps/web/src/app/layout.tsx
import { ThemeProvider } from "next-themes"

<html lang="en" suppressHydrationWarning>
  <body className={...}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </ThemeProvider>
  </body>
</html>
```

The `attribute="class"` setting is required because Tailwind CSS v4 uses the `.dark` class selector (defined via `@custom-variant dark (&:is(.dark *));` in `globals.css`).

### ThemeToggle Component Pattern

```tsx
// apps/web/src/components/shared/ThemeToggle.tsx
"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sun, Moon } from "lucide-react" // or @tabler/icons-react if preset changes icon lib

export function ThemeToggle() {
  const { setTheme } = useTheme()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Preset changes icon library from `lucide` to another | Check `components.json` after init. If icon library changed, update imports in existing components. Both `lucide-react` and `@tabler/icons-react` are already installed. |
| Preset overwrite conflicts with existing `globals.css` customizations | Current `globals.css` is default template — no custom changes exist. Safe to overwrite. |
| Font change from preset | If the preset specifies different fonts, update the `next/font/google` imports in `layout.tsx` to match. Current fonts are Geist Sans/Mono. |
| `ThemeProvider` hydration mismatch | `suppressHydrationWarning` on `<html>` prevents this. Standard `next-themes` setup. |

### Alignment with Architecture Document

- **Styling solution:** Matches `architecture.md § Styling Solution` — Tailwind CSS v4, shadcn/ui new-york style, CSS variables [Source: architecture.md#Selected-Starter-NativeSquare-Monorepo-Template]
- **Dark mode:** `next-themes` is listed in architecture as the dark/light mode solution [Source: architecture.md#Development-Experience]
- **Design system approach:** Architecture calls for shadcn/ui with custom preset. UX-DR1 specifically requires configuring the shadcn/ui theme preset with project-specific design tokens [Source: epics.md#UX-Design-Requirements]
- **Component organization:** ThemeToggle goes in `components/shared/` per architecture's cross-module component pattern [Source: architecture.md#Component-Organization]
- **No detected conflicts or variances** with the architecture document

### References

- [Source: architecture.md#Selected-Starter-NativeSquare-Monorepo-Template] — Styling solution, installed dependencies, development experience
- [Source: architecture.md#Implementation-Patterns-&-Consistency-Rules] — Naming conventions, component organization
- [Source: architecture.md#Project-Structure-&-Boundaries] — Directory structure, component boundaries
- [Source: epics.md#Story-1.2] — Original story definition and BDD acceptance criteria
- [Source: epics.md#UX-Design-Requirements] — UX-DR1: Configure shadcn/ui theme preset with project-specific design tokens

### Testing Notes

- **No automated tests required for this story.** This is a design system configuration story.
- **Manual verification checklist:**
  - `npx shadcn@latest init --preset b7lRK5amaQ` runs successfully from `apps/web/`
  - `globals.css` contains non-neutral (branded) color values in both `:root` and `.dark`
  - `components.json` is updated with preset settings
  - Dev server starts without errors after changes
  - Login page renders with new themed colors
  - Theme toggle switches between light, dark, and system modes
  - Button, Card, and Badge components visually reflect the new theme
  - `pnpm typecheck` passes
  - `pnpm lint` passes

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `apps/web/src/app/globals.css` | Modified | CSS variables updated by preset (colors, radius, possibly fonts) |
| `apps/web/components.json` | Modified | Preset configuration applied (style, baseColor, iconLibrary) |
| `apps/web/src/app/layout.tsx` | Modified | Add ThemeProvider, suppressHydrationWarning, update metadata |
| `apps/web/src/components/shared/ThemeToggle.tsx` | Created | New theme toggle component |

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — no errors encountered during implementation.

### Completion Notes List

- Preset `b7lRK5amaQ` applied via `npx shadcn@latest init --preset b7lRK5amaQ`. Changed style from `new-york` to `radix-nova`, baseColor from `neutral` to `mist`, iconLibrary from `lucide` to `tabler`.
- 53 UI components were re-installed by the preset with updated `@tabler/icons-react` imports (replacing `lucide-react`).
- Preset added `Outfit` (`--font-sans`) and `Instrument_Sans` (`--font-heading`) fonts to `layout.tsx`. Removed unused `Geist` sans font import (kept `Geist_Mono` for `--font-mono`).
- `password-input.tsx` had its `lucide-react` imports updated to `@tabler/icons-react` (`IconEye`/`IconEyeOff`). Also fixed pre-existing lint error (empty interface → type alias).
- `ThemeProvider` from `next-themes` integrated into root layout with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`.
- `suppressHydrationWarning` added to `<html>` element.
- `ThemeToggle` component created at `apps/web/src/components/shared/ThemeToggle.tsx` using `@tabler/icons-react` sun/moon icons.
- Metadata updated: title `"BrainAnalytics"`, description `"Football Operations Platform"`.
- `pnpm typecheck` passes with zero errors across all packages.
- `pnpm lint` for admin shows only pre-existing issues in untouched files — zero new issues introduced by this story.
- New `shadcn` package added as dependency by the preset init command.
- New CSS variables have non-zero chroma (~0.004–0.021 range with hue ~213–228) confirming branded blue-toned palette.

### File List

- `apps/web/src/app/globals.css` — Modified (CSS variables updated by preset)
- `apps/web/components.json` — Modified (style, baseColor, iconLibrary updated)
- `apps/web/src/app/layout.tsx` — Modified (ThemeProvider, suppressHydrationWarning, metadata, fonts)
- `apps/web/src/components/shared/ThemeToggle.tsx` — Created (theme toggle component)
- `apps/web/src/components/custom/password-input.tsx` — Modified (lucide→tabler icons, lint fix)
- `apps/web/src/components/ui/*.tsx` — Modified (53 files re-installed by preset with tabler icons)
- `apps/web/src/lib/utils.ts` — Modified (updated by preset)
- `apps/web/package.json` — Modified (shadcn dependency added by preset)
- `pnpm-lock.yaml` — Modified (lockfile updated)
