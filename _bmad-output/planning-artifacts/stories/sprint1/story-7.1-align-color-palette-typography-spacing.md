# Story 7.1: Align Color Palette, Typography & Spacing

Status: done
Story Type: frontend
Points: 3

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As a developer,
I want to align our CSS design tokens (colors, typography, border-radius, chart palette) with the existing BrainAnalytics platform (football-dashboard-2),
so that users experience a consistent Sampdoria-branded visual identity across both platforms.

## Acceptance Criteria

### AC 1: Primary color palette matches the existing platform

**Given** the app is loaded in light mode
**When** the developer inspects the computed CSS variables
**Then** `--primary` equals `oklch(0.44 0.115 244.61)` (Sampdoria deep blue, approx. #1b5497)
**And** `--primary-foreground` equals `oklch(0.98 0.01 244.61)`
**And** `--secondary` equals `oklch(0.96 0.02 244.61)`
**And** `--accent` equals `oklch(0.95 0.05 178.47)` (cyan/teal accent)
**And** `--destructive` equals `oklch(0.577 0.245 27.325)`
**And** `--background` equals `oklch(1 0 0)` (pure white)

### AC 2: Dark mode palette matches the existing platform

**Given** the app is loaded in dark mode (class `dark` on `<html>`)
**When** the developer inspects the computed CSS variables
**Then** `--primary` equals `oklch(0.77 0.12 229.3)` (lighter blue for dark surfaces)
**And** `--background` equals `oklch(0.17 0.02 248.06)` (dark blue-grey)
**And** all other dark mode tokens (secondary, muted, accent, card, popover, border, input, ring) are derived from the blue hue family (hue ~229-248) rather than the current neutral/teal hue (~197-228)

### AC 3: Chart color palette uses the 5-color branded palette

**Given** the app is loaded in either light or dark mode
**When** the developer inspects the chart CSS variables
**Then** `--chart-1` uses hue `244.61` (blue)
**And** `--chart-2` uses hue `178.47` (cyan)
**And** `--chart-3` uses hue `98.11` (yellow-green)
**And** `--chart-4` uses hue `29.23` (orange-red)
**And** `--chart-5` uses hue `307.18` (purple)
**And** each chart color has appropriate lightness for its mode (lighter values for dark mode backgrounds, darker values for light mode backgrounds)

### AC 4: Font stack switches to Avenir Next / Inter

**Given** the app is loaded
**When** the developer inspects the computed `font-family` on body text
**Then** the font stack is `"Avenir Next", "Inter", "Helvetica Neue", "Segoe UI", sans-serif`
**And** the monospace font stack (`--font-mono`) is `"SF Mono", "JetBrains Mono", "Fira Code", "Menlo", monospace`
**And** the `--font-heading` variable uses the same sans-serif stack (removing the Instrument Sans heading font)
**And** the `next/font/google` import for `Outfit` is replaced with `Inter`

### AC 5: Border radius base is updated to 0.625rem

**Given** the app is loaded
**When** the developer inspects the `--radius` CSS variable
**Then** `--radius` equals `0.625rem` (10px base, up from current `0.45rem`)
**And** derived radius tokens (`--radius-sm`, `--radius-md`, `--radius-lg`, etc.) compute correctly from the new base

### AC 6: Sidebar navigation layout is unchanged

**Given** the app is loaded after the design token changes
**When** the user navigates through the sidebar
**Then** the sidebar layout, width, collapse behavior, and menu structure remain identical to the pre-change state
**And** sidebar-specific CSS variables (`--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, etc.) are updated to use the new blue palette hues but the sidebar's structural CSS (widths, paddings, flex layout) is untouched

### AC 7: All existing pages render correctly with no visual regressions

**Given** the design tokens have been updated
**When** the developer navigates through login, home, calendar, documents, players, and contracts pages
**Then** all pages render without broken layouts, missing text, or invisible elements
**And** `pnpm typecheck` passes with zero errors
**And** `pnpm lint` passes with zero new errors
**And** the dev server starts without errors

### AC 8: components.json reflects the new-york style and neutral base color

**Given** the shadcn configuration needs to align with the existing platform
**When** the developer inspects `apps/web/components.json`
**Then** the `style` field is `"new-york"` (matching their shadcn config)
**And** the `baseColor` field is `"neutral"`
**And** the `iconLibrary` remains `"lucide"` (their platform uses lucide)

## Tasks / Subtasks

- [ ] **Task 1: Update CSS variables in `globals.css` — Light mode** (AC: #1)
  - [ ] 1.1: Open `apps/web/src/app/globals.css` and update the `:root` block with the target color palette:
    - `--primary: oklch(0.44 0.115 244.61);`
    - `--primary-foreground: oklch(0.98 0.01 244.61);`
    - `--secondary: oklch(0.96 0.02 244.61);`
    - `--secondary-foreground: oklch(0.25 0.06 244.61);`
    - `--accent: oklch(0.95 0.05 178.47);`
    - `--accent-foreground: oklch(0.25 0.06 244.61);`
    - `--background: oklch(1 0 0);`
    - `--foreground: oklch(0.15 0.03 244.61);`
    - `--destructive: oklch(0.577 0.245 27.325);`
    - `--muted: oklch(0.96 0.01 244.61);`
    - `--muted-foreground: oklch(0.55 0.04 244.61);`
    - `--card: oklch(1 0 0);`
    - `--card-foreground: oklch(0.15 0.03 244.61);`
    - `--popover: oklch(1 0 0);`
    - `--popover-foreground: oklch(0.15 0.03 244.61);`
    - `--border: oklch(0.92 0.02 244.61);`
    - `--input: oklch(0.92 0.02 244.61);`
    - `--ring: oklch(0.44 0.115 244.61);` (same as primary)
  - [ ] 1.2: Update sidebar light-mode variables to use blue hue family:
    - `--sidebar: oklch(0.98 0.01 244.61);`
    - `--sidebar-foreground: oklch(0.15 0.03 244.61);`
    - `--sidebar-primary: oklch(0.44 0.115 244.61);`
    - `--sidebar-primary-foreground: oklch(0.98 0.01 244.61);`
    - `--sidebar-accent: oklch(0.95 0.03 244.61);`
    - `--sidebar-accent-foreground: oklch(0.25 0.06 244.61);`
    - `--sidebar-border: oklch(0.92 0.02 244.61);`
    - `--sidebar-ring: oklch(0.44 0.115 244.61);`

- [ ] **Task 2: Update CSS variables in `globals.css` — Dark mode** (AC: #2)
  - [ ] 2.1: Update the `.dark` block with the target dark mode palette:
    - `--primary: oklch(0.77 0.12 229.3);`
    - `--primary-foreground: oklch(0.17 0.02 248.06);`
    - `--background: oklch(0.17 0.02 248.06);`
    - `--foreground: oklch(0.95 0.01 244.61);`
    - `--secondary: oklch(0.24 0.04 248.06);`
    - `--secondary-foreground: oklch(0.95 0.01 244.61);`
    - `--muted: oklch(0.24 0.04 248.06);`
    - `--muted-foreground: oklch(0.65 0.05 244.61);`
    - `--accent: oklch(0.24 0.04 248.06);`
    - `--accent-foreground: oklch(0.95 0.01 244.61);`
    - `--destructive: oklch(0.704 0.191 22.216);`
    - `--card: oklch(0.21 0.03 248.06);`
    - `--card-foreground: oklch(0.95 0.01 244.61);`
    - `--popover: oklch(0.21 0.03 248.06);`
    - `--popover-foreground: oklch(0.95 0.01 244.61);`
    - `--border: oklch(1 0 0 / 10%);`
    - `--input: oklch(1 0 0 / 15%);`
    - `--ring: oklch(0.77 0.12 229.3);` (same as dark primary)
  - [ ] 2.2: Update sidebar dark-mode variables:
    - `--sidebar: oklch(0.17 0.02 248.06);`
    - `--sidebar-foreground: oklch(0.95 0.01 244.61);`
    - `--sidebar-primary: oklch(0.77 0.12 229.3);`
    - `--sidebar-primary-foreground: oklch(0.95 0.01 244.61);`
    - `--sidebar-accent: oklch(0.24 0.04 248.06);`
    - `--sidebar-accent-foreground: oklch(0.95 0.01 244.61);`
    - `--sidebar-border: oklch(1 0 0 / 10%);`
    - `--sidebar-ring: oklch(0.77 0.12 229.3);`

- [ ] **Task 3: Update chart color palette** (AC: #3)
  - [ ] 3.1: In the `:root` block, replace the current monochromatic chart colors with the 5-color branded palette:
    - `--chart-1: oklch(0.50 0.13 244.61);` (blue)
    - `--chart-2: oklch(0.55 0.12 178.47);` (cyan)
    - `--chart-3: oklch(0.65 0.15 98.11);` (yellow-green)
    - `--chart-4: oklch(0.60 0.18 29.23);` (orange-red)
    - `--chart-5: oklch(0.55 0.15 307.18);` (purple)
  - [ ] 3.2: In the `.dark` block, add chart colors with higher lightness for dark backgrounds:
    - `--chart-1: oklch(0.70 0.13 244.61);` (blue)
    - `--chart-2: oklch(0.72 0.12 178.47);` (cyan)
    - `--chart-3: oklch(0.75 0.15 98.11);` (yellow-green)
    - `--chart-4: oklch(0.72 0.18 29.23);` (orange-red)
    - `--chart-5: oklch(0.70 0.15 307.18);` (purple)

- [ ] **Task 4: Switch font stack** (AC: #4)
  - [ ] 4.1: In `apps/web/src/app/layout.tsx`, replace the `Outfit` Google Font import with `Inter`:
    ```typescript
    // REMOVE:
    import { Geist_Mono, Outfit, Instrument_Sans } from "next/font/google";
    const instrumentSansHeading = Instrument_Sans({ ... });
    const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });
    
    // REPLACE WITH:
    import { Geist_Mono, Inter } from "next/font/google";
    const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
    ```
  - [ ] 4.2: Update the `<html>` element className to use `inter.variable` instead of `outfit.variable`, and remove `instrumentSansHeading.variable`:
    ```typescript
    className={cn("font-sans", inter.variable)}
    ```
  - [ ] 4.3: In `apps/web/src/app/globals.css`, update the `@theme inline` block:
    - Change `--font-sans` to reference `"Avenir Next", var(--font-sans), "Helvetica Neue", "Segoe UI", sans-serif`
    - Change `--font-mono` to `"SF Mono", "JetBrains Mono", "Fira Code", "Menlo", monospace`
    - Remove the `--font-heading` variable from the `@theme inline` block (headings will use the same sans-serif stack)
  - [ ] 4.4: Remove the `--font-heading: var(--font-heading);` line from the `@theme inline` block since headings now share the body font stack.

- [ ] **Task 5: Update border radius base** (AC: #5)
  - [ ] 5.1: In the `:root` block of `globals.css`, change `--radius: 0.45rem;` to `--radius: 0.625rem;`
  - [ ] 5.2: Verify the derived radius tokens in the `@theme inline` block remain correct (they use `calc(var(--radius) +/- Npx)` so they auto-adjust).

- [ ] **Task 6: Update `components.json`** (AC: #8)
  - [ ] 6.1: In `apps/web/components.json`, change `"style"` from `"radix-nova"` to `"new-york"`
  - [ ] 6.2: Change `"baseColor"` from `"mist"` to `"neutral"`
  - [ ] 6.3: Change `"iconLibrary"` from `"tabler"` to `"lucide"`
  - [ ] 6.4: Remove `"menuColor"` and `"menuAccent"` keys if they are not standard shadcn/ui fields for the `new-york` style
  - [ ] 6.5: **Important:** After changing `iconLibrary` from `tabler` to `lucide`, audit all existing components for `@tabler/icons-react` imports. Do NOT change existing component icon imports in this story -- just update the config so that newly added shadcn components use lucide. Existing tabler icons continue to work as the package remains installed.

- [ ] **Task 7: Visual verification** (AC: #6, #7)
  - [ ] 7.1: Start the dev server (`pnpm dev`) and verify the sidebar layout is unchanged in both light and dark mode (same widths, collapse behavior, menu items)
  - [ ] 7.2: Navigate through all major pages (login, home/dashboard, calendar, documents, players, contracts) and verify no broken layouts or invisible text
  - [ ] 7.3: Toggle between light and dark mode -- verify smooth transitions and correct contrast on all pages
  - [ ] 7.4: Run `pnpm typecheck` -- must pass with zero errors
  - [ ] 7.5: Run `pnpm lint` -- must pass with zero new errors
  - [ ] 7.6: Verify the dev server starts without errors

## Dev Notes

### Architecture Context

This story updates the **visual identity layer** established in Story 1.2 to align with the existing BrainAnalytics platform (football-dashboard-2). It is a CSS-variables-only change with a font stack swap -- no component logic changes.

**Source of truth for target values:**
- `football-dashboard-2/src/app/globals.css` -- OKLCH color palette, font stack, radius
- `football-dashboard-2/src/components/charts/` -- chart color usage patterns

**Files to modify:**
1. `apps/web/src/app/globals.css` -- CSS variables (`:root` and `.dark` blocks), `@theme inline` block
2. `apps/web/src/app/layout.tsx` -- Font imports (Outfit -> Inter, remove Instrument Sans)
3. `apps/web/components.json` -- shadcn/ui style configuration

**Files NOT to modify:**
- `apps/web/src/components/ui/sidebar.tsx` -- structural sidebar code stays untouched
- Any component files -- no component logic changes in this story
- `apps/admin/` -- admin app is out of scope

### Key Decisions

1. **Avenir Next is a system/licensed font** -- We list it first in the CSS font stack so it renders on machines that have it installed (macOS ships with it). The `Inter` Google Font loaded via `next/font` acts as the web fallback. This is the same approach used by the existing platform.

2. **We keep `@tabler/icons-react` installed** -- The existing platform uses lucide, but our codebase has 50+ components using tabler icons. Changing `iconLibrary` in `components.json` only affects future `npx shadcn add` commands. Migrating existing icons is a separate effort if needed.

3. **Chart color exact lightness values may need tuning** -- The hues are specified by the existing platform, but the exact lightness/chroma combinations provided in the tasks are starting points. The developer should visually verify contrast and adjust lightness within +/-0.05 if needed for readability.

4. **`components.json` style change from `radix-nova` to `new-york`** -- This changes the default component templates used by `npx shadcn add`. Existing components already in `apps/web/src/components/ui/` are NOT affected retroactively. Only newly added components will use the `new-york` style. If component visual differences are noticed, they can be addressed in follow-up stories.

### Testing Approach

This is a visual/CSS-only change. Testing is manual:
- Visual comparison of all major pages in light and dark mode
- Sidebar layout regression check (screenshot comparison recommended)
- TypeScript and lint pass (automated)
- No new unit tests required (no logic changes)

### Dependencies

- **Builds on:** Story 1.2 (Configure Design System & Theme) -- that story set up the initial shadcn/ui theme
- **Blocks:** Story 7.2 (Pitch Visualizations), Story 7.3 (Chart Components), Story 7.4 (Dashboard Cards) -- these stories depend on the aligned design tokens
