---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments: ['_bmad-output/planning-artifacts/sprint1-scope-clarification.md', 'conversation.md', 'SOW_Sprint1_BrainAnalytics (1) (1).pdf', 'NativeSquare_x_BrainAnalytics_Sprint_Engagement_Agreement_signed (2).pdf']
workflowType: 'prd'
classification:
  projectType: saas_b2b
  domain: sports_operations
  complexity: low-medium
  projectContext: greenfield
---

# Product Requirements Document - BrainAnalytics Football Operations Platform

**Author:** Alex
**Date:** 2026-03-25

## Executive Summary

BrainAnalytics is a multi-tenant football operations platform built for professional football clubs. The platform centralizes day-to-day club operations into a single dashboard: scheduling, document management, and player management. It is currently deployed for UC Sampdoria and designed to scale to additional clubs.

The platform replaces fragmented workflows (spreadsheets, shared drives, WhatsApp groups, paper forms) with a structured, role-aware system where every user sees only what is relevant to their role. Admins manage the club's operational data. Coaches and staff access tactical and organizational documents. Medical staff track injuries and fitness. Players view their own profiles and respond to calendar events.

The current platform exists as a Next.js + Supabase application with a focus on analytics dashboards (StatsBomb, Wyscout, Sportmonks integrations). Sprint 1 extends the platform into club operations territory with three new modules: Calendar & Scheduling, Document Hub, and Player Profiles. The rebuild uses Convex as the backend, providing real-time updates across all screens and end-to-end type safety.

### What Makes This Special

This is not a generic project management tool adapted to football. It is purpose-built for the specific workflows of a professional football club's daily operations. The role-based access model maps directly to how clubs are structured (Admin, Coach, Analyst, Physio, Medical, Player), and every feature is designed around the real people who will use it: a physio logging an injury pitch-side, a coach checking tomorrow's schedule on the dressing room TV, a player confirming attendance from their phone.

The long-term vision includes AI-powered features (contract extraction, scouting reports) and integration with external data providers (GPS trackers, performance platforms), positioning the platform as a productizable solution for any professional club.

## Project Classification

| Attribute | Value |
|-----------|-------|
| Project Type | SaaS B2B |
| Domain | Sports Operations (Football) |
| Complexity | Low-Medium |
| Project Context | Greenfield (rebuild from existing platform) |
| Client | BrainAnalytics (deployed for UC Sampdoria) |

## Success Criteria

### User Success

Admins can manage the club's calendar, documents, and player roster from a single interface without switching between tools. Staff and coaches find relevant documents and schedules without asking colleagues. Players can check their schedule and profile without contacting admin staff. Medical staff can log and track injuries with restricted visibility.

### Business Success

Sprint 1 delivers three fully functional modules (Calendar, Document Hub, Player Profiles) that replace the current manual workflows. The platform architecture supports future sprints covering Staff Profiles, Injury Reporting, Scouting Reports, Scouting Shadow Teams, and WhatsApp Notifications (features 4-8 from the client's priority list). The multi-tenant data model supports onboarding additional clubs without code changes.

### Technical Success

Real-time updates across all connected clients via Convex subscriptions. Role-based access control enforced at the data layer (not just UI). Convex data models replicate the security guarantees of the existing Supabase RLS policies. Desktop-first responsive UI with clean, modern design.

### Measurable Outcomes

- All Sprint 1 SOW deliverables completed and demonstrated
- Admin can create, edit, and delete calendar events (one-off and recurring)
- Users can RSVP to events and sync calendar to personal devices
- Admin can upload, organize, and permission documents across a folder structure
- Admin can onboard players, manage profiles, log stats and fitness data
- Contract PDFs are processed with AI extraction (salary, bonuses, clauses)
- Medical staff can view and manage injury history (restricted access)
- Real-time updates visible across concurrent sessions

## Product Scope

### MVP (Sprint 1)

**Calendar & Scheduling**
- Month view calendar with color-coded event types (Match, Training, Meeting, Rehab)
- Event creation (admin-only) with start/end time, location, description
- Full recurrence support (daily, weekly, bi-weekly, monthly) with series end date
- Per-occurrence editing and cancellation
- RSVP tracking with optional disable per event
- Event sharing by role or by individual user
- .ics feed URL for Google Calendar / Apple Calendar sync
- "What's on Today" full-screen TV display (real-time)
- In-app notification center (bell icon) for event lifecycle

**Document Hub**
- Two-level folder structure (categories + subfolders), admin-managed
- File upload (PDF, images, spreadsheets) and video links
- File replacement from document detail view
- Role-based and user-specific sharing permissions
- Read tracking with admin-visible open counts
- Search and filtering by name, type, folder

**Player Profiles**
- Player bio section (photo, DOB, nationality, position, squad number, preferred foot, height, weight, phone, email, address, emergency contacts)
- Performance stats log (per match, manually entered: date, opponent, minutes, goals, assists, cards)
- Physical/fitness data log (date, weight, body fat %, notes)
- Injury history (current and historic, medical staff access only)
- External provider ID linking (admin config, for future data import)
- Contract management (admin-only, hidden from non-admins)
- AI-powered contract PDF extraction (salary, bonuses, clauses, duration, termination)
- Player self-service (view own profile, edit contact info and emergency contacts)
- Player statuses: Active, On Loan, Left the Club
- Player onboarding workflow (admin creates player, invites via email)

**Infrastructure**
- Convex backend (replacing Supabase)
- Data model migration from existing Supabase schemas
- Role-based access control in Convex mutations/queries
- Multi-tenant team isolation
- Homepage replicating current structure with new modules integrated

### Growth Features (Post-MVP, Sprints 2-4)

- Staff Profiles & Directory (bios, certifications with expiry alerts, club directory for players)
- Injury Reporting module (Orchard Codes, mechanism of injury, color-coded status, rehab tracking)
- Scouting Reports (target grading, media attachments, Sign/Watch/Pass recommendations)
- Scouting Shadow Teams (visual pitch view, position-based ranking, drag-and-drop)
- WhatsApp Notifications (automated triggers, manual broadcasts, opt-in/out)
- External data provider integrations (GPS, performance platforms)
- Mobile-optimized views for pitch-side and on-the-go usage

### Vision (Future)

- Multi-club SaaS productization
- AI-powered scouting analysis
- Advanced analytics integration (StatsBomb, Wyscout dashboards connected to player profiles)
- White-label deployment for other clubs
- Player-facing mobile app (Expo)

## User Journeys

### Journey 1: The Admin Sets Up the Week

Marco is the club's operations admin. It's Sunday evening and he needs to prepare the week's schedule. He opens the platform, navigates to Calendar, and creates the week's events: Monday morning training at the Mugnaini training ground, a Tuesday team meeting in the video room, Wednesday recovery session, Thursday tactical training, and Saturday's Serie B match against Brescia.

For the Monday training, he sets it as recurring (every Monday, 9:00-11:00) and invites the "First Team" and "Coaching Staff" roles. For the Saturday match, he creates a one-off Matchday event and invites all roles. He disables RSVP on the match since attendance is mandatory.

Each event triggers an in-app notification. Players and staff see the new events appear on their calendars instantly. The dressing room TV showing the "What's on Today" page updates in real-time as Marco adds events.

Marco then uploads this week's tactical playbook PDF to Documents > Playbooks > Attacking, sharing it with Coach and Player roles. He replaces last week's nutrition plan with the updated version in Documents > Nutrition.

### Journey 2: The Player Checks Their Week

Luca is a midfielder. He opens the platform on his laptop Monday morning and sees today's events on the homepage: "Training 09:00-11:00, Mugnaini." He taps into the Calendar to see the full week ahead. He notices Tuesday's team meeting and confirms his RSVP.

He checks Documents and sees a new playbook has been shared. He opens it and reviews the attacking patterns for the upcoming match.

He navigates to his Player Profile to update his phone number (he just changed carriers). He can see his recent match stats (entered by the coaching staff after each game), his fitness metrics, and his contract details. He edits his phone number and emergency contact, saves, and he's done.

### Journey 3: The Physio Logs an Injury

During Thursday training, right-back Davide pulls his hamstring. Sofia, the team physio, opens the platform immediately. She navigates to Davide's player profile and goes to the Injury History section (visible only to medical staff). She logs the injury: date, type (hamstring strain), severity, estimated recovery time, and initial notes.

Over the following days, Sofia updates the injury log with rehab progress notes. The coaching staff can see Davide's status has changed (they see "Active" change to the injury indicator on the player list), but they cannot access the detailed medical notes.

When Davide is cleared to return, Sofia updates the status and logs the clearance date. The full injury history remains on his profile for future reference.

### Journey 4: The Admin Manages Contracts

Marco receives the signed contract PDF for a new signing. He goes to the player's profile, opens the Contract tab (visible only to admins), and uploads the PDF. The AI extraction pipeline processes the document and automatically pulls out key terms: contract duration, salary, performance bonuses, release clauses, and termination conditions.

Marco reviews the extracted data for accuracy. The structured contract information is now searchable and visible alongside the player's profile, without anyone needing to manually copy data from the PDF.

### Journey 5: The Coach Prepares for a Match

Coach Andrea opens the platform on Friday. On the homepage, he sees tomorrow's match against Brescia highlighted. He goes to Documents > Playbooks to review the tactical plan. He checks the Player list to see who is available: he can see player statuses at a glance (Active, On Loan, or any injury indicators). He opens a few player profiles to review their recent performance stats and form.

He notices one player is marked as "On Loan" with a visible indicator. He opens the calendar to confirm the pre-match meeting time and location. Everything he needs is in one place.

## User Journeys Requirements Summary

| Journey | Capabilities Revealed |
|---------|----------------------|
| Admin Sets Up the Week | Event CRUD, recurrence, role/user invitations, RSVP toggle, notifications, document upload, file replacement, folder management |
| Player Checks Their Week | Homepage events widget, calendar browsing, RSVP submission, document access, profile viewing, contact self-edit |
| Physio Logs Injury | Injury history CRUD (medical-only), status visibility to non-medical, recovery tracking |
| Admin Manages Contracts | Contract upload, AI PDF extraction, admin-only visibility, structured data display |
| Coach Prepares for Match | Player list with status indicators, performance stats review, document browsing, calendar viewing |

## SaaS B2B Specific Requirements

### Multi-Tenancy

Each club operates as an isolated tenant. All data (events, documents, players, profiles) is scoped to a `teamId`. No data leaks between tenants. The data model supports onboarding new clubs by creating a new team record and inviting the club's admin.

### Role-Based Access Control (RBAC)

| Role | Calendar | Documents | Players | Contracts | Injuries | Admin |
|------|----------|-----------|---------|-----------|----------|-------|
| Admin | Full CRUD | Full CRUD + permissions | Full CRUD | View + Upload | View summary | Full access |
| Coach | View + RSVP | View (role-permitted) | View profiles + stats | Hidden | View summary | No access |
| Analyst | View + RSVP | View (role-permitted) | View profiles + stats | Hidden | No access | No access |
| Physio/Medical | View + RSVP | View (role-permitted) | View profiles | Hidden | Full CRUD | No access |
| Player | View + RSVP | View (role-permitted) | Own profile only (edit contacts) | Own contract only | Hidden | No access |
| Staff | View + RSVP | View (role-permitted) | View profiles | Hidden | No access | No access |

Access control is enforced at the Convex query/mutation layer, not just in the UI.

### Subscription Model

Out of scope for Sprint 1. The platform is deployed for a single client (BrainAnalytics/Sampdoria). Multi-club pricing and subscription tiers are future considerations.

## Project Scoping & Phased Development

### MVP Strategy

Problem-solving MVP: deliver the three operational modules that replace the most painful manual workflows (calendar coordination, document chaos, player data scattered across spreadsheets). Validate that club staff actually adopt the platform for daily operations before building more advanced features.

### Resource Requirements

- 1 full-stack developer (Alex)
- NativeSquare monorepo template (Next.js admin + client apps, Expo mobile app, Convex backend, shared package)
- Sprint 1 duration: 2 weeks

### Risk Mitigation

**Technical:** Convex data model migration from Supabase is well-understood; existing schemas are documented in DATABASE_SCHEMA.md. AI contract extraction requires reproducing the existing Gemini-based pipeline.

**Scope:** Features 4-8 from the client's priority list (Staff Profiles, Injury Reporting, Scouting Reports, Shadow Teams, WhatsApp) are explicitly out of Sprint 1 scope. Injury history within player profiles is in scope as a lighter version.

**Client expectations:** Sprint 1 scope clarification document has been reviewed and approved by Ryan Aston (2026-03-25). All implementation decisions are documented and shared.

## Functional Requirements

### Calendar Management

- FR1: Admin can create one-off calendar events with name, type (Match/Training/Meeting/Rehab), start time, end time, location, and description
- FR2: Admin can create recurring events (daily, weekly, bi-weekly, monthly) with a series end date
- FR3: Admin can modify or cancel individual occurrences of a recurring series without affecting other occurrences
- FR4: Admin can invite entire roles or specific individual users to an event
- FR5: Admin can enable or disable RSVP on a per-event basis
- FR6: Users with access can view events on a month-view calendar with color-coded event types
- FR7: Users can submit RSVP responses (Attending / Not Attending) with an optional reason for absence
- FR8: Users can generate a personal .ics feed URL to subscribe in external calendar apps
- FR9: The "What's on Today" page displays all events for the current day in a full-screen format suitable for TVs, updating in real time
- FR10: The system sends in-app notifications when events are created, updated, or cancelled

### Document Management

- FR11: Admin can create, rename, and delete document categories (top-level folders)
- FR12: Admin can create, rename, and delete subfolders within categories (two-level maximum)
- FR13: Admin can upload files (PDF, images, spreadsheets) and add video links to any folder
- FR14: Admin can replace an existing document's file from its detail view
- FR15: Admin can set access permissions on documents and folders by role or by individual user
- FR16: The system tracks when each user opens a document and displays aggregate open counts to admins
- FR17: Users can view, open, and download documents they have access to
- FR18: Users can search documents by name, type, and folder
- FR19: Video links open in the source platform (new browser tab)

### Player Management

- FR20: Admin can create a new player profile with bio fields (photo, DOB, nationality, position, squad number, preferred foot, height, weight, phone, email, address, emergency contacts)
- FR21: Admin can invite a player to create their account via email
- FR22: Admin can manually enter per-match performance stats for a player (date, opponent, minutes, goals, assists, yellow cards, red cards)
- FR23: Admin or medical staff can enter physical/fitness data entries for a player (date, weight, body fat %, notes)
- FR24: Medical staff can create and update injury history entries for a player (visible only to medical staff; non-medical roles see a status indicator only)
- FR25: Admin can configure external provider account/ID links on a player profile
- FR26: Admin can upload contract PDFs to a player's profile; the system extracts structured data (salary, bonuses, clauses, duration, termination) via AI
- FR27: Admin can view all contract details; contract section is hidden from non-admin users
- FR28: Admin can change a player's status between Active, On Loan, and Left the Club
- FR29: Players marked as "Left the Club" have their account deactivated; their profile remains accessible to admins
- FR30: Players marked as "On Loan" retain account access with a visible status indicator
- FR31: Players can view their own profile (bio, stats, fitness data, contract)
- FR32: Players can edit their own contact information and emergency contacts

### Authentication & Access Control

- FR33: Users authenticate via email/password
- FR34: Admins can invite new users by email and assign roles
- FR35: All data is scoped to a team (tenant); users can only access data belonging to their team
- FR36: Access control rules are enforced at the Convex query/mutation layer

### Navigation & Homepage

- FR37: The sidebar navigation includes Calendar, Documents, Players, Dashboards, and Settings as main items
- FR38: The homepage displays quick access to dashboards, the next upcoming match, today's events, and recent results
- FR39: Analytics dashboards not yet implemented display with placeholder content

## Non-Functional Requirements

### Performance

- Page load time under 2 seconds on standard broadband connections
- Real-time updates propagate to all connected clients within 1 second (Convex subscription model)
- Document upload supports files up to 50MB
- AI contract extraction completes within 30 seconds per document

### Security

- All data access enforced at the Convex mutation/query layer (not UI-only)
- Multi-tenant isolation: no cross-team data access possible at the data layer
- Medical/injury data accessible only to users with medical staff role
- Contract data accessible only to admin users
- File storage with signed URLs (no public access to uploaded documents)
- Authentication via secure email/password flow

### Scalability

- Data model supports multiple clubs (teams) without schema changes
- No hard limits on number of players, documents, or events per team
- Convex handles concurrent connections natively

### Compatibility

- Desktop-first design, tested on Chrome, Firefox, Safari, Edge (latest versions)
- Basic responsive layout for tablet and mobile viewports
- .ics feed compatible with Google Calendar, Apple Calendar, Outlook
