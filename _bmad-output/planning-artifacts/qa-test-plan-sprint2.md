# QA Manual Test Plan — Sprint 2

**Project:** Brain Analytics Platform
**Sprint:** Sprint 2 — Live Data, Staff Profiles & Injury Reporting
**Epics Covered:** 12 (Sprint 1 Polish), 13 (Staff Profiles), 14 (Injury Reporting), 15 (Live Data Integration)
**Date:** 2026-04-12
**Author:** QA Lead
**Status:** Complete — All tests PASS

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

### TC-12.1-01: Homepage Visual Parity & Dark Mode

| Field | Value |
|---|---|
| **Story** | 12.1 |
| **ACs Covered** | AC1, AC3, AC4, AC5 |
| **Steps** | 1. Navigate to `/`. 2. Check: match countdown has gradient header, VS divider, team logo placeholders with ring borders. 3. Check: recent results have colored W/D/L circle badges (green/gray/red). 4. Check: upcoming fixtures have Home/Away outline badges. 5. Check: quick access cards have icon hover-to-fill transition and arrow reveal on hover. 6. Check: recent/pinned dashboards have bordered cards with hover states. 7. Hover over buttons and links → verify pointer cursor. 8. Toggle dark mode → verify sidebar neutral tones (not blue-tinted), card backgrounds, teal accent. 9. Open browser DevTools → verify `--font-sans` resolves to `var(--font-manrope)` in computed styles. |
| **Expected** | Homepage matches original platform design. Dark mode palette correct. Pointer cursor on interactive elements. |
| **Pass/Fail** | PASS |

### TC-12.2-01: Calendar Navigation

| Field | Value |
|---|---|
| **Story** | 12.2 |
| **Steps** | 1. Navigate to `/calendar`. 2. Go forward to May, back to current month. 3. Go forward 2 months, back 2 months. 4. Verify no visual glitches, no duplicate events, no stale day labels. |
| **Expected** | Calendar renders cleanly after each navigation. |
| **Pass/Fail** | PASS |

### TC-12.2-02: Players Page Card Layout

| Field | Value |
|---|---|
| **Story** | 12.2 |
| **Steps** | 1. Navigate to `/players`. 2. Verify cards grouped by medical status: Available, Modified Training, Rehab, Injured. 3. Verify each card: gradient overlay, squad number watermark, medical status label, circular avatar, name, appearances stat connected to backend. 4. Verify empty groups are hidden. 5. Click a card → verify navigation to player profile. 6. Verify summary badges show medical status counts. |
| **Expected** | Card-based layout grouped by medical status. Appearances connected to backend. |
| **Pass/Fail** | PASS |

### TC-12.2-03: Nationality Dropdown & Date Format

| Field | Value |
|---|---|
| **Story** | 12.2 |
| **Steps** | 1. Navigate to `/players` → "Add Player". 2. Verify nationality is a searchable dropdown. 3. Type "Ita" → verify "Italy" appears. Type "Eng" → verify "England" (separate from UK). 4. After saving, verify dates are DD/MM/YYYY across: player DOB, stats log, fitness log, documents, calendar events, homepage fixtures. |
| **Expected** | Searchable country dropdown. All dates DD/MM/YYYY across the platform. |
| **Pass/Fail** | PASS |

### TC-12.3-01: Admin Edit Player Contact Info

| Field | Value |
|---|---|
| **Story** | 12.3 |
| **Steps** | 1. Open any player profile as admin. 2. Verify "Edit Contact Info" button visible in Bio tab. 3. Modify phone and email → save → verify updated. 4. Log in as non-admin → verify the edit button is NOT visible. |
| **Expected** | Admin can edit any player's contact info. Non-admin cannot. |
| **Pass/Fail** | PASS |

### TC-12.3-02: GDPR Player Deletion

| Field | Value |
|---|---|
| **Story** | 12.3 |
| **Prerequisites** | Create a test player with stats, fitness data, and a contract. |
| **Steps** | 1. Open the test player's profile. 2. Click "Delete Player". 3. Verify confirmation dialog requires typing the player's full name. 4. Type wrong name → delete button stays disabled. 5. Type correct name → "Permanently Delete". 6. Verify toast, redirect to `/players`, player gone from list. 7. Check Convex dashboard: no orphaned records. |
| **Expected** | Two-step confirmation. Cascade deletes all data. Player fully removed. Self-deletion blocked (covered by unit tests). |
| **Pass/Fail** | PASS |

---

## Epic 13: Staff Profiles & Directory

### TC-13.1-01: Create Staff Profile

| Field | Value |
|---|---|
| **Story** | 13.1 |
| **Steps** | 1. Verify "Staff" in sidebar. 2. Navigate to `/staff`. 3. Click "Add Staff" (admin only). 4. Fill in: name, job title, department (dropdown), phone, email, bio. All inputs on white background. 5. Submit → verify toast. 6. Verify invite dialog appears with option to send email or skip. 7. Close dialog → redirects to staff profile. 8. Navigate to `/staff` → verify staff appears in directory grouped by department with card design (gradient, colored border-top, department label). |
| **Expected** | Staff profile created, invite dialog shown, staff visible in directory grouped by department. |
| **Pass/Fail** | PASS |

### TC-13.1-02: View, Edit & Filter Staff

| Field | Value |
|---|---|
| **Story** | 13.1, 13.2 |
| **Steps** | 1. Click a staff card → profile page loads with 3 tabs (Overview, Certifications, Role Info). 2. Verify Overview shows all fields. 3. Click "Edit" → change job title → save → verify updated. 4. Back to `/staff` → filter by department → verify filtering (connected to Convex query). 5. Search by name → verify debounced results. 6. Combine department + search → verify both apply. 7. Resize browser → verify responsive grid (2/3/4/5 cols). |
| **Expected** | Profile displays and edits correctly. All filters work via Convex. Responsive layout. |
| **Pass/Fail** | PASS |

### TC-13.1-03: Non-Admin Staff Access

| Field | Value |
|---|---|
| **Story** | 13.1, 13.2 |
| **Prerequisites** | Logged in as non-admin (coach) |
| **Steps** | 1. Navigate to `/staff` → verify directory visible. 2. Verify "Add Staff" button NOT visible. 3. Click a card → verify profile viewable. 4. Verify "Edit" button NOT visible. 5. Verify only active staff are shown (non-admins cannot see inactive). |
| **Expected** | Non-admins can view but not create/edit staff. Only active staff visible. |
| **Pass/Fail** | PASS |

### TC-13.3-01: Certification CRUD & Status Badges

| Field | Value |
|---|---|
| **Story** | 13.3 |
| **Steps** | 1. Open staff profile → Certifications tab. 2. Add cert with expiry 1 year from now → verify green badge (Valid). 3. Add cert expiring in 15 days → verify amber badge (Expiring). 4. Add cert expired → verify red badge (Expired). 5. Edit a cert (change expiry) → verify update. 6. Delete a cert → verify removal. 7. Verify dates DD/MM/YYYY. |
| **Expected** | CRUD works. Color-coded status badges. European date format. |
| **Pass/Fail** | PASS |

### TC-13.3-02: Admin Expiry Alerts & Self-Service Certs

| Field | Value |
|---|---|
| **Story** | 13.3, 13.4 |
| **Steps** | 1. Navigate to `/staff` as admin → verify "Expiring Certifications" alert section with staff name, cert name, date. 2. Log in as non-admin → verify alert section NOT visible. 3. As a staff member with linked profile, navigate to own profile → Certifications. 4. Verify "Add Certification" visible. 5. Add a cert → verify it works. 6. Navigate to another staff member's certs → verify "Add" NOT visible. |
| **Expected** | Admin sees team-wide alerts. Staff can manage own certs only. |
| **Pass/Fail** | PASS |

### TC-13.4-01: Staff Self-Service Edit

| Field | Value |
|---|---|
| **Story** | 13.4 |
| **Prerequisites** | Logged in as staff member (non-admin) with linked profile (accepted invite) |
| **Steps** | 1. Navigate to own profile (sidebar "My Profile" or direct URL). 2. Verify "Edit Profile" button on Overview tab. 3. Click → verify form shows phone, email, bio only (no department/job title). 4. Modify phone and bio → save → verify updated. 5. Navigate to another staff profile → verify "Edit Profile" NOT visible. |
| **Expected** | Self-edit limited to phone/email/bio. Cannot edit others. |
| **Pass/Fail** | PASS |

### TC-13.4-02: Staff Deactivation & Directory Filtering

| Field | Value |
|---|---|
| **Story** | 13.4 |
| **Steps** | 1. As admin, open staff profile → click "Deactivate" → confirm. 2. Verify "Inactive" badge. 3. Navigate to `/staff` → verify inactive staff shows with muted styling (opacity-60). 4. Click "Reactivate" → verify status returns to Active. 5. Log in as non-admin → navigate to `/staff` → verify inactive staff NOT visible. 6. Verify "My Profile" sidebar link visible only for users with linked staff profiles. |
| **Expected** | Deactivation/reactivation works. Non-admins don't see inactive staff. Sidebar link conditional. |
| **Pass/Fail** | PASS |

---

## Epic 14: Injury Reporting

### TC-14.1-01: Log Injury with Clinical Classification

| Field | Value |
|---|---|
| **Story** | 14.1 |
| **Prerequisites** | Logged in as admin or physio, at least one player |
| **Steps** | 1. Open player profile → verify "Injuries" tab visible. 2. Click "Log Injury". 3. Verify form: date, injury type, severity, body region (20 options), mechanism (3 options), side (4 options), expected return date, notes. 4. Fill all fields → submit. 5. Verify injury in table with correct columns and "Active" red badge. 6. Log in as coach → verify Injuries tab NOT visible. |
| **Expected** | Injury created with clinical fields. Non-medical users excluded. |
| **Pass/Fail** | PASS |

### TC-14.1-02: RTP Status Transitions (via Edit Form)

| Field | Value |
|---|---|
| **Story** | 14.1 |
| **Steps** | 1. Edit an active injury → change status to Rehab → save → verify orange badge. 2. Edit → Assessment → yellow badge. 3. Edit → Cleared → green badge + actual return date auto-set. 4. Edit → back to Active (re-injury) → red badge. |
| **Expected** | All 4 statuses work via edit form. Auto-set return date on cleared. |
| **Pass/Fail** | PASS |

### TC-14.2-01: Timeline View & Rehab Notes

| Field | Value |
|---|---|
| **Story** | 14.2 |
| **Prerequisites** | Player with 2+ injuries (mix of active and cleared) |
| **Steps** | 1. Injuries tab → click "Timeline" toggle. 2. Verify vertical timeline with severity-colored dots (green/amber/red). 3. Verify active injuries have red left border, cleared don't. 4. Verify days out counter and DD/MM/YYYY dates. 5. Verify summary stats bar at top (total injuries, total days lost, currently active, avg recovery). 6. Switch to Table view → expand an injury (chevron). 7. Add a rehab note → verify it appears with name and timestamp. 8. Edit the note → verify update. 9. Delete the note → verify removal. |
| **Expected** | Timeline and table views both work. Rehab notes CRUD functional. |
| **Pass/Fail** | PASS |

### TC-14.3-01: RTP Status Dots & Transitions (via Dialog)

| Field | Value |
|---|---|
| **Story** | 14.3 |
| **Prerequisites** | Players with injuries at different statuses |
| **Steps** | 1. Navigate to `/players` as admin/physio → verify colored dots (red/amber/blue) next to injured players. 2. Log in as coach → verify only generic red dot (no colored RTP). 3. As admin, open injury → "Change Status" in dropdown → verify dialog shows next step → confirm. 4. Walk through: Active → Rehab → Assessment → Cleared. 5. On cleared injury → "Change Status" → verify "Report Re-injury" → confirm → back to Active. |
| **Expected** | Medical see detailed dots, others see generic. Forward-only transitions via dialog. |
| **Pass/Fail** | PASS |

### TC-14.3-02: Medical Dashboard

| Field | Value |
|---|---|
| **Story** | 14.3 |
| **Steps** | 1. Navigate to `/dashboards/medical-overview` as admin. 2. Verify: Squad Availability % card, Currently Injured table, Upcoming Returns list, Injury by Region bar chart, Injury by Type donut chart. 3. Log in as coach → same URL → verify access denied. |
| **Expected** | 5 widgets render with real Convex data. Restricted to admin + physio. |
| **Pass/Fail** | PASS |

### TC-14.4-01: Injury Reports (Admin Only)

| Field | Value |
|---|---|
| **Story** | 14.4 |
| **Steps** | 1. Verify "Injury Reports" in sidebar (admin only). 2. Navigate to `/injuries/reports`. 3. Verify: Injuries by Player table, Injuries by Season bar chart (Aug-Jul), Injuries by Type table. 4. Log in as physio → verify link NOT in sidebar. 5. Navigate directly → verify redirect. |
| **Expected** | 3 report sections. Admin-only (physio excluded). |
| **Pass/Fail** | PASS |

---
