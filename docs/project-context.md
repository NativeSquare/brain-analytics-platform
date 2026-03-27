# Project Context — Brain Analytics Platform

## Project Overview

Brain Analytics Platform is a multi-tenant football operations platform built for professional football clubs. The primary client is **BrainAnalytics Ltd** (COO: Remi Vincent), deployed for **UC Sampdoria** (Serie B). The platform centralizes day-to-day club operations: scheduling, document management, player management, and (in future sprints) scouting, injury reporting, and staff management.

This is a **greenfield rebuild**. An existing platform exists (Next.js + Supabase, found in `docs/reference/` for reference only) but we are rebuilding from scratch using the NativeSquare monorepo template with **Convex** as the backend.

## Client & Stakeholders

| Person | Role | Context |
|--------|------|---------|
| **Ryan Aston** | Technical point of contact at BrainAnalytics | Responds quickly, gives clear actionable feedback. He is the person to go to for product questions. He validated the Sprint 1 scope on 2026-03-25. |
| **Remi Vincent** | COO at BrainAnalytics | Initial project scoping via Upwork. Provided the 8-feature priority list. |
| **Maxime Gey** | Founder at NativeSquare | Handled initial sales and proposal. Not involved in implementation. |
| **Alex** | Developer at NativeSquare | Assigned to execute the project. Was not involved in the initial scoping. |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Monorepo** | Turborepo + pnpm |
| **Admin app** | Next.js (`apps/admin`) |
| **Client app** | Next.js (`apps/web`) |
| **Mobile app** | Expo (`apps/native`) — not in Sprint 1 scope |
| **Backend** | Convex (`packages/backend`) |
| **Shared code** | `packages/shared` |
| **UI components** | shadcn/ui with custom theme preset |
| **Styling** | Tailwind CSS |
| **Auth** | Built into the template (email/password) |

### Why Convex (not Supabase)

The client's existing platform uses Supabase. We chose Convex for the rebuild because:
- **Real-time by default**: every query is a live subscription. Features like the "What's on Today" TV display and the notification center work without extra engineering.
- **End-to-end type safety**: from database schema to frontend queries, reducing bugs.
- **Access control in the data layer**: role-based permissions are enforced in Convex mutations/queries, not just in the UI.
- **Cost parity**: comparable pricing at this scale.

The client was initially hesitant about the migration (Remi's message on March 12: "I don't think the Convex migration is necessary unless you believe it would bring significant benefits"). We justified it in the Sprint 1 scope document and it was accepted.

## Sprint 1 Scope (Current)

Sprint 1 delivers three operational modules that replace manual workflows (spreadsheets, shared drives, WhatsApp groups):

### Module 1: Calendar & Scheduling
- Month view with color-coded event types (Match, Training, Meeting, Rehab)
- Event creation (admin-only) with start/end time, location, description
- Full recurrence (daily, weekly, bi-weekly, monthly) with per-occurrence editing
- RSVP tracking (toggleable per event) with absence reasons
- Invitations by role OR by individual user
- .ics feed URL for Google/Apple Calendar sync
- "What's on Today" full-screen TV display (real-time via Convex)
- In-app notification center (bell icon)

### Module 2: Document Hub
- Two-level folder structure (categories + subfolders), admin-managed
- File upload (PDF, images, spreadsheets) + video links
- File replacement from detail view
- Granular permissions: by role AND by individual user
- Read tracking with admin-visible open counts ("Opened by 18/25")
- Search and filtering by name, type, folder

### Module 3: Player Profiles
- Comprehensive bio (photo, DOB, nationality, position, squad number, foot, height, weight, contacts, emergency contacts)
- Performance stats log (per match, manual input: date, opponent, minutes, goals, assists, cards)
- Physical/fitness data log (date, weight, body fat %, notes)
- Injury history (medical staff access only, current + historic)
- External provider ID linking (admin config, for future GPS/performance data import)
- Contract management (admin-only): upload PDF, AI extraction of salary/bonuses/clauses/duration/termination
- Player self-service: view own profile, edit own contacts
- Statuses: Active, On Loan, Left the Club (with account deactivation/reactivation)
- Onboarding workflow (admin creates profile, invites player by email)

### Key Decisions Already Made

| Decision | Details |
|----------|---------|
| Event creation | Admin-only |
| RSVP | Toggleable per event (Ryan's request) |
| Event invitations | By role + by individual user (Ryan's request) |
| "Alumni" | Renamed to "Left the Club" + separate "On Loan" status (Ryan's request) |
| Injury history | Medical staff access only (Ryan's request) |
| External providers | Config section on player profile (Ryan's request, for future integration) |
| Document sharing | By role + by individual user (Ryan's request) |
| Notifications | In-app only (WhatsApp explicitly out of scope per SOW) |
| Calendar sync | .ics feed URL (read-only, no CalDAV) |
| Document versioning | Simple replace, no version history |
| Design | Carte blanche, shadcn/ui, desktop-first |
| Mobile | Basic responsive only, not a priority |

## RBAC Model

| Role | Calendar | Documents | Players | Contracts | Injuries | Admin |
|------|----------|-----------|---------|-----------|----------|-------|
| Admin | Full CRUD | Full CRUD + permissions | Full CRUD | View + Upload | View summary | Full access |
| Coach | View + RSVP | View (role-permitted) | View profiles + stats | Hidden | View summary | No access |
| Analyst | View + RSVP | View (role-permitted) | View profiles + stats | Hidden | No access | No access |
| Physio/Medical | View + RSVP | View (role-permitted) | View profiles | Hidden | Full CRUD | No access |
| Player | View + RSVP | View (role-permitted) | Own profile only (edit contacts) | Own contract only | Hidden | No access |
| Staff | View + RSVP | View (role-permitted) | View profiles | Hidden | No access | No access |

## Future Sprints (Out of Scope for Sprint 1)

Features 4-8 from the client's priority list, in order:

1. **Staff Profiles & Directory** — Bios, certifications with 30-day expiry alerts, club directory for players
2. **Injury Reporting** (full module) — Orchard Codes, mechanism of injury, color-coded status (Red/Yellow/Green), rehab tracking. More comprehensive than Sprint 1's injury history.
3. **Scouting Reports** — Target grading, media, Sign/Watch/Pass recommendations, mobile-friendly
4. **Scouting Shadow Teams** — Visual pitch view, position ranking, drag-and-drop
5. **WhatsApp Notifications** — Automated triggers, manual broadcasts, opt-in/out

Long-term vision: multi-club SaaS productization, AI-powered scouting, advanced analytics integration, white-label deployment, dedicated player mobile app (Expo).

## Existing Platform Reference

The client's existing platform (`football-dashboard-2`) is documented in `docs/reference/` for reference only. Key things to know:

- **Database schema**: `docs/reference/existing-database-schema.md` documents the full Supabase schema (tables, columns, RLS policies). Use this as a reference when designing Convex schemas, but do NOT replicate it directly. Adapt to Convex patterns.
- **Screenshots**: `docs/reference/screenshots/` shows the current UI. Our design is independent (carte blanche) but these show what the client is used to.
- **Data sources**: The existing platform integrates with StatsBomb (PostgreSQL), Wyscout, Sportmonks, and Hudl for analytics data. These integrations are NOT in Sprint 1 scope. The analytics dashboards on the homepage should show placeholder content.

## Contract & SOW

- **Sprint Engagement Agreement**: `docs/contracts/Sprint_Engagement_Agreement.pdf`
- **Sprint 1 SOW**: `docs/contracts/SOW_Sprint1.pdf`
- Sprint fee and duration: 10 business days from contract signature
- Deliverables: 3 functional modules + professional UI + Sprint Demo session
- Staging environment: new, separate from production, seeded with mock data

## Planning Artifacts

All planning documents are in `_bmad-output/planning-artifacts/`:

- **prd.md** — Full Product Requirements Document (39 FRs, 14 NFRs)
- **epics.md** — Epic and story breakdown (6 epics, 21 stories with Given/When/Then acceptance criteria)
- **sprint1-scope-clarification.md** — The scope document sent to and approved by the client

## Implementation Notes

### Auth
The monorepo template includes authentication (email/password) out of the box. For this project, extend it with:
- Role-based access control (RBAC) with 6 role types
- Team-scoped data isolation (multi-tenant)
- Admin invitation flow (invite by email, assign role)
- Player onboarding (admin creates profile, sends account invite)

### Design System
The template uses shadcn/ui. For this project:
- Apply the custom theme preset (see `docs/reference/theme.txt` for the shadcn theme config)
- Build reusable components: event type badges, player status badges, read tracking indicators, folder breadcrumbs, notification center

### Data Model Strategy
Create Convex tables as needed per story, not upfront. Each story that introduces new data should define its schema in the acceptance criteria. Reference `docs/reference/existing-database-schema.md` for field naming inspiration but adapt to Convex conventions.

### AI Contract Extraction
The existing platform uses a Gemini-based pipeline to extract structured data from contract PDFs. This needs to be reproduced. Check the existing implementation in `docs/reference/` for the extraction fields: salary, bonuses, clauses, duration, termination terms, governing law.

## Communication Preferences

- Alex (the developer) speaks French. Claude should communicate in French.
- All documents and code artifacts are written in English.
- Client-facing documents should be professional, positive, and never frame things negatively ("we don't do X"). Only describe what IS being built.
- Do not use em-dashes in documents.
- Lead design and technical decisions. Only ask the client when fundamentally blocked.
- The client contact for questions is Ryan Aston.
