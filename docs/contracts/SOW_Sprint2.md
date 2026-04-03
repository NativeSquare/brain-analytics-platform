# SPRINT STATEMENT OF WORK

## Sprint 2 — Live Data, Staff Profiles & Injury Reporting

| | |
|---|---|
| **Provider** | NativeSquare SAS |
| **Client** | Brain Analytics Ltd |
| **Project** | Football Club Management Platform |
| **Sprint** | Sprint 2 — Live Data, Staff Profiles & Injury Reporting |
| **Sprint Fee** | To be confirmed |
| **Duration** | 10 business days from Double Key |
| **Staging Environment** | Same staging environment as Sprint 1, updated with Sprint 2 deliverables |
| **Governing Agreement** | Sprint Engagement Agreement between NativeSquare SAS and Brain Analytics Ltd |

---

## 1. Sprint Overview

This Sprint has three objectives:

1. **Connect live data** — Replace the mock data used during Sprint 1 development with real API connections to StatsBomb, SportMonks, and Wyscout/Hudl. Verify that all 13 analytics dashboards, video playback, homepage widgets, and fixture data work correctly with production data. Activate Google OAuth and configure the MUX video cache for production use.

2. **Staff Profiles & Directory** — Build a structured staff management module (originally planned for Sprint 1, swapped with Document Hub). Staff members get profiles with bios, job titles, qualifications, and certification tracking. A club directory provides a central place for everyone to find contact information.

3. **Injury Reporting** — Build a comprehensive injury management system extending the basic injury logging delivered in Sprint 1 (Story 5.5). This includes clinical classification, visual timeline tracking, rehab notes, return-to-play workflows, and a medical dashboard.

Additionally, any corrections or adjustments identified during the Sprint 1 Demo will be addressed at the beginning of this Sprint.

---

## 2. Functional Requirements

### Phase 1 — Sprint 1 Polish & Live Data Integration

| Functional Requirement | Description |
|---|---|
| Sprint 1 Fixes | Address any bugs or UX adjustments identified during the Sprint 1 Demo or client feedback |
| StatsBomb Live Connection | Connect to the real StatsBomb PostgreSQL database, verify all 37 SQL queries return correct data, validate all dashboards render correctly |
| SportMonks Live Connection | Connect to the real SportMonks PostgreSQL database, verify fixtures, scores, and standings display correctly on the homepage and dashboards |
| Wyscout/Hudl Video Integration | Verify video clip playback works end-to-end: Wyscout API → video URL → player. Test across Shot Map, Event Map, Set Pieces, and View Possessions dashboards |
| MUX Video Cache | Activate MUX video caching for production use. Verify first-view upload, subsequent-view cache hit, and graceful fallback when MUX is unavailable |
| Google OAuth Activation | Configure Google OAuth credentials in the production environment. Verify sign-in flow and invitation-gate (uninvited emails rejected) |
| OpenAI Contract Extraction | Configure OpenAI API key for production. Verify PDF upload → AI extraction → structured data display for real player contracts |
| End-to-End Smoke Test | Complete walkthrough of every dashboard with real data, verifying data accuracy, chart rendering, and video playback |

### Phase 2 — Feature 4: Staff Profiles & Directory

Build a staff management module giving every non-player team member a structured profile and providing a central directory for the whole club.

| Functional Requirement | Description |
|---|---|
| Staff Profile Creation | Admin can create staff profiles with: full name, photo, job title, department, phone, email, bio, and date joined |
| Staff Directory | Searchable, filterable directory listing all staff members with photo, name, title, and department. Accessible to all authenticated users |
| Role Assignment | Admin can assign platform roles (Coach, Analyst, Physio, Staff) to staff members, controlling their access across the platform |
| Certification Tracking | Admin or staff member can log professional certifications (e.g., UEFA coaching license, first aid) with issue date and expiry date |
| Certification Expiry Alerts | System displays visual indicators for certifications expiring within 30 days and expired certifications. Admins see a summary view |
| Staff Self-Service | Staff members can view and edit their own profile (contact info, bio, certifications). Cannot change their own role or department |
| Staff Deactivation | Admin can deactivate staff members. Deactivated staff lose platform access but their profile remains visible to admins |

### Phase 3 — Feature 5: Injury Reporting

Build a comprehensive injury management system for the medical team, extending the basic injury logging from Sprint 1.

| Functional Requirement | Description |
|---|---|
| Clinical Classification | Injuries are classified by: body region, injury type, severity (Minor/Moderate/Severe), mechanism (contact/non-contact/overuse), and side (left/right/bilateral) |
| Injury Timeline | Visual timeline showing injury history per player: injury date, expected return, actual return, total days out. Color-coded by severity |
| Rehab Notes | Medical staff can add timestamped rehab notes to each injury record, tracking progress and treatment |
| Return-to-Play Status | Each injury has a status workflow: Active → Rehab → Return-to-Play Assessment → Cleared. Color-coded badges visible on player cards |
| Medical Dashboard | Dedicated dashboard for medical staff showing: currently injured players, upcoming return dates, injury frequency by type/region, and squad availability percentage |
| Injury Reports | Admins can generate summary reports: injuries per player, injuries per season, time lost per injury type |
| Access Control | Injury details visible only to medical staff and admins. Non-medical users see only a status indicator (injured/available) on player cards |

---

## 3. Assumptions & Dependencies

- The Client will provide production API credentials for StatsBomb, SportMonks, Wyscout, and MUX before the Sprint begins.
- The Client will provide Google OAuth credentials (Client ID and Secret) for production use.
- The Client will provide an OpenAI API key for contract extraction, or confirm that mock extraction is acceptable for production.
- The Client will designate a primary point of contact available to answer questions and provide feedback within two (2) business days.
- WhatsApp notification integration remains out of scope (Sprint 3).
- Scouting Reports and Shadow Teams remain out of scope (Sprint 3).

---

## 4. Deliverables

At the conclusion of this Sprint, the Provider will deliver:

- All 13 analytics dashboards verified and working with real production data
- Video playback functional across all relevant dashboards
- Google OAuth sign-in operational
- AI contract extraction operational with real PDFs
- A fully functional Staff Profiles & Directory module deployed to the staging environment
- A fully functional Injury Reporting module deployed to the staging environment
- A Sprint Demo session walking the Client through the completed work

---

## 5. Signatures

By signing below, both Parties confirm their agreement to the scope, functional requirements, and assumptions described in this SOW. This SOW is governed by the Sprint Engagement Agreement between NativeSquare SAS and Brain Analytics Ltd.

| For NativeSquare SAS | For Brain Analytics Ltd |
|---|---|
| Name: Maxime Gey | Name: Remi Vincent |
| Title: Founder | Title: COO |
| Date: ________________ | Date: ________________ |
| Signature: | Signature: |
