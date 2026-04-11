# QA Manual Test Plan — Sprint 2

**Project:** Brain Analytics Platform
**Sprint:** Sprint 2 — Live Data, Staff Profiles & Injury Reporting
**Epics Covered:** 12 (Sprint 1 Polish), 13 (Staff Profiles), 14 (Injury Reporting), 15 (Live Data Integration)
**Date:** 2026-04-11
**Author:** QA Lead
**Status:** In Progress

---

## Global Prerequisites

| Prerequisite | Details |
|---|---|
| Environment | `apps/web` running via `pnpm dev` (localhost:3000) |
| Auth | Logged in as an **admin** user unless test specifies otherwise |
| Mock Data | `USE_MOCK_DATA=true` in `.env.local` (Epics 12-14). Real data for Epic 15. |
| Convex | `npx convex dev` running |
| Browser | Chrome or Firefox, latest stable, viewport >= 1440px unless testing responsive |

---

## Epic 12: Sprint 1 Polish

### Story 12.1: Dashboard Styling Alignment

#### TC-12.1-01: Homepage Visual Parity

| Field | Value |
|---|---|
| **ACs Covered** | AC1, AC4 |
| **Steps** | 1. Navigate to `/`. 2. Compare visually with the original platform's homepage. 3. Check: match countdown has gradient header, VS divider badge, team logo placeholders with ring borders. 4. Check: recent results have colored W/D/L circle badges (green/gray/red). 5. Check: upcoming fixtures have Home/Away outline badges, logo containers. 6. Check: quick access cards have icon hover-to-fill transition (primary/10 → primary) and arrow reveal on hover. 7. Check: recent/pinned dashboards have bordered cards with hover states and full-width CTA buttons. |
| **Expected** | All homepage components visually match the original platform's design language. Hover transitions work smoothly. |
| **Pass/Fail** | [ ] |

#### TC-12.1-02: Dark Mode Parity

| Field | Value |
|---|---|
| **ACs Covered** | AC5 |
| **Steps** | 1. Toggle dark mode via settings. 2. Navigate to `/`. 3. Verify sidebar uses neutral dark tones (not blue-tinted). 4. Verify card backgrounds, muted tones, and accent colors match original dark palette. 5. Verify chart colors render correctly in dark mode. |
| **Expected** | Dark mode renders with correct palette — neutral sidebar, teal accent, correct chart colors. |
| **Pass/Fail** | [ ] |

#### TC-12.1-03: Interactive Element Cursor

| Field | Value |
|---|---|
| **ACs Covered** | AC3 |
| **Steps** | 1. Hover over buttons, links, and clickable cards across the homepage. 2. Verify pointer cursor appears on all interactive elements. |
| **Expected** | Pointer cursor on all non-disabled buttons, role="button" elements, and links. |
| **Pass/Fail** | [ ] |

### Story 12.2: UX Feedback Fixes

#### TC-12.2-01: Calendar Navigation

| Field | Value |
|---|---|
| **ACs Covered** | Fix 1 |
| **Steps** | 1. Navigate to `/calendar`. 2. Go forward to May. 3. Go back to current month. 4. Go forward 2 months, then back 2 months. 5. Verify no visual glitches, no duplicate events, no stale day labels. |
| **Expected** | Calendar renders cleanly after each navigation. Events match expected count for each month. |
| **Pass/Fail** | [ ] |

#### TC-12.2-02: Players Page Card Layout

| Field | Value |
|---|---|
| **ACs Covered** | Fix 2 |
| **Steps** | 1. Navigate to `/players`. 2. Verify cards are grouped by position: Goalkeepers, Defenders, Midfielders, Forwards. 3. Verify each card shows circular avatar, player name, squad number, status badge. 4. Verify empty position groups are hidden. 5. Click a card → verify navigation to player profile. 6. Compare with client reference screenshots in `docs/reference/screenshots/player profile screenshots/`. |
| **Expected** | Card-based layout grouped by position matching client mockup. Clickable cards. |
| **Pass/Fail** | [ ] |

#### TC-12.2-03: Nationality Dropdown

| Field | Value |
|---|---|
| **ACs Covered** | Fix 3 |
| **Steps** | 1. Navigate to `/players`, click "Add Player". 2. Verify nationality field is a searchable dropdown (not free text). 3. Type "Ita" → verify "Italy" appears. 4. Type "Eng" → verify "England" appears (separate from "United Kingdom"). 5. Select a country → verify it's saved. 6. Clear the selection → verify it resets. |
| **Expected** | Searchable country dropdown with 210+ countries. England/Scotland/Wales as separate entries. |
| **Pass/Fail** | [ ] |

#### TC-12.2-04: Date Format DD/MM/YYYY

| Field | Value |
|---|---|
| **ACs Covered** | Fix 4 |
| **Steps** | 1. Navigate to `/players` → open a player profile → verify DOB is DD/MM/YYYY. 2. Check stats log dates. 3. Check fitness log dates. 4. Navigate to `/documents` → verify upload dates are DD/MM/YYYY. 5. Navigate to `/calendar` → verify event dates in detail panel. 6. Navigate to `/` → verify homepage fixture/result dates. 7. Check admin user table dates. |
| **Expected** | All dates across the platform use DD/MM/YYYY format. No US-style dates (MM/DD or MMM D). |
| **Pass/Fail** | [ ] |

### Story 12.3: Data Fixes & GDPR

#### TC-12.3-01: Admin Edit Player Contact Info

| Field | Value |
|---|---|
| **ACs Covered** | Fix B |
| **Prerequisites** | Logged in as admin |
| **Steps** | 1. Navigate to `/players`, open any player profile. 2. Verify an "Edit Contact Info" button is visible in the Bio tab. 3. Click it → modify phone number and email. 4. Save → verify toast confirmation and values updated. 5. Log in as a non-admin → verify the edit button is NOT visible on another player's profile. |
| **Expected** | Admin can edit any player's contact info. Non-admin cannot. |
| **Pass/Fail** | [ ] |

#### TC-12.3-02: GDPR Player Deletion

| Field | Value |
|---|---|
| **ACs Covered** | Fix C |
| **Prerequisites** | Logged in as admin. Create a test player with stats, fitness data, and a contract. |
| **Steps** | 1. Open the test player's profile. 2. Click "Delete Player" (destructive button). 3. Verify a confirmation dialog appears requiring you to type the player's full name. 4. Type the wrong name → verify the delete button stays disabled. 5. Type the correct full name → click "Permanently Delete". 6. Verify toast confirmation and redirect to `/players`. 7. Verify the player no longer appears in the players list. 8. Check Convex dashboard: verify no orphaned records in playerStats, playerFitness, contracts tables. |
| **Expected** | Two-step confirmation. Cascade deletes all associated data. Player fully removed. |
| **Pass/Fail** | [ ] |

#### TC-12.3-03: Admin Cannot Self-Delete

| Field | Value |
|---|---|
| **ACs Covered** | Fix C (edge case) |
| **Prerequisites** | Admin user who is also linked as a player |
| **Steps** | 1. If the admin has a linked player profile, try to delete it. 2. Verify an error "You cannot delete your own player profile" is shown. |
| **Expected** | Self-deletion is blocked. |
| **Pass/Fail** | [ ] |

---
