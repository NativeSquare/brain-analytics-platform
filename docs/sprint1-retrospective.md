# Sprint 1 — Retrospective & Coverage Report

## SOW Sprint 1 Scope vs Delivered

### Feature 1 — Calendar & Scheduling

| SOW Requirement | Status | Notes |
|---|---|---|
| Month View | DONE | Schedule-X v4, color-coded event types (Match/Training/Meeting/Rehab) |
| Event Creation | DONE | One-off + recurring (daily/weekly/bi-weekly/monthly) with series end date |
| Group Invitations | DONE | Role-based invitations + individual user invitations |
| RSVP Tracking | DONE | Attending/Not Attending with absence reason, admin RSVP overview |
| "What's on Today" View | DONE | Full-screen TV display at `/calendar/today`, real-time updates |
| Calendar Sync | DONE | Personal .ics feed URL, compatible with Google/Apple Calendar |
| Notifications | DONE | In-app notifications on event create/update/cancel, bell icon with unread count, full notifications page |

### Feature 2 — Document Hub

| SOW Requirement | Status | Notes |
|---|---|---|
| Folder Structure | DONE | Two-level folder hierarchy, admin CRUD on categories and subfolders |
| File Upload & Management | DONE | PDF, images, spreadsheets, video links. Upload, replace, delete |
| Role-Based Permissions | DONE | 3 sharing modes: Private / Specific roles / Specific people (Story 4.6) |
| Read Tracking | DONE | "Opened by X/Y" for admins, detailed who-opened popover |
| Search & Browse | DONE | Real-time search by name/type/folder, browse with breadcrumbs |
| Download | DONE | Signed URLs, secure download |

### Feature 3 — Player Profiles

| SOW Requirement | Status | Notes |
|---|---|---|
| Player Bio & Info | DONE | Full profile with photo, DOB, nationality, position, contacts, emergency contacts |
| Performance Stats | DONE | Per-match stats log (goals, assists, minutes, cards), admin input |
| Physical & Fitness Data | DONE | Fitness log entries (weight, body fat, notes), admin/physio input |
| Contract Management | DONE | Upload PDF, AI extraction (mock mode + OpenAI ready), admin-only, player self-view |
| Player Onboarding | DONE | Admin creates profile → sends email invitation → player creates account |
| Alumni Archive | DONE | Status management: Active / On Loan / Left the Club. Deactivation on "Left" |
| Player Self-Service | DONE | Players view own profile/stats/contract, edit own contact info |

### SOW Assumptions Respected

| Assumption | Status |
|---|---|
| WhatsApp notifications out of scope | Respected — not implemented |
| Scouting Reports out of scope | Respected — not implemented |
| Shadow Teams out of scope | Respected — not implemented |
| Staff Profiles out of scope | Respected — moved to Sprint 2 (swapped with Document Hub) |
| Role-based access control | DONE — RBAC across all features, 17 unit tests on auth hooks |

### Beyond SOW — Additional Deliverables

These features were not in the original SOW but were identified as necessary to match the existing platform's capabilities:

| Epic | What was delivered |
|---|---|
| Epic 7: Design System Alignment | OKLCH palette, Avenir Next typography, pitch visualization components, Recharts integration, dashboard cards |
| Epic 8: External Data Integrations | StatsBomb (PostgreSQL, 37 queries), SportMonks (fixtures/scores), Hudl/Wyscout (video clips) — all via Next.js API routes |
| Epic 9: Analytics Core (5 dashboards) | Dashboard gallery with role-based access, Season Overview, Post-Match Analysis, Shot Map, Heat Maps |
| Epic 10: Analytics Advanced (8 dashboards) | Event Map, Player Analysis, Set Pieces, Opposition Analysis, Team Trends, Referee Analysis, View Possessions, Post-Match Set Pieces |
| Epic 11: Cross-Cutting | Global search (Cmd+K), Google OAuth (ready, pending credentials), enriched homepage with SportMonks data, consolidated RBAC hooks, i18n English/Italian |

### Module Swap Note

The original Sprint 1 SOW listed "Staff Profiles & Directory" as in-scope. During planning, this was swapped with "Document Hub" — Document Hub was moved from Sprint 2 into Sprint 1, and Staff Profiles was deferred to Sprint 2. This was agreed upon with the client.

---

## Test Coverage Summary

- **526 unit tests** passing (backend)
- **25 QA manual test cases** — 23 PASS, 2 PARTIAL (video without Wyscout env vars), 2 BLOCKED (Google OAuth credentials)
- **4 calendar regression tests** — all PASS (including recurring event duplication fix)
