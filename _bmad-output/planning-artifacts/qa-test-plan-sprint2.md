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

## Epic 13: Staff Profiles & Directory

### Story 13.1: Staff Schema, CRUD & Profile Page

#### TC-13.1-01: Create Staff Profile

| Field | Value |
|---|---|
| **ACs Covered** | AC5, AC8, AC10, AC12 |
| **Prerequisites** | Logged in as admin |
| **Steps** | 1. Verify "Staff" appears in the sidebar navigation. 2. Click it → navigate to `/staff`. 3. Click "Add Staff". 4. Fill in: first name, last name, job title, department (select from dropdown), phone, email, bio. 5. Submit. 6. Verify toast confirmation and redirect to staff list. 7. Verify the new staff member appears in the list. |
| **Expected** | Staff profile created. Visible in list with correct department badge and status "Active". |
| **Pass/Fail** | [ ] |

#### TC-13.1-02: View & Edit Staff Profile

| Field | Value |
|---|---|
| **ACs Covered** | AC4, AC6, AC9, AC11 |
| **Steps** | 1. Click a staff member in the list → profile page loads. 2. Verify 3 tabs: Overview, Certifications (placeholder), Role Info (placeholder). 3. Verify Overview shows all fields (name, job title, department, phone, email, bio, date joined). 4. Click "Edit" → verify pre-populated form. 5. Change job title → save. 6. Verify toast and updated value on profile page. |
| **Expected** | Profile displays correctly. Edit persists changes. |
| **Pass/Fail** | [ ] |

#### TC-13.1-03: Staff List Filters

| Field | Value |
|---|---|
| **ACs Covered** | AC3 |
| **Steps** | 1. Navigate to `/staff`. 2. Filter by department → verify only staff from that department appear. 3. Filter by status (Active/Inactive) → verify correct filtering. 4. Type in search → verify name filtering works. 5. Combine department + search → verify both apply. |
| **Expected** | All filters work independently and combined. |
| **Pass/Fail** | [ ] |

#### TC-13.1-04: Non-Admin Access

| Field | Value |
|---|---|
| **ACs Covered** | AC3, AC5 |
| **Prerequisites** | Logged in as non-admin (coach) |
| **Steps** | 1. Navigate to `/staff` → verify list is visible (read access for all). 2. Verify "Add Staff" button is NOT visible. 3. Click a staff member → verify profile is viewable. 4. Verify "Edit" button is NOT visible. |
| **Expected** | Non-admins can view but not create/edit staff. |
| **Pass/Fail** | [ ] |

### Story 13.2: Staff Directory

#### TC-13.2-01: Directory Card Layout & Navigation

| Field | Value |
|---|---|
| **ACs Covered** | Card layout, responsive grid, click navigation |
| **Steps** | 1. Navigate to `/staff`. 2. Verify card-based layout with photo, name, job title, department badge. 3. Resize browser → verify responsive grid (1 col mobile, 2 tablet, 3 desktop). 4. Click a card → verify navigation to `/staff/[staffId]`. |
| **Expected** | Cards render correctly at all breakpoints. Click navigates to profile. |
| **Pass/Fail** | [ ] |

#### TC-13.2-02: Search & Filters

| Field | Value |
|---|---|
| **ACs Covered** | Debounced search, department filter, role filter |
| **Steps** | 1. Type a staff member's name in search → verify results filter after short delay. 2. Search by full name (first + last) → verify it works. 3. Select a department filter → verify only that department shows. 4. Select a role filter → verify filtering. 5. Combine search + department → verify both apply. 6. Clear all filters → verify all staff reappear. |
| **Expected** | All filters work independently and combined. Search is debounced. |
| **Pass/Fail** | [ ] |

### Story 13.3: Certification Tracking & Expiry Alerts

#### TC-13.3-01: Add & View Certification

| Field | Value |
|---|---|
| **ACs Covered** | CRUD, status badges, date format |
| **Prerequisites** | Logged in as admin, at least one staff member exists |
| **Steps** | 1. Open a staff profile → Certifications tab. 2. Click "Add Certification". 3. Fill in: name (e.g. "UEFA A License"), issuing body ("UEFA"), issue date, expiry date (set to 1 year from now). 4. Submit → verify toast and cert appears in list. 5. Verify status badge is green (Valid). 6. Add another cert with expiry in 15 days → verify amber badge (Expiring). 7. Add another with expiry in the past → verify red badge (Expired). 8. Verify all dates display in DD/MM/YYYY format. |
| **Expected** | Certs created with correct status badges. Dates in European format. |
| **Pass/Fail** | [ ] |

#### TC-13.3-02: Edit & Delete Certification

| Field | Value |
|---|---|
| **ACs Covered** | CRUD |
| **Steps** | 1. Click the actions menu on a certification → Edit. 2. Change the expiry date → save → verify updated. 3. Click actions → Delete → confirm → verify cert removed from list. |
| **Expected** | Edit persists changes. Delete removes the cert. |
| **Pass/Fail** | [ ] |

#### TC-13.3-03: Admin Expiry Alerts

| Field | Value |
|---|---|
| **ACs Covered** | Admin alerts |
| **Prerequisites** | At least one cert expiring within 60 days or already expired |
| **Steps** | 1. Navigate to `/staff`. 2. Verify an "Expiring Certifications" alert section appears (admin only). 3. Verify it shows the expiring/expired certs with staff name, cert name, expiry date. 4. Log in as non-admin → verify the alert section is NOT visible. |
| **Expected** | Admin sees team-wide expiry alerts. Non-admin does not. |
| **Pass/Fail** | [ ] |

#### TC-13.3-04: Self-Service Certification Management

| Field | Value |
|---|---|
| **ACs Covered** | Admin-or-self auth |
| **Prerequisites** | Logged in as a staff member (non-admin) with a linked user account |
| **Steps** | 1. Navigate to own staff profile → Certifications tab. 2. Verify "Add Certification" button is visible. 3. Add a cert → verify it works. 4. Navigate to another staff member's profile → verify "Add Certification" is NOT visible. |
| **Expected** | Staff can manage own certs but not others'. |
| **Pass/Fail** | [ ] |

### Story 13.4: Staff Self-Service & Deactivation

#### TC-13.4-01: Staff Self-Service Edit

| Field | Value |
|---|---|
| **ACs Covered** | Self-service phone/email/bio edit |
| **Prerequisites** | Logged in as a staff member (non-admin) with a linked staff profile |
| **Steps** | 1. Navigate to own staff profile (via sidebar "My Profile" or `/staff/[staffId]`). 2. Verify "Edit Profile" button is visible on the Overview tab. 3. Click it → verify form shows phone, email, bio fields only (no role, department, job title). 4. Modify phone and bio → save. 5. Verify toast confirmation and updated values. 6. Navigate to another staff member's profile → verify "Edit Profile" is NOT visible. |
| **Expected** | Staff can edit own phone/email/bio. Cannot edit restricted fields. Cannot edit others. |
| **Pass/Fail** | [ ] |

#### TC-13.4-02: Admin Deactivate & Reactivate Staff

| Field | Value |
|---|---|
| **ACs Covered** | Deactivation, reactivation, banned flag |
| **Prerequisites** | Logged in as admin, at least one active staff member |
| **Steps** | 1. Open a staff profile → verify "Deactivate" button visible (admin only). 2. Click "Deactivate" → confirm in dialog. 3. Verify staff status changes to "Inactive" with badge. 4. Verify the deactivated staff member cannot log in (banned). 5. Click "Reactivate" → confirm. 6. Verify status returns to "Active" and login is restored. |
| **Expected** | Deactivation sets inactive + bans user. Reactivation restores access. |
| **Pass/Fail** | [ ] |

#### TC-13.4-03: Inactive Staff Directory Filtering

| Field | Value |
|---|---|
| **ACs Covered** | Non-admin directory filtering |
| **Steps** | 1. As admin, deactivate a staff member. 2. Navigate to `/staff` → verify inactive staff shows with "Inactive" badge and muted styling. 3. Log in as non-admin → navigate to `/staff` → verify inactive staff is NOT visible. |
| **Expected** | Admin sees inactive staff. Non-admin does not. |
| **Pass/Fail** | [ ] |

#### TC-13.4-04: Sidebar "My Profile" Link

| Field | Value |
|---|---|
| **ACs Covered** | Sidebar quick link |
| **Steps** | 1. Log in as a user with a linked staff profile. 2. Verify "My Profile" link appears in the sidebar. 3. Click it → verify navigation to own staff profile page. 4. Log in as a user WITHOUT a linked staff profile → verify "My Profile" does NOT appear. |
| **Expected** | Quick link visible only for users with staff profiles. |
| **Pass/Fail** | [ ] |

## Epic 14: Injury Reporting

### Story 14.1: Injury Schema & Clinical Classification

#### TC-14.1-01: Log Injury with Clinical Classification

| Field | Value |
|---|---|
| **ACs Covered** | AC1, AC4, AC8, AC9, AC11 |
| **Prerequisites** | Logged in as admin or physio, at least one player exists |
| **Steps** | 1. Open a player profile → verify "Injuries" tab is visible. 2. Click it → click "Log Injury". 3. Verify form has: date, injury type (text), severity (dropdown), body region (dropdown with 20 options), mechanism (contact/non-contact/overuse), side (left/right/bilateral/N/A), expected return date, notes. 4. Fill all fields → submit. 5. Verify the new injury appears in the table with correct body region, mechanism, side columns. 6. Verify status badge shows "Active" (red). |
| **Expected** | Injury created with all clinical classification fields. Visible in table with correct badges. |
| **Pass/Fail** | [ ] |

#### TC-14.1-02: Status Transitions

| Field | Value |
|---|---|
| **ACs Covered** | AC5, AC6, AC10 |
| **Steps** | 1. Edit an active injury → change status to "Rehab" → save → verify orange badge. 2. Edit → change to "Assessment" → verify yellow badge. 3. Edit → change to "Cleared" → verify green badge and actual return date auto-set. 4. Edit → change back to "Active" (re-injury) → verify red badge. |
| **Expected** | All 4 status transitions work. Badges color-coded correctly. Auto-set return date on cleared. |
| **Pass/Fail** | [ ] |

#### TC-14.1-03: Non-Medical Access Denied

| Field | Value |
|---|---|
| **ACs Covered** | AC7 |
| **Prerequisites** | Logged in as coach or analyst |
| **Steps** | 1. Open a player profile → verify "Injuries" tab is NOT visible. |
| **Expected** | Non-medical users cannot see the injuries tab. |
| **Pass/Fail** | [ ] |

### Story 14.2: Injury Timeline & Rehab Notes

#### TC-14.2-01: Timeline View

| Field | Value |
|---|---|
| **ACs Covered** | Timeline, severity dots, days out, active vs cleared |
| **Prerequisites** | Logged in as admin/physio, player with 2+ injuries (mix of active and cleared) |
| **Steps** | 1. Open player profile → Injuries tab. 2. Click "Timeline" toggle. 3. Verify vertical timeline with severity-colored dots (green=minor, amber=moderate, red=severe). 4. Verify active injuries have distinct red left border. 5. Verify days out counter shows for each injury. 6. Verify dates are DD/MM/YYYY. |
| **Expected** | Timeline renders chronologically with correct visual treatment. |
| **Pass/Fail** | [ ] |

#### TC-14.2-02: Rehab Notes CRUD

| Field | Value |
|---|---|
| **ACs Covered** | Rehab notes add/edit/delete, author, timestamp |
| **Steps** | 1. In Table view, expand an injury row (click chevron). 2. Add a rehab note → verify it appears with your name and timestamp. 3. Edit the note → verify updated text. 4. Delete the note → confirm → verify removed. 5. In Timeline view, expand an injury → verify same rehab notes functionality. |
| **Expected** | Full CRUD on rehab notes. Author name and DD/MM/YYYY HH:mm timestamp displayed. |
| **Pass/Fail** | [ ] |

### Story 14.3: RTP Workflow & Medical Dashboard

#### TC-14.3-01: RTP Status Dots on Player Cards

| Field | Value |
|---|---|
| **ACs Covered** | RTP dots, non-medical restriction |
| **Prerequisites** | Logged in as admin/physio, players with injuries at different statuses |
| **Steps** | 1. Navigate to `/players`. 2. Verify colored dots next to injured players: red (active), amber (rehab), blue (assessment). 3. Verify cleared/uninjured players have no dot. 4. Log in as coach → verify only generic red injury icon visible (no colored RTP dots). |
| **Expected** | Medical users see detailed RTP dots. Non-medical see only injured/available indicator. |
| **Pass/Fail** | [ ] |

#### TC-14.3-02: RTP Status Transitions

| Field | Value |
|---|---|
| **ACs Covered** | Status transition dialog, forward-only, re-injury |
| **Steps** | 1. Open an active injury → click "Change Status" in dropdown. 2. Verify dialog shows next step "Rehab" → confirm. 3. Repeat: Rehab → Assessment → Cleared. 4. On a cleared injury → click "Change Status" → verify "Report Re-injury" option. 5. Confirm → verify status returns to Active. |
| **Expected** | Forward-only transitions work. Re-injury from cleared to active works. Cannot skip steps. |
| **Pass/Fail** | [ ] |

#### TC-14.3-03: Medical Dashboard

| Field | Value |
|---|---|
| **ACs Covered** | 5 dashboard widgets, role restriction |
| **Steps** | 1. Navigate to `/dashboards/medical-overview` as admin or physio. 2. Verify Squad Availability % card with trend. 3. Verify Currently Injured table with player names, days out. 4. Verify Upcoming Returns list. 5. Verify Injury by Body Region bar chart. 6. Verify Injury by Type donut chart. 7. Log in as coach → navigate to same URL → verify access denied. |
| **Expected** | All 5 widgets render with mock data. Dashboard restricted to admin + physio. |
| **Pass/Fail** | [ ] |

### Story 14.4: Injury Access Control & Reports

#### TC-14.4-01: Injury Access Control by Role

| Field | Value |
|---|---|
| **ACs Covered** | canViewInjuryDetails, non-medical restriction |
| **Steps** | 1. Log in as admin → open player profile → verify Injuries tab visible with full clinical data. 2. Log in as physio → same → verify full access. 3. Log in as coach → verify Injuries tab NOT visible. 4. Log in as analyst → same. 5. On `/players` list, verify coach/analyst see only generic injured dot (no colored RTP status). |
| **Expected** | Admin + physio see full injury details. All other roles see only injured/available indicator. |
| **Pass/Fail** | [ ] |

#### TC-14.4-02: Injury Reports (Admin Only)

| Field | Value |
|---|---|
| **ACs Covered** | 3 report queries, reports page |
| **Prerequisites** | Logged in as admin, injuries exist in system |
| **Steps** | 1. Verify "Injury Reports" link in sidebar (admin only). 2. Click it → navigate to `/injuries/reports`. 3. Verify "Injuries by Player" table (player name, total injuries, days lost). 4. Verify "Injuries by Season" bar chart (football season Aug-Jul). 5. Verify "Injuries by Type" table (type, count, days lost, avg). 6. Log in as physio → verify "Injury Reports" link NOT in sidebar. 7. Navigate directly to `/injuries/reports` as physio → verify redirect. |
| **Expected** | Reports page shows 3 sections. Admin-only access (physio excluded). |
| **Pass/Fail** | [ ] |

---
