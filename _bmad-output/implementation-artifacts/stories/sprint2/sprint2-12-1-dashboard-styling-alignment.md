# Story 12.1: Dashboard Styling Alignment

Status: ready-for-dev

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/`.

## Story

As a club staff member, I want the dashboard homepage to visually match the original BrainAnalytics platform's design language, so that the new platform feels like a polished continuation of the brand rather than a separate product.

## Problem Statement

The Sprint 1 demo revealed that while the design tokens (colors, radius, fonts) were partially ported in Story 7.1, the **dashboard homepage components** in `apps/web/` still diverge from the original platform in several concrete ways:

1. **CSS variable mismatches** between `globals.css` files (see detailed diff below)
2. **Component structure gap** -- our homepage uses flat list-style cards; the original uses richer layouts with team logos, VS dividers, gradient backgrounds, hover micro-interactions, and icon-to-color transitions
3. **Missing font-variable indirection** -- original uses `--font-manrope` / `--font-ibm-plex-mono` CSS custom properties; ours hardcodes font stacks directly in `@theme inline`
4. **Missing cursor rule** for interactive elements present in the original

---

## Detailed CSS Variable Diff: Original vs Current

### Light mode `:root` mismatches

| Variable | Original Value | Current Value | Action |
|---|---|---|---|
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.15 0.03 244.61)` | Align to original (neutral gray, no blue hue) |
| `--card-foreground` | `oklch(0.145 0 0)` | `oklch(0.15 0.03 244.61)` | Align to original |
| `--popover-foreground` | `oklch(0.145 0 0)` | `oklch(0.15 0.03 244.61)` | Align to original |
| `--secondary-foreground` | `oklch(0.26 0.03 244.61)` | `oklch(0.25 0.06 244.61)` | Align chroma `0.03` |
| `--muted` | `oklch(0.97 0.01 244.61)` | `oklch(0.96 0.01 244.61)` | Align lightness `0.97` |
| `--muted-foreground` | `oklch(0.49 0.03 244.61)` | `oklch(0.55 0.04 244.61)` | Align to `0.49 0.03` (darker, less saturated) |
| `--accent-foreground` | `oklch(0.25 0.04 178.47)` | `oklch(0.25 0.06 244.61)` | Align hue to `178.47` (teal) and chroma `0.04` |
| `--border` | `oklch(0.91 0.01 244.61)` | `oklch(0.92 0.02 244.61)` | Align to `0.91 0.01` |
| `--input` | `oklch(0.91 0.01 244.61)` | `oklch(0.92 0.02 244.61)` | Align to `0.91 0.01` |
| `--ring` | `oklch(0.68 0.08 244.61)` | `oklch(0.44 0.115 244.61)` | Align to `0.68 0.08` (lighter, less saturated ring) |
| `--chart-1` | `oklch(0.62 0.15 244.61)` | `oklch(0.50 0.13 244.61)` | Align to `0.62 0.15` |
| `--chart-2` | `oklch(0.72 0.14 178.47)` | `oklch(0.55 0.12 178.47)` | Align to `0.72 0.14` |
| `--chart-3` | `oklch(0.67 0.16 98.11)` | `oklch(0.65 0.15 98.11)` | Align to `0.67 0.16` |
| `--chart-4` | `oklch(0.61 0.17 29.23)` | `oklch(0.60 0.18 29.23)` | Align to `0.61 0.17` |
| `--chart-5` | `oklch(0.75 0.13 307.18)` | `oklch(0.55 0.15 307.18)` | Align to `0.75 0.13` |
| `--sidebar` | `oklch(0.985 0 0)` | `oklch(0.98 0.01 244.61)` | Align to neutral `0.985 0 0` |
| `--sidebar-foreground` | `oklch(0.145 0 0)` | `oklch(0.15 0.03 244.61)` | Align to neutral |
| `--sidebar-primary` | `oklch(0.205 0 0)` | `oklch(0.44 0.115 244.61)` | Align to `0.205 0 0` (dark neutral) |
| `--sidebar-primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.98 0.01 244.61)` | Align to neutral |
| `--sidebar-accent` | `oklch(0.97 0 0)` | `oklch(0.95 0.03 244.61)` | Align to neutral `0.97 0 0` |
| `--sidebar-accent-foreground` | `oklch(0.205 0 0)` | `oklch(0.25 0.06 244.61)` | Align to `0.205 0 0` |
| `--sidebar-border` | `oklch(0.922 0 0)` | `oklch(0.92 0.02 244.61)` | Align to neutral `0.922 0 0` |
| `--sidebar-ring` | `oklch(0.708 0 0)` | `oklch(0.44 0.115 244.61)` | Align to `0.708 0 0` |

### Dark mode `.dark` mismatches

| Variable | Original Value | Current Value | Action |
|---|---|---|---|
| `--foreground` | `oklch(0.96 0.01 248.06)` | `oklch(0.95 0.01 244.61)` | Align lightness/hue |
| `--card` | `oklch(0.22 0.02 248.06)` | `oklch(0.21 0.03 248.06)` | Align to `0.22 0.02` |
| `--card-foreground` | `oklch(0.96 0.01 248.06)` | `oklch(0.95 0.01 244.61)` | Align |
| `--popover` | `oklch(0.22 0.02 248.06)` | `oklch(0.21 0.03 248.06)` | Align |
| `--popover-foreground` | `oklch(0.96 0.01 248.06)` | `oklch(0.95 0.01 244.61)` | Align |
| `--secondary` | `oklch(0.31 0.03 248.06)` | `oklch(0.24 0.04 248.06)` | Align to `0.31 0.03` |
| `--secondary-foreground` | `oklch(0.96 0.01 248.06)` | `oklch(0.95 0.01 244.61)` | Align |
| `--muted` | `oklch(0.31 0.03 248.06)` | `oklch(0.24 0.04 248.06)` | Align to `0.31 0.03` |
| `--muted-foreground` | `oklch(0.72 0.03 248.06)` | `oklch(0.65 0.05 244.61)` | Align to `0.72 0.03` (lighter) |
| `--accent` | `oklch(0.35 0.06 178.47)` | `oklch(0.24 0.04 248.06)` | Align to teal accent `0.35 0.06 178.47` |
| `--accent-foreground` | `oklch(0.96 0.01 248.06)` | `oklch(0.95 0.01 244.61)` | Align |
| `--border` | `oklch(1 0 0 / 12%)` | `oklch(1 0 0 / 10%)` | Align to `12%` |
| `--input` | `oklch(1 0 0 / 18%)` | `oklch(1 0 0 / 15%)` | Align to `18%` |
| `--ring` | `oklch(0.63 0.09 229.3)` | `oklch(0.77 0.12 229.3)` | Align to `0.63 0.09` |
| `--chart-1` | `oklch(0.65 0.17 229.3)` | `oklch(0.70 0.13 244.61)` | Align to `0.65 0.17 229.3` |
| `--chart-2` | `oklch(0.72 0.13 178.47)` | `oklch(0.72 0.12 178.47)` | Align chroma |
| `--chart-3` | `oklch(0.74 0.17 98.11)` | `oklch(0.75 0.15 98.11)` | Align |
| `--chart-4` | `oklch(0.69 0.18 29.23)` | `oklch(0.72 0.18 29.23)` | Align lightness |
| `--chart-5` | `oklch(0.76 0.14 307.18)` | `oklch(0.70 0.15 307.18)` | Align |
| `--sidebar` | `oklch(0.205 0 0)` | `oklch(0.17 0.02 248.06)` | Align to neutral `0.205 0 0` |
| `--sidebar-foreground` | `oklch(0.985 0 0)` | `oklch(0.95 0.01 244.61)` | Align |
| `--sidebar-primary` | `oklch(0.488 0.243 264.376)` | `oklch(0.77 0.12 229.3)` | Align to `0.488 0.243 264.376` (vivid blue) |
| `--sidebar-primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.95 0.01 244.61)` | Align |
| `--sidebar-accent` | `oklch(0.269 0 0)` | `oklch(0.24 0.04 248.06)` | Align to neutral `0.269 0 0` |
| `--sidebar-accent-foreground` | `oklch(0.985 0 0)` | `oklch(0.95 0.01 244.61)` | Align |
| `--sidebar-border` | `oklch(1 0 0 / 10%)` | Same | OK |
| `--sidebar-ring` | `oklch(0.556 0 0)` | `oklch(0.77 0.12 229.3)` | Align to `0.556 0 0` |

### `@theme inline` / font variable differences

| Aspect | Original | Current | Action |
|---|---|---|---|
| `--font-sans` | `var(--font-manrope)` (resolved via `:root --font-manrope`) | Hardcoded `"Avenir Next", var(--font-sans), ...` | Use `--font-manrope` / `--font-ibm-plex-mono` custom properties like original |
| `--font-mono` | `var(--font-ibm-plex-mono)` | Hardcoded stack | Same approach |
| Missing cursor rule | `button:not(:disabled), [role="button"]:not([aria-disabled="true"]), a[href] { cursor: pointer; }` | Not present | Add |

---

## Acceptance Criteria (BDD)

### AC1: CSS Variables Match Original Platform

**Given** the original platform's `globals.css` defines specific oklch color tokens  
**When** a developer inspects `apps/web/src/app/globals.css`  
**Then** every CSS custom property in both `:root` and `.dark` matches the original platform's values exactly as listed in the diff table above (all ~40+ variables)

### AC2: Font Variable Indirection

**Given** the original platform uses `--font-manrope` and `--font-ibm-plex-mono` custom properties in `:root`  
**When** `@theme inline` references `--font-sans` and `--font-mono`  
**Then** the values use `var(--font-manrope)` and `var(--font-ibm-plex-mono)` respectively, and `:root` defines those properties with the same fallback stacks as the original

### AC3: Interactive Element Cursor Rule

**Given** the original platform applies `cursor: pointer` to non-disabled buttons, role="button" elements, and anchor tags  
**When** a user hovers over any interactive element on the dashboard  
**Then** the pointer cursor appears, matching the original platform behavior

### AC4: Homepage Component Styling Parity

**Given** the original platform homepage uses rounded-xl borders, bg-primary/10 icon containers with hover-to-filled transitions, gradient card headers, team logo display with ring borders, VS divider badges, and ArrowRight reveal-on-hover patterns  
**When** a user views the new platform's homepage at `/`  
**Then** the visual treatment of cards, icons, hover states, and layout density closely matches the original platform's aesthetic

### AC5: Dark Mode Parity

**Given** both light and dark mode tokens have been aligned  
**When** a user toggles dark mode  
**Then** the dashboard renders with the same dark palette as the original platform (correct card backgrounds, muted tones, sidebar neutrals, accent teal hue)

---

## Tasks / Subtasks

### Frontend Tasks

- [ ] **Task 1: Align all CSS custom properties in `globals.css`** (AC: 1, 5)
  - [ ] 1.1: Update all `:root` variables to match original values (see light mode diff table -- ~20 variables)
  - [ ] 1.2: Update all `.dark` variables to match original values (see dark mode diff table -- ~22 variables)
  - [ ] 1.3: Add `--font-manrope` and `--font-ibm-plex-mono` custom properties to `:root` with the original fallback stacks: `"Avenir Next", "Inter", "Helvetica Neue", "Segoe UI", sans-serif` and `"SF Mono", "JetBrains Mono", "Fira Code", "Menlo", monospace`
  - [ ] 1.4: Update `@theme inline` to use `var(--font-manrope)` and `var(--font-ibm-plex-mono)` for `--font-sans` / `--font-mono`

- [ ] **Task 2: Add missing base layer rules** (AC: 3)
  - [ ] 2.1: Add interactive-element cursor rule to `@layer base`: `button:not(:disabled), [role="button"]:not([aria-disabled="true"]), a[href] { cursor: pointer; }`

- [ ] **Task 3: Upgrade MatchCountdown component styling** (AC: 4)
  - [ ] 3.1: Replace flat `Card` with gradient header treatment (`bg-linear-to-b from-primary/5 to-transparent`)
  - [ ] 3.2: Add team logo display areas with `rounded-2xl bg-background p-3 shadow-xs ring-1 ring-border` containers (matching original's 16x16/20x20 logo boxes)
  - [ ] 3.3: Add VS divider badge (`rounded-full bg-muted text-[10px] font-black ring-4 ring-background`)
  - [ ] 3.4: Style countdown badge with `animate-pulse bg-primary px-3 py-1 text-xs font-bold`
  - [ ] 3.5: Add date header row with calendar icon, uppercase tracking-wider text style
  - File: `apps/web/src/components/home/match-countdown.tsx`

- [ ] **Task 4: Upgrade RecentResults component styling** (AC: 4)
  - [ ] 4.1: Wrap each result row in a `Link` with `rounded-xl border p-3 transition-colors hover:bg-muted/50`
  - [ ] 4.2: Add opponent logo container (`h-10 w-10 rounded-lg bg-muted p-1.5 ring-1 ring-border`)
  - [ ] 4.3: Add win/draw/loss badge as colored circle (`h-8 w-8 rounded-full font-black ring-4 ring-background`) with green/red/gray backgrounds
  - [ ] 4.4: Display score as `text-sm font-black tracking-tighter`
  - File: `apps/web/src/components/home/recent-results.tsx`

- [ ] **Task 5: Upgrade UpcomingFixtures component styling** (AC: 4)
  - [ ] 5.1: Add opponent logo container with ring border treatment
  - [ ] 5.2: Use `text-[10px]` for meta-info (date/time) with calendar and clock icons at `size-2.5`
  - [ ] 5.3: Add `Badge variant="outline"` for Home/Away with `text-[10px] font-medium uppercase tracking-tighter`
  - [ ] 5.4: Add hover state: `group relative transition-colors hover:bg-muted/50`
  - File: `apps/web/src/components/home/upcoming-fixtures.tsx`

- [ ] **Task 6: Upgrade QuickAccessCards component styling** (AC: 4)
  - [ ] 6.1: Add icon container with primary tint: `h-10 w-10 rounded-lg bg-primary/10 text-primary` with hover transition to `group-hover:bg-primary group-hover:text-white`
  - [ ] 6.2: Add ArrowRight icon with reveal-on-hover: `ml-auto size-4 text-primary opacity-0 transition-opacity group-hover:opacity-100`
  - [ ] 6.3: Use `text-sm font-bold` for titles, `text-[10px] text-muted-foreground` for descriptions (matching original's compact style)
  - File: `apps/web/src/components/home/quick-access-cards.tsx`

- [ ] **Task 7: Upgrade RecentDashboards and PinnedDashboards styling** (AC: 4)
  - [ ] 7.1: Change list items to `rounded-xl border p-3` with hover: `hover:border-primary/30 hover:bg-muted/30`
  - [ ] 7.2: Upgrade icon container from `rounded-md bg-primary/15 p-1.5` to `h-8 w-8 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white`
  - [ ] 7.3: Add ArrowRight reveal-on-hover animation: `opacity-0 group-hover:translate-x-1 group-hover:opacity-100`
  - [ ] 7.4: Replace text link footer with `Button variant="outline"` matching original's full-width CTA pattern
  - Files: `apps/web/src/components/home/recent-dashboards.tsx`, `apps/web/src/components/home/pinned-dashboards.tsx`

- [ ] **Task 8: Update homepage layout density** (AC: 4)
  - [ ] 8.1: Review spacing in `apps/web/src/app/(app)/page.tsx` -- original uses `space-y-6` at root level; ensure our `gap-6`/`gap-8` matches
  - [ ] 8.2: Ensure grid breakpoints match: original uses `sm:grid-cols-2 lg:grid-cols-3` for dashboard cards, `xl:grid-cols-3` for match section, `md:grid-cols-2 xl:grid-cols-2` for bottom sections
  - File: `apps/web/src/app/(app)/page.tsx`

---

## Dev Notes

### Architecture Patterns

- All dashboard components are client-side (`"use client"`) in `apps/web/src/components/home/`
- The original platform is a server-rendered Next.js app with Supabase; ours is client-rendered with Convex -- component structure will differ but visual output must match
- Use `@tabler/icons-react` (already in our project) rather than `lucide-react` (used by original) -- icons are functionally equivalent
- The original uses `shadcn/ui` Card, Badge, Button components -- same as ours
- Preserve existing data-fetching logic and Convex queries; only change JSX structure and Tailwind classes

### Key Visual Patterns from Original to Replicate

1. **Icon hover transition**: `bg-primary/10 text-primary` -> `group-hover:bg-primary group-hover:text-white` (icon background fills with primary on hover)
2. **Card hover**: `hover:border-primary/50 hover:shadow-md` with `group` class on parent
3. **Arrow reveal**: `ArrowRight` icon with `opacity-0 group-hover:opacity-100 group-hover:translate-x-1`
4. **Compact text**: `text-[10px]` for secondary/meta information
5. **Ring borders on logos**: `ring-1 ring-border` for image containers, `ring-4 ring-background` for floating badges
6. **Gradient backgrounds**: `bg-linear-to-b from-primary/5 to-transparent` on featured sections

### What NOT to Change

- Do NOT add server-side data fetching or change the Convex query pattern
- Do NOT change the route structure or page composition
- Do NOT add new dependencies
- Do NOT add i18n support in this story (that is a separate concern)
- Do NOT touch `apps/admin/`

### References

- Original platform globals: `brainAnalytics/football-dashboard-2/src/app/globals.css`
- Original platform homepage: `brainAnalytics/football-dashboard-2/src/app/(dashboard)/page.tsx`
- Current globals: `apps/web/src/app/globals.css`
- Current homepage: `apps/web/src/app/(app)/page.tsx`
- Current components: `apps/web/src/components/home/*.tsx`

---

## Dev Agent Record

### Agent Model Used
<!-- filled by dev agent -->

### Completion Notes List
<!-- filled by dev agent -->

### Change Log
<!-- filled by dev agent -->

### File List
- `apps/web/src/app/globals.css`
- `apps/web/src/app/(app)/page.tsx`
- `apps/web/src/components/home/match-countdown.tsx`
- `apps/web/src/components/home/recent-results.tsx`
- `apps/web/src/components/home/upcoming-fixtures.tsx`
- `apps/web/src/components/home/quick-access-cards.tsx`
- `apps/web/src/components/home/recent-dashboards.tsx`
- `apps/web/src/components/home/pinned-dashboards.tsx`
