---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-populate-stories', 'step-04-review-and-complete']
inputDocuments: ['_bmad-output/planning-artifacts/prd.md', '_bmad-output/planning-artifacts/sprint1-scope-clarification.md']
---

# BrainAnalytics - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for BrainAnalytics Football Operations Platform (Sprint 1), decomposing the PRD requirements into implementable stories organized by user value.

## Requirements Inventory

### Functional Requirements

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
- FR11: Admin can create, rename, and delete document categories (top-level folders)
- FR12: Admin can create, rename, and delete subfolders within categories (two-level maximum)
- FR13: Admin can upload files (PDF, images, spreadsheets) and add video links to any folder
- FR14: Admin can replace an existing document's file from its detail view
- FR15: Admin can set access permissions on documents and folders by role or by individual user
- FR16: The system tracks when each user opens a document and displays aggregate open counts to admins
- FR17: Users can view, open, and download documents they have access to
- FR18: Users can search documents by name, type, and folder
- FR19: Video links open in the source platform (new browser tab)
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
- FR33: Users authenticate via email/password
- FR34: Admins can invite new users by email and assign roles
- FR35: All data is scoped to a team (tenant); users can only access data belonging to their team
- FR36: Access control rules are enforced at the Convex query/mutation layer
- FR37: The sidebar navigation includes Calendar, Documents, Players, Dashboards, and Settings as main items
- FR38: The homepage displays quick access to dashboards, the next upcoming match, today's events, and recent results
- FR39: Analytics dashboards not yet implemented display with placeholder content

### Non-Functional Requirements

- NFR1: Page load time under 2 seconds on standard broadband connections
- NFR2: Real-time updates propagate to all connected clients within 1 second (Convex subscription model)
- NFR3: Document upload supports files up to 50MB
- NFR4: AI contract extraction completes within 30 seconds per document
- NFR5: All data access enforced at the Convex mutation/query layer (not UI-only)
- NFR6: Multi-tenant isolation: no cross-team data access possible at the data layer
- NFR7: Medical/injury data accessible only to users with medical staff role
- NFR8: Contract data accessible only to admin users
- NFR9: File storage with signed URLs (no public access to uploaded documents)
- NFR10: Authentication via secure email/password flow
- NFR11: Data model supports multiple clubs (teams) without schema changes
- NFR12: Desktop-first design, tested on Chrome, Firefox, Safari, Edge (latest versions)
- NFR13: Basic responsive layout for tablet and mobile viewports
- NFR14: .ics feed compatible with Google Calendar, Apple Calendar, Outlook

### Additional Requirements

- Convex backend (replacing Supabase from existing platform)
- Data model migration from existing Supabase schemas to Convex
- NativeSquare monorepo template as starter (Next.js admin + client apps, Convex backend, shared package)
- shadcn/ui design system with custom preset
- Staging environment setup with mock data
- Role definitions: Admin, Coach, Analyst, Physio/Medical, Player, Staff

### UX Design Requirements

- UX-DR1: Configure shadcn/ui theme preset with project-specific design tokens (colors, typography, spacing, border-radius)
- UX-DR2: Implement consistent sidebar navigation component with Calendar, Documents, Players, Dashboards, Settings items
- UX-DR3: Build notification center component (bell icon in nav bar with dropdown list of notifications)
- UX-DR4: Design and implement homepage layout with dashboard cards, upcoming match widget, today's events widget, and recent results
- UX-DR5: Implement color-coded event type badges (Match, Training, Meeting, Rehab) reusable across calendar and homepage
- UX-DR6: Build reusable player status badges (Active, On Loan, Left the Club) with distinct visual treatment
- UX-DR7: Implement read tracking indicator component for document list (e.g. "Opened by 18/25")
- UX-DR8: Build folder navigation breadcrumb component for Document Hub

### FR Coverage Map

- FR1: Epic 3 (Calendar event creation)
- FR2: Epic 3 (Calendar recurring events)
- FR3: Epic 3 (Calendar recurring events)
- FR4: Epic 3 (Calendar invitations)
- FR5: Epic 3 (Calendar RSVP toggle)
- FR6: Epic 3 (Calendar month view)
- FR7: Epic 3 (Calendar RSVP)
- FR8: Epic 3 (Calendar sync)
- FR9: Epic 3 (What's on Today)
- FR10: Epic 3 (Calendar notifications)
- FR11: Epic 4 (Document Hub folders)
- FR12: Epic 4 (Document Hub subfolders)
- FR13: Epic 4 (Document Hub upload)
- FR14: Epic 4 (Document Hub replace)
- FR15: Epic 4 (Document Hub permissions)
- FR16: Epic 4 (Document Hub read tracking)
- FR17: Epic 4 (Document Hub access)
- FR18: Epic 4 (Document Hub search)
- FR19: Epic 4 (Document Hub video links)
- FR20: Epic 5 (Player profile creation)
- FR21: Epic 5 (Player onboarding)
- FR22: Epic 5 (Player performance stats)
- FR23: Epic 5 (Player fitness data)
- FR24: Epic 5 (Player injury history)
- FR25: Epic 5 (Player external providers)
- FR26: Epic 6 (Contract AI extraction)
- FR27: Epic 6 (Contract admin-only access)
- FR28: Epic 5 (Player status management)
- FR29: Epic 5 (Player Left the Club)
- FR30: Epic 5 (Player On Loan)
- FR31: Epic 5 (Player self-service view)
- FR32: Epic 5 (Player self-service edit)
- FR33: Epic 2 (Authentication)
- FR34: Epic 2 (User invitation)
- FR35: Epic 2 (Multi-tenant isolation)
- FR36: Epic 2 (Access control)
- FR37: Epic 2 (Navigation)
- FR38: Epic 2 (Homepage)
- FR39: Epic 2 (Placeholder dashboards)

## Epic List

### Epic 1: Design System & Project Setup — *Week 1*
Set up the monorepo from the NativeSquare template, configure the shadcn/ui design system with the project's visual identity, and establish the foundational UI components that all modules will use.
**FRs covered:** None directly (enabling epic)
**UX-DRs covered:** UX-DR1, UX-DR2, UX-DR3, UX-DR5, UX-DR6, UX-DR7, UX-DR8

### Epic 2: Authentication, Navigation & Homepage — *Week 1*
Users can sign in, see a role-appropriate homepage with quick access to all modules, and navigate the platform through a consistent sidebar. Admins can invite new users and assign roles.
**FRs covered:** FR33, FR34, FR35, FR36, FR37, FR38, FR39
**UX-DRs covered:** UX-DR4

### Epic 3: Calendar & Scheduling — *Week 1*
Club staff and players can view, respond to, and sync calendar events. Admins can create and manage the club's full event schedule including recurring events. A TV-friendly "What's on Today" view keeps the club informed.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10

### Epic 5: Player Profiles & Management — *Week 1*
Admins can onboard players, manage profiles, log performance and fitness data, and track player status. Medical staff can manage injury history. Players can view their own data and update their contact info.
**FRs covered:** FR20, FR21, FR22, FR23, FR24, FR25, FR28, FR29, FR30, FR31, FR32

### Epic 4: Document Hub — *Week 2*
Admins can organize, upload, and permission club documents in a structured folder system. Staff and players can browse, search, and download documents relevant to their role.
**FRs covered:** FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19

### Epic 6: Contract Management — *Week 2*
Admins can upload player contracts and have key terms extracted automatically via AI. Contract data is securely visible only to admins.
**FRs covered:** FR26, FR27

### Epic 7: Design System Alignment — *Sprint 1 Addition*
Adapt our shadcn/ui theme to match the existing BrainAnalytics visual identity (OKLCH palette, Avenir Next, spacing). Port pitch SVG components, Recharts chart components, and dashboard card system.
**Gap covered:** Design system alignment with existing platform DA.

### Epic 8: External Data Integrations — *Sprint 1 Addition*
Connect StatsBomb (PostgreSQL, 37 SQL queries), SportMonks (fixtures/scores), and Hudl/Wyscout (video clips) as read-only external data sources via Next.js API routes.
**Gap covered:** Analytics data pipeline missing from original scope.

### Epic 9: Analytics Dashboards -- Core — *Sprint 1 Addition*
Dashboard gallery with role-based access control, plus the five most-used dashboards: Season Overview, Post-Match Analysis, Shot Map, Heat Maps.
**Gap covered:** 11 analytics dashboards present in existing platform, absent from rebuild.

### Epic 10: Analytics Dashboards -- Advanced — *Sprint 1 Addition*
Six specialized dashboards: Event Map, Player Analysis, Set Pieces, Opposition Analysis, Team Trends, Referee Analysis + View Possessions + Post-Match Set Pieces.
**Gap covered:** Remaining analytics dashboards from existing platform.

### Epic 11: Cross-Cutting Features — *Sprint 1 Addition*
Global search, Google OAuth, enriched homepage with SportMonks data, and consolidated RBAC hooks system.
**Gap covered:** Global search, Google OAuth, homepage data, RBAC consolidation.

### Epic 12: Staff Profiles & Directory — *Sprint 2*
Staff members get structured profiles with bios, job titles, and certification tracking with expiry alerts. A club directory gives everyone a single place to find contact information.
**Proposal ref:** Originally Sprint 1 "Staff Profiles & Directory", moved to Sprint 2 (swapped with Document Hub).

### Epic 13: Injury Reporting — *Sprint 2*
Comprehensive injury management with clinical classification, timeline tracking, rehab notes, color-coded return-to-play statuses, and a medical dashboard. Extends Story 5.5.
**Proposal ref:** Sprint 2 "Injury Reporting".

### Epic 14: Scouting Reports — *Sprint 3*
Scouts create structured reports on transfer targets with grading, recommendations (Sign/Watch/Pass), media attachments, and follow-up notes. Restricted to scouts and admins.
**Proposal ref:** Sprint 3 "Scouting Reports".

### Epic 15: Shadow Teams — *Sprint 3*
Visual pitch-based squad planning tool for ranking scouting targets by position and priority category (Immediate/Development/Emergency).
**Proposal ref:** Sprint 3 "Scouting Shadow Teams".

### Epic 16: Notifications & WhatsApp Integration — *Sprint 3*
WhatsApp Business API integration for automated and manual notifications. Extends the in-app notification center (Story 3.7) with external push, admin broadcasts, templates, and user privacy controls.
**Proposal ref:** Sprint 3 "WhatsApp Notifications".

---

## Epic 1: Design System & Project Setup

Set up the project foundation and establish the visual identity and reusable UI components that every subsequent module depends on.

### Story 1.1: Initialize Project from Monorepo Template

As a developer,
I want to set up the project from the NativeSquare monorepo template,
So that I have a working codebase with authentication, routing, and Convex backend ready to build on.

**Acceptance Criteria:**

**Given** the NativeSquare monorepo template exists
**When** the developer initializes the project
**Then** the monorepo is set up with the Next.js admin app, Convex backend, and shared package
**And** the dev server starts without errors
**And** the Convex backend is connected and operational
**And** basic authentication flow (email/password) is functional

### Story 1.2: Configure Design System & Theme

As a developer,
I want to configure the shadcn/ui theme with BrainAnalytics design tokens,
So that all UI components have a consistent, professional look across the platform.

**Acceptance Criteria:**

**Given** the shadcn/ui library is installed in the project
**When** the developer runs `npx shadcn@latest init --preset b7lRK5amaQ`
**Then** the shadcn preset `b7lRK5amaQ` is applied, configuring colors, typography, border-radius, and icon library
**And** dark/light mode CSS variables are generated from the preset
**And** all shadcn/ui base components render with the custom theme
**And** the theme is defined in a single source of truth (CSS variables via the preset)

**Implementation Note:** Use the shadcn preset system — the preset code `b7lRK5amaQ` encodes the full design system (colors, fonts, radius, icons). Do NOT manually configure tailwind theme or CSS variables — the preset handles everything. Re-run `npx shadcn@latest init --preset b7lRK5amaQ` to reset to the canonical design system at any time.

### Story 1.3: Build Core Layout & Sidebar Navigation

As a user,
I want a consistent sidebar navigation with links to all main sections,
So that I can move between Calendar, Documents, Players, Dashboards, and Settings from any page.

**Acceptance Criteria:**

**Given** the user is authenticated and on any page
**When** the page loads
**Then** a sidebar is displayed with navigation items: Calendar, Documents, Players, Dashboards, Settings
**And** the current page's nav item is visually highlighted
**And** clicking a nav item navigates to the corresponding page
**And** the layout includes a top bar area for user info and the notification bell icon
**And** the sidebar collapses gracefully on smaller screens

### Story 1.4: Build Reusable UI Components

As a developer,
I want reusable UI components for status badges, event type badges, read tracking indicators, and folder breadcrumbs,
So that all modules use consistent visual patterns without duplicating code.

**Acceptance Criteria:**

**Given** the design system is configured
**When** the developer imports shared components
**Then** event type badges render with distinct colors for Match (red), Training (green), Meeting (blue), Rehab (orange)
**And** player status badges render with distinct visual treatment for Active, On Loan, Left the Club
**And** read tracking indicators display "Opened by X/Y" with a progress-style visual
**And** folder breadcrumbs display the current path (e.g. "Documents > Playbooks > Attacking") with clickable segments
**And** a notification center component (bell icon) renders in the top bar with a dropdown list placeholder

---

## Epic 2: Authentication, Navigation & Homepage

Users can sign in, see their personalized homepage, and admins can manage team members.

### Story 2.1: Set Up Convex Data Models for Auth & Roles

As a developer,
I want to define the Convex schemas for users, teams, roles, and user-role assignments,
So that authentication and role-based access control have a data foundation.

**Acceptance Criteria:**

**Given** the Convex backend is operational
**When** the schemas are deployed
**Then** a `teams` table exists with id, name, and metadata
**And** a `users` table exists with id, email, fullName, avatarUrl, teamId, isAdmin, status
**And** a `roles` table exists with id, name, teamId
**And** a `userRoles` junction table exists mapping users to roles
**And** seed data creates a default team, admin user, and the 6 role types (Admin, Coach, Analyst, Physio/Medical, Player, Staff)
**And** all queries enforce team-scoped data access

### Story 2.2: Implement User Invitation & Onboarding

As an admin,
I want to invite new users by email and assign them a role,
So that I can onboard staff and players to the platform.

**Acceptance Criteria:**

**Given** the admin is on the admin/members page
**When** the admin enters an email address and selects a role
**Then** an invitation is sent to the email address
**And** the invited user appears in the members list with status "Invited"
**And** when the invited user clicks the link and sets their password, their status changes to "Active"
**And** the invited user is assigned the selected role

### Story 2.3: Build Homepage with Module Widgets

As a user,
I want a homepage that shows me today's events, the next upcoming match, and quick access to all modules,
So that I can see what's relevant at a glance without navigating to each module.

**Acceptance Criteria:**

**Given** the user is authenticated and on the homepage
**When** the page loads
**Then** a "Today's Events" widget displays events for the current day (or "No events today")
**And** a "Next Match" widget displays the next upcoming Match-type event (or a placeholder)
**And** quick access cards link to Calendar, Documents, Players
**And** analytics dashboard cards display with placeholder content and a "Coming Soon" label
**And** the layout is clean and matches the design system

---

## Epic 3: Calendar & Scheduling

The club's complete event management system: create, view, respond to, and sync calendar events.

### Story 3.1: Calendar Data Model & Month View

As a user,
I want to see all club events on a month-view calendar with color-coded event types,
So that I can quickly understand the club's schedule for any given month.

**Acceptance Criteria:**

**Given** the Convex schema for calendar events is deployed (id, teamId, name, eventType, startsAt, endsAt, location, description, ownerId, rsvpEnabled, isRecurring)
**And** the calendarEventRoles and calendarEventUsers junction tables exist
**When** the user navigates to /calendar
**Then** a month-view grid displays with events on their respective dates
**And** each event shows its name, time, and a color-coded badge (Match=red, Training=green, Meeting=blue, Rehab=orange)
**And** the user can navigate to previous and next months
**And** clicking on a day or event shows event details in a side panel or modal

### Story 3.2: Event Creation (One-Off)

As an admin,
I want to create calendar events with a name, type, start/end time, location, and description,
So that I can schedule club activities and communicate them to the team.

**Acceptance Criteria:**

**Given** the admin is on the calendar page
**When** the admin clicks "Create Event"
**Then** a form appears with fields: name, event type (select: Match/Training/Meeting/Rehab), start date/time, end date/time, location, description
**And** the admin can select which roles to invite (checkboxes for each role)
**And** the admin can search and select specific individual users to invite
**And** the admin can toggle RSVP on or off for this event
**When** the admin submits the form
**Then** the event appears on the calendar for all invited users in real time
**And** an in-app notification is sent to all invited users

### Story 3.3: Recurring Events

As an admin,
I want to create recurring events (daily, weekly, bi-weekly, monthly) with an end date,
So that I can set up the regular training and meeting schedule once.

**Acceptance Criteria:**

**Given** the admin is creating a new event
**When** the admin enables the "Recurring" toggle
**Then** recurrence options appear: frequency (daily, weekly, bi-weekly, monthly) and end date
**When** the admin saves the recurring event
**Then** individual event occurrences are generated up to the end date
**And** each occurrence appears on the calendar on its respective date
**And** the admin can edit a single occurrence without affecting other occurrences
**And** the admin can cancel a single occurrence without deleting the series
**And** the admin can delete the entire series

### Story 3.4: RSVP Tracking

As a user,
I want to respond to calendar events with "Attending" or "Not Attending" and provide a reason if absent,
So that organizers know who will be present.

**Acceptance Criteria:**

**Given** the user views an event detail where RSVP is enabled
**When** the user clicks "Attending" or "Not Attending"
**Then** their response is saved and visible to the event creator
**And** if "Not Attending", an optional text field appears for the absence reason
**And** the admin can see a master RSVP overview showing all responses for the event
**And** RSVP buttons are not shown on events where RSVP is disabled

### Story 3.5: Calendar Sync (.ics Feed)

As a user,
I want a personal .ics feed URL that I can add to Google Calendar or Apple Calendar,
So that my club events appear alongside my personal calendar.

**Acceptance Criteria:**

**Given** the user is on the calendar settings or calendar page
**When** the user clicks "Sync Calendar"
**Then** a unique .ics feed URL is generated for the user
**And** the URL can be copied to clipboard
**And** subscribing to the URL in Google Calendar or Apple Calendar shows all events the user has access to
**And** the feed updates when events are created, modified, or cancelled

### Story 3.6: "What's on Today" TV Display

As a club admin,
I want a full-screen "What's on Today" page that shows all events for the current day,
So that I can display it on club TVs and screens in the dressing room or lobby.

**Acceptance Criteria:**

**Given** a user navigates to /calendar/today
**When** the page loads
**Then** all events for the current day are displayed in a large, readable format
**And** each event shows time, name, type (color-coded), and location
**And** the display updates in real time as events are added or modified (Convex subscription)
**And** the page is full-screen with no sidebar or navigation clutter
**And** the page requires authentication (admin logs in once on the TV)

### Story 3.7: In-App Notification Center

As a user,
I want to see notifications in the app when events are created, updated, or cancelled,
So that I stay informed about schedule changes without leaving the platform.

**Acceptance Criteria:**

**Given** the Convex schema for notifications is deployed (id, userId, teamId, type, title, message, read, createdAt, relatedEntityId)
**When** an admin creates, updates, or cancels an event
**Then** a notification is created for each invited user
**And** the bell icon in the navigation bar shows an unread count badge
**And** clicking the bell icon shows a dropdown with recent notifications (newest first)
**And** clicking a notification marks it as read and navigates to the related event
**And** a "Mark all as read" action is available

---

## Epic 4: Document Hub

A structured, permission-aware document repository for the club.

### Story 4.1: Document Data Model & Folder Structure

As an admin,
I want to create and manage document folders organized by category,
So that club documents are organized and easy to find.

**Acceptance Criteria:**

**Given** the Convex schema for documents is deployed (folders table: id, teamId, name, parentId, createdBy; documents table: id, teamId, folderId, name, filename, extension, storageId, videoUrl, ownerId, createdAt)
**When** the admin navigates to /documents
**Then** top-level category folders are displayed (e.g. Playbooks, Contracts, Policies, Nutrition)
**And** the admin can create new categories
**And** the admin can rename or delete empty categories
**And** clicking a category shows its contents (documents and subfolders)
**And** the admin can create subfolders within a category (one level deep maximum)
**And** a breadcrumb component shows the current path (e.g. "Documents > Playbooks > Attacking")

### Story 4.2: File Upload, Replace & Video Links

As an admin,
I want to upload documents, replace outdated files, and add video links,
So that the team always has access to current materials.

**Acceptance Criteria:**

**Given** the admin is viewing a folder
**When** the admin clicks "Upload"
**Then** a form appears with fields: file input (or video URL toggle), document name (optional, defaults to filename), folder location (pre-filled with current folder)
**And** supported file types are PDF, JPG, PNG, XLSX, CSV
**And** files up to 50MB are accepted
**When** the admin uploads a file
**Then** the document appears in the folder list in real time
**And** from a document's detail view, the admin can click "Replace File" to upload a new version (overwriting the previous)
**And** video links are stored as URLs; clicking them opens the source platform in a new tab

### Story 4.3: Document Permissions (Role & User-Level)

As an admin,
I want to control who can access each document or folder by role or by individual user,
So that sensitive documents (like contracts) are only visible to authorized people.

**Acceptance Criteria:**

**Given** the admin is viewing a document or folder
**When** the admin opens the permissions panel
**Then** checkboxes for each role are displayed (Admin, Coach, Analyst, Physio, Player, Staff)
**And** a user search field allows adding specific individual users
**And** saving permissions restricts access to only the selected roles and users
**And** folder-level permissions are inherited by documents within (unless overridden)
**And** users without access do not see the document or folder in any view
**And** access control is enforced at the Convex query layer

### Story 4.4: Read Tracking

As an admin,
I want to see how many users have opened each document,
So that I know whether the team is engaging with shared materials.

**Acceptance Criteria:**

**Given** a user opens a document (clicks "Open" or "Download")
**When** the document is accessed
**Then** a record is created with userId, documentId, and timestamp
**And** the document list view shows "Opened by X/Y" for admins (X = unique openers, Y = total users with access)
**And** the admin can click to see the detailed list of who opened and when

### Story 4.5: Document Search & Browse

As a user,
I want to search and filter documents by name, type, or folder,
So that I can quickly find the document I need.

**Acceptance Criteria:**

**Given** the user is on the documents page
**When** the user types in the search bar
**Then** results filter in real time showing matching documents across all accessible folders
**And** results show document name, folder path, type icon, and upload date
**And** the user can filter by file type (PDF, image, spreadsheet, video link)
**And** clicking a result navigates to the document in its folder context

---

## Epic 5: Player Profiles & Management

Comprehensive player management with bio, stats, fitness, injuries, and self-service.

### Story 5.1: Player Data Model & Profile List

As an admin,
I want to see a list of all players with their photo, position, status, and squad number,
So that I can quickly find and manage any player.

**Acceptance Criteria:**

**Given** the Convex schema for players is deployed (id, teamId, userId, photo, dateOfBirth, nationality, position, squadNumber, preferredFoot, heightCm, weightKg, phone, personalEmail, address, emergencyContactName, emergencyContactRelationship, emergencyContactPhone, status, externalProviderLinks)
**When** the admin navigates to /players
**Then** a list/table displays all players with photo, name, position, squad number, and status badge (Active/On Loan/Left the Club)
**And** the list can be filtered by status (Active, On Loan, Left the Club)
**And** a search field filters by player name
**And** clicking a player navigates to their profile page

### Story 5.2: Player Profile Creation & Onboarding

As an admin,
I want to create a new player profile and invite them to the platform,
So that new signings are onboarded with all their information in one place.

**Acceptance Criteria:**

**Given** the admin is on the players page
**When** the admin clicks "Add Player"
**Then** a form appears with all bio fields: photo upload, full name, date of birth, nationality, position (select), squad number, preferred foot (select), height, weight, phone, personal email, address, emergency contact (name, relationship, phone)
**When** the admin submits the form
**Then** the player profile is created with status "Active"
**And** the admin is prompted to send an account invitation to the player's email
**And** when the player accepts the invitation, a user account is created with the "Player" role linked to this profile

### Story 5.3: Performance Stats Log

As an admin,
I want to manually enter per-match performance stats for each player,
So that the club has a record of individual player performance over the season.

**Acceptance Criteria:**

**Given** the admin is viewing a player's profile
**When** the admin navigates to the "Performance" tab and clicks "Add Match Stats"
**Then** a form appears with fields: match date, opponent, minutes played, goals, assists, yellow cards, red cards
**When** the admin submits the form
**Then** the entry appears in a chronological log on the player's profile
**And** the log displays as a table sorted by most recent match first
**And** existing entries can be edited or deleted by admins

### Story 5.4: Physical & Fitness Data Log

As an admin or medical staff member,
I want to enter physical and fitness data for a player over time,
So that the club can track player fitness trends.

**Acceptance Criteria:**

**Given** the user has admin or medical/physio role
**When** they view a player's profile and navigate to the "Fitness" tab
**Then** they can click "Add Entry" and fill in: date, weight (kg), body fat (%), notes/test results
**When** the entry is submitted
**Then** it appears in a chronological log sorted by most recent first
**And** existing entries can be edited or deleted
**And** players can view their own fitness data (read-only) from their profile

### Story 5.5: Injury History (Medical Staff Only)

As a medical staff member,
I want to log and track player injuries with full history,
So that the medical team has a complete record of each player's injury history.

**Acceptance Criteria:**

**Given** the user has the medical/physio role
**When** they view a player's profile
**Then** an "Injuries" tab is visible (hidden for non-medical roles)
**And** clicking "Log Injury" shows a form: date, injury type, severity, estimated recovery, notes
**When** the injury is submitted
**Then** it appears in the injury history log with status (Current/Recovered)
**And** the medical staff can update existing injuries (add rehab notes, change status, set clearance date)
**And** non-medical users see only a status indicator on the player list (e.g. injury icon) but cannot access injury details
**And** access control is enforced at the Convex query layer (medical role check)

### Story 5.6: Player Status Management & Self-Service

As an admin,
I want to change a player's status (Active, On Loan, Left the Club) and have it reflected across the platform,
So that the roster accurately represents the current squad.

**Acceptance Criteria:**

**Given** the admin is viewing a player's profile
**When** the admin changes the status to "Left the Club"
**Then** the player's account is deactivated (cannot log in)
**And** their profile remains visible to admins with a "Left the Club" badge
**And** they appear in a filtered "Left the Club" section of the player list
**When** the admin changes the status to "On Loan"
**Then** the player retains account access
**And** an "On Loan" badge is displayed on their profile and in the player list
**When** any status is changed back to "Active"
**Then** the player's access is restored and badges are removed
**And** players can view their own profile (bio, stats, fitness, contract)
**And** players can edit their own phone, personal email, address, and emergency contacts
**And** players cannot edit any other fields

### Story 5.7: External Provider Linking

As an admin,
I want to configure external provider IDs on a player profile,
So that future integrations with GPS trackers and performance platforms can link to the right player.

**Acceptance Criteria:**

**Given** the admin is viewing a player's profile
**When** the admin navigates to an "Integrations" or "External Providers" section
**Then** a form allows adding key-value pairs (provider name, account ID/URL)
**And** multiple providers can be linked to a single player
**And** the section is informational for now (no active data import in Sprint 1)

---

## Epic 6: Contract Management

Admin-only contract management with AI-powered PDF extraction.

### Story 6.1: Contract Upload & AI Extraction

As an admin,
I want to upload a player's contract PDF and have key terms automatically extracted,
So that I can quickly view structured contract data without reading the full document.

**Acceptance Criteria:**

**Given** the admin is viewing a player's profile
**When** the admin navigates to the "Contract" tab (visible only to admins)
**And** clicks "Upload Contract"
**Then** a file upload dialog accepts PDF files
**When** the PDF is uploaded
**Then** the system processes the document via AI extraction
**And** structured data is extracted: contract duration (start/end dates), salary, bonuses, clauses, termination terms, governing law
**And** the extracted data is displayed in a structured card layout on the Contract tab
**And** the original PDF remains downloadable
**And** extraction completes within 30 seconds
**And** the admin can manually correct any extracted field

### Story 6.2: Contract Security & Access Control

As an admin,
I want contract data to be completely hidden from non-admin users,
So that sensitive financial information is protected.

**Acceptance Criteria:**

**Given** a user with a non-admin role (Coach, Player, Physio, etc.)
**When** they view a player's profile
**Then** the "Contract" tab is not visible
**And** contract data is not returned by any Convex query for non-admin users
**And** direct URL access to contract-related pages returns a "not authorized" response
**Given** a player viewing their own profile
**When** they look at their contract tab
**Then** they can see their own contract details (read-only)
**And** they cannot see any other player's contract

---

# Sprint 1 — Additions (Analytics, Integrations & Cross-Cutting)

Sprint 1 additions close the gaps identified by comparing the existing BrainAnalytics platform (football-dashboard-2, Next.js + Supabase) with our rebuild. The existing platform has 11 analytics dashboards powered by StatsBomb/SportMonks/Wyscout integrations, a global search, and Google OAuth -- none of which were in the original Sprint 1 scope. These epics port the existing UI components and integrations into our Convex architecture, keeping our monorepo structure, sidebar navigation, and backend patterns.

**Source reference:** The existing platform repo is at `brainAnalytics/football-dashboard-2`. Components, SQL queries, and API routes are ported and adapted -- not copied verbatim.

## Epic 7: Design System Alignment

Adapt our existing shadcn/ui theme to match the visual identity of the existing BrainAnalytics platform (OKLCH blue palette, Avenir Next typography, spacing, chart styling). We keep our sidebar navigation layout but align colors, typography, and component styling. Port the custom pitch visualization components and chart library setup needed by the analytics dashboards.

**Builds on:** Story 1.2 (shadcn/ui theme configuration).
**Source files:** `football-dashboard-2/src/app/globals.css` (theme), `football-dashboard-2/src/components/dashboard/` (pitch components), `football-dashboard-2/src/components/charts/` (chart components).

### Story 7.1: Align Color Palette, Typography & Spacing

_To be detailed by SM agent._

**Scope:** Adapt our CSS variables to match their OKLCH palette (primary blue oklch(0.44 0.115 244.61), 5-color chart palette, dark mode), switch font stack to Avenir Next/Inter, align border-radius (base 0.625rem) and spacing tokens. Keep our sidebar layout unchanged.

### Story 7.2: Port Pitch Visualization Components (SVG + Canvas Heatmap)

_To be detailed by SM agent._

**Scope:** Port PitchBase (half-pitch, 80x60 viewBox), FullPitchBase (full-pitch, 80x120 viewBox), GoalBase (goal mouth) SVG components. Port the simpleheat canvas-based heatmap overlay with Sampdoria-branded gradient. Adapt to our component structure and design tokens.

### Story 7.3: Integrate Recharts & Port Reusable Chart Components

_To be detailed by SM agent._

**Scope:** Add Recharts dependency. Port XYScatterChart (dual-axis metric selection, reference lines, player image badges), filter-bar/filter-select/filter-checkbox components, stats-item display component. Adapt styling to our design tokens.

### Story 7.4: Port Dashboard Cards, Gallery Grid & Pin/Recent Tracking

_To be detailed by SM agent._

**Scope:** Port dashboard-card-item with hover transitions, pin toggle, and icon system. Create Convex tables for userPinnedDashboards and userRecentDashboards. Build gallery grid layout (1/2/3 columns responsive). Port the 40+ Lucide icon mapping from dashboard-icons.ts.

---

## Epic 8: External Data Integrations

Connect the three external data sources that power the analytics dashboards: StatsBomb (match/player/team analytics), SportMonks (fixtures, scores, standings), and Hudl/Wyscout (video clips). These are PostgreSQL direct connections and REST APIs -- they live alongside our Convex backend as read-only data sources accessed via Next.js API routes.

**Architecture:** Next.js API routes in `apps/admin/app/api/` query external PostgreSQL databases directly (node-postgres). Convex is NOT involved -- these are read-only external data sources. Video URLs are cached in Convex storage.

### Story 8.1: StatsBomb PostgreSQL Connection & API Routes

_To be detailed by SM agent._

**Scope:** Set up node-postgres connection to StatsBomb database (silver/gold schemas). Port 37 SQL query files. Create ~25 Next.js API routes under `/api/statsbomb/` (teams, competitions, seasons, matches, match-stats, lineups, events, shots, set-pieces, possessions, player-season-stats, league-averages, team-trends, referee-analysis, win-probabilities, etc.). Include connection pooling and error handling.

### Story 8.2: SportMonks PostgreSQL Connection & API Routes

_To be detailed by SM agent._

**Scope:** Set up node-postgres connection to SportMonks database. Port SQL queries for fixtures, scores, team info, standings. Create API routes under `/api/sportmonks/`. Used by homepage (upcoming matches, recent results) and calendar (match fixtures).

### Story 8.3: Hudl Mapping & Wyscout Video Clip Integration

_To be detailed by SM agent._

**Scope:** Integrate Hudl GraphQL mapping API (StatsBomb match ID -> Wyscout match ID). Integrate Wyscout REST API for video clip URLs (with period offsets, timestamp mapping, quality selection). Implement video URL caching in Convex storage with signed URLs. Create API routes under `/api/wyscout/`.

---

## Epic 9: Analytics Dashboards -- Core

The five most-used analytics dashboards that the club staff relies on daily. These are client-side interactive pages with data fetched from StatsBomb/SportMonks API routes (Epic 8). Each dashboard is a dedicated page under `/dashboards/[slug]`.

**Depends on:** Epic 7 (design components), Epic 8 (data integrations).
**Source:** Each dashboard's components are in `football-dashboard-2/src/app/(dashboard)/dashboards/[slug]/`.

### Story 9.1: Dashboard Gallery Page & Role-Based Access Control

_To be detailed by SM agent._

**Scope:** Build `/dashboards` gallery page with filterable grid of dashboard cards (from Story 7.4). Create Convex tables: dashboards (id, title, description, category, icon, slug), roleDashboards (roleId, dashboardId). Admin can configure which roles see which dashboards (admin settings tab). Dynamic routing to `/dashboards/[slug]` renders the appropriate dashboard component.

### Story 9.2: Season Overview Dashboard

_To be detailed by SM agent._

**Scope:** Port 11 components: SeasonFiltersBar, PointsChart (dual-axis line: actual points vs xPoints), SummaryCards, SeasonInsightsPanels, PhaseStrengthsCard (radar), PossessionRadars, CurrentFormCard, HomeVsAwayCard, ProjectedFinishCard, XPointsOverUnderCard. Data from: season-points, season-possession-details, league-team-season-averages API routes. Interactions: team/season dropdowns, season comparison toggle.

### Story 9.3: Post-Match Analysis Dashboard

_To be detailed by SM agent._

**Scope:** Port 11 components: MatchFilterBar (fuzzy search), MatchStats (comparative), MomentumGraph (possession % timeline), XgRaceChart (cumulative xG), WinProbabilityBar, LineupTable, SubstitutesTable, PossessionMetricCard, PostMatchPossessionDetails, EventIcons, GraphInfoBadge. Data from: matches, match-stats, lineups-processed, possessions API routes. Interactions: match search/selection, team/season filters.

### Story 9.4: Shot Map Dashboard

_To be detailed by SM agent._

**Scope:** Port 15 components: MatchFiltersBar, ShotFiltersBar (multi-select), ShotPitchMap (half-pitch with xG-sized circles), GoalMap (zoomed goal view), DetailsPane (with Wyscout video), ShotsTable (sortable), StatsBar, legends. Data from: shots, match-periods API routes + Wyscout video integration. Interactions: match/team/season filters, outcome filters, player filter, exclude penalties toggle, video clip playback.

### Story 9.5: Heat Maps Dashboard

_To be detailed by SM agent._

**Scope:** Port HeatMapClient and HeatPitchMap components. Canvas-based heatmap rendering using simpleheat library on FullPitchBase overlay. Gradient: Sampdoria blue -> cyan -> yellow -> red. Event density scaling by type (pressures, buildup, under-pressure, interceptions). Data from: events API route with type filtering. Interactions: tab selection (event type), player filter, match/venue filters. ResizeObserver for responsive canvas.

---

## Epic 10: Analytics Dashboards -- Advanced

Six specialized dashboards for deeper tactical analysis. These are more complex (Set Pieces has 18 components) and used less frequently but are essential for match preparation and post-match review.

**Depends on:** Epic 7 (design components), Epic 8 (data integrations).

### Story 10.1: Event Map Dashboard

_To be detailed by SM agent._

**Scope:** Port 5 components: EventMapFilterBar, EventMapClient (tab selection: Interceptions/Fouls/Regains), EventPitchMap (SVG with dot events + zone stats panel), EventDetailsPane (with Wyscout video), PlayerStatsChart (zone distribution). Server-rendered filters with client hydration. Video integration via Wyscout. Interactions: tab selection, event click for details, video clip loading.

### Story 10.2: Player Analysis Dashboard

_To be detailed by SM agent._

**Scope:** Port 7 components: PlayerFilters (cascading: competition -> team -> season -> player search), PlayerInfoCard, PlayerOverview (position-based templates), SeasonStatistics (per-90 table), PlayerRadarChart (vs league percentiles), PlayerScatterPlot (XY scatter), PlayerComparison. Data from: player-season-stats, league-player-season-stats, players-search API routes. Interactions: cascade filters, position template selector, axis selection.

### Story 10.3: Set Pieces Dashboard

_To be detailed by SM agent._

**Scope:** Port 18 components including: SetPieceFiltersBar (multi-select: type, side, technique, zone, player, target, outcome), SetPieceMatchFiltersBar (fuzzy search), SetPiecesPitchMap (half-pitch with zone polygons), SetPiecesGoalMap, SetPieceDetailsPane (with video), SetPieceLegend, CornerTechniqueBar, FirstContactsBarChart, OutcomeBarChart, TakersBarChart, zone polygon definitions. Data from: set-pieces API routes (by-match and by-season). Interactions: match selection, multi-select filters, individual vs zone view toggle, all-season vs single-match toggle, video clips.

### Story 10.4: Opposition Analysis Dashboard

_To be detailed by SM agent._

**Scope:** Port 8 components: OppositionFilterBar, OppositionStatsBar, OppositionSummaryCard, StrengthsWeaknesses, StyleOfPlayRadar, PhaseOfPlayRatings, UnavailablePlayers, FormationUsageCard (heatmap). Server-rendered with client hydration. Data from: custom opposition SQL queries. Interactions: opponent team selector, manager filter.

### Story 10.5: Team Trends Dashboard

_To be detailed by SM agent._

**Scope:** Port 4 components: TeamTrendsFiltersBar, TeamMetricProgressChart (multi-metric line chart with metric selector), LeagueRankingChart (position over matchweek), TeamXYScatterChart (team vs league). Data from: team-trends, league-ranking-averages, league-team-season-averages API routes. Interactions: team/season selection, metric picker.

### Story 10.6: Referee Analysis, View Possessions & Post-Match Set Pieces

_To be detailed by SM agent._

**Scope:** Three lighter-weight dashboards grouped in one story. (1) Referee Analysis: RefereeFiltersBar, RefereeSummaryCard, RefereeStatsBar, FoulsTable. (2) View Possessions: possession table with phase/outcome filtering + Wyscout video playback, period offset mapping. (3) Post-Match Set Pieces: variant of Set Pieces filtered to single match with attack/defence toggle. Data from: referee-analysis, referee-summary, possessions, match-periods API routes.

---

## Epic 11: Cross-Cutting Features

Transversal features that improve the overall platform experience: global search, Google OAuth, enriched homepage with live match data, and a consolidated RBAC hooks system.

### Story 11.1: Global Search Across All Entities

_To be detailed by SM agent._

**Scope:** Build a global search (topbar or command palette) that searches across dashboards, documents, contracts, players, and calendar events. Fuzzy matching with result grouping by entity type. Search results show icon, title, and navigation link. Convex-powered for real-time results. Accessible via keyboard shortcut (Cmd+K / Ctrl+K).

### Story 11.2: Google OAuth Authentication

_To be detailed by SM agent._

**Scope:** Add Google OAuth as an alternative sign-in method alongside email/password. Leverage the NativeSquare template's auth infrastructure. Link Google accounts to existing user profiles. Handle edge cases: existing email conflict, team assignment for new Google sign-ins.

### Story 11.3: Enriched Homepage with SportMonks Data

_To be detailed by SM agent._

**Scope:** Enhance the homepage (Story 2.3) with live data from SportMonks: match countdown timer to next fixture, recent match results with scores, league standings snippet. Replace static "Next Match" widget with real fixture data. Recent dashboards and documents sections (from pin/recent tracking in Story 7.4).

### Story 11.4: RBAC Hooks -- Reusable Access Control Utilities

_To be detailed by SM agent._

**Scope:** Consolidate and extend the existing RBAC system. Create reusable hooks: (1) `getTeamResource(ctx, table, id)` -- fetch + team validation in one op (replaces 84+ inline checks), (2) `requireAdminOrSelf(ctx, targetUserId)` -- admin bypass + user-ownership check (replaces 3x duplicated contract pattern), (3) `requireAdminOrRole(ctx, roles[])` -- admin bypass + role check, (4) `requireResourceAccess(ctx, resource, options)` -- composable check combining role + userId + individual permissions, (5) `withAccessControl(handler, rules)` -- mutation/query wrapper for auto-enforcement. Refactor existing mutations/queries across all modules to use the new hooks (no functional changes, pure refactor).

---

# Sprint 2 — Staff & Medical

Sprint 2 delivers the Staff Profiles & Directory module (originally planned for Sprint 1, swapped with Document Hub) and the Injury Reporting module. Together they complete the club's people management capabilities.

> **Open questions for this sprint:** See [sprint2-3-open-questions.md](sprint2-3-open-questions.md) — questions Q-S2-01 through Q-S2-05.

## Epic 12: Staff Profiles & Directory

Staff members get structured profiles with bios, job titles, and certification tracking. The club directory gives everyone a single place to find contact information. Admins manage onboarding and permission levels.

**Proposal reference:** Sprint 1 "Staff Profiles & Directory" (moved to Sprint 2 to prioritize Document Hub in Sprint 1).

### Story 12.1: Staff Data Model & Directory View

As a user,
I want to browse a staff directory showing all club staff with their name, role, job title, and photo,
So that I can quickly find and contact anyone at the club.

**Acceptance Criteria:**

**Given** the Convex schema for staff profiles is deployed (id, teamId, userId, photo, fullName, jobTitle, department, phone, email, bio, dateJoined)
**When** a user navigates to /staff
**Then** a searchable directory displays all staff with photo, name, job title, department, and role badge
**And** the directory can be filtered by department or role
**And** clicking a staff member shows their full profile (bio, contact info, certifications)
**And** players see a read-only directory view (no edit capabilities)
**And** data is team-scoped (Convex query enforces teamId)

> **Depends on:** [Q-S2-02](sprint2-3-open-questions.md#q-s2-02-staff-profile-fields) — Final field list may expand based on client input. Default assumption: core bio + contact fields.

### Story 12.2: Staff Profile Creation & Onboarding

As an admin,
I want to create staff profiles and invite staff members to the platform,
So that new hires are onboarded with their information centralized.

**Acceptance Criteria:**

**Given** the admin is on the staff directory page
**When** the admin clicks "Add Staff Member"
**Then** a form appears with fields: photo upload, full name, job title, department, phone, email, bio, date joined
**When** the admin submits the form
**Then** the staff profile is created and visible in the directory
**And** the admin is prompted to send an account invitation to the staff member's email
**And** when the staff member accepts the invitation, a user account is created with their assigned role linked to this profile
**And** existing users (already invited via Story 2.2) can be linked to a staff profile retroactively

> **Depends on:** [Q-S2-02](sprint2-3-open-questions.md#q-s2-02-staff-profile-fields) — Additional fields may be added based on client answer.

### Story 12.3: Certification Tracking & Expiry Alerts

As an admin,
I want to track staff certifications with expiry dates and receive alerts before they expire,
So that the club stays compliant and no certification lapses go unnoticed.

**Acceptance Criteria:**

**Given** the admin is viewing a staff member's profile
**When** the admin navigates to the "Certifications" section
**Then** they can add a certification entry: name, issuing body, date obtained, expiry date, document upload (optional)
**And** multiple certifications can be tracked per staff member
**And** a certification with an expiry date within 30 days shows a warning badge on the profile and in the directory
**And** an in-app notification is generated 30 days before expiry, addressed to the staff member and all admins
**And** expired certifications show a red "Expired" badge
**And** the admin dashboard includes a "Certifications expiring soon" widget showing all upcoming expirations across all staff

> **Depends on:** [Q-S2-01](sprint2-3-open-questions.md#q-s2-01-staff-certification-types) — If the client wants predefined certification categories (e.g., UEFA coaching badges, medical licenses) instead of free-text, the form will include a category dropdown. Default assumption: flexible name field.

### Story 12.4: Staff Permission Levels

As an admin,
I want to assign granular permission levels to staff members,
So that each staff member sees only what is relevant to their function.

**Acceptance Criteria:**

**Given** the role system from Sprint 1 exists (Admin, Coach, Analyst, Physio/Medical, Player, Staff)
**When** an admin creates or edits a staff profile
**Then** the admin can assign one or more roles to the staff member
**And** permissions from Sprint 1 modules (Calendar, Documents, Players) automatically apply based on assigned roles
**And** the staff directory visibility respects role-based access rules
**And** medical-only data (injuries) remains restricted to Physio/Medical role
**And** contract data remains restricted to Admin role

> **Depends on:** [Q-S2-03](sprint2-3-open-questions.md#q-s2-03-staff-permission-granularity) — If the client needs department-level scoping beyond roles, this story will expand to include a department-based permission layer. Default assumption: existing role system is sufficient.

---

## Epic 13: Injury Reporting

A comprehensive injury management system for the medical team, extending the foundation from Story 5.5 (basic injury logging) with clinical classification, status tracking, rehab workflows, and archiving.

**Proposal reference:** Sprint 2 "Injury Reporting".
**Builds on:** Story 5.5 (sprint2-5-5-injury-history-medical-staff-only.md) — basic injury logging already implemented.

### Story 13.1: Injury Data Model & Classification

As a medical staff member,
I want to log injuries with structured clinical classification (body region, injury type, mechanism),
So that the medical team has precise, searchable injury records.

**Acceptance Criteria:**

**Given** the basic injury model from Story 5.5 exists (date, injury type, severity, estimated recovery, notes)
**When** the medical staff member logs a new injury
**Then** the form includes enhanced fields: body region (dropdown: Head, Neck, Shoulder, Upper Arm, Elbow, Forearm, Wrist/Hand, Chest, Abdomen, Lower Back, Hip/Groin, Thigh, Knee, Lower Leg, Ankle, Foot), injury type (dropdown: Muscle strain, Ligament sprain, Fracture, Contusion, Tendinopathy, Concussion, Other), mechanism of injury (dropdown: Contact, Non-contact, Overuse, Training, Match, Other), and laterality (Left/Right/Bilateral/N/A)
**And** the existing free-text fields (severity, estimated recovery, notes) are preserved
**And** historical injuries logged via Story 5.5 remain accessible and valid (backwards-compatible)
**And** all injury data access is restricted to medical/physio role at the Convex query layer

> **Depends on:** [Q-S2-04](sprint2-3-open-questions.md#q-s2-04-injury-classification-system) — If the client uses Orchard Codes, we'll add an optional Orchard Code field alongside the dropdown classification. Default assumption: dropdown-based classification without Orchard Codes.

### Story 13.2: Injury Timeline & Rehab Notes

As a medical staff member,
I want to track the progression of an injury with timeline entries and rehab notes,
So that the full treatment history is documented from injury to clearance.

**Acceptance Criteria:**

**Given** an active injury record exists for a player
**When** the medical staff member opens the injury detail view
**Then** a chronological timeline displays all events related to this injury
**And** the medical staff member can add timeline entries: date, type (Assessment, Treatment, Rehab Session, Follow-up, Scan/MRI, Clearance Test), notes, and optional file attachment (scan images, reports)
**And** each timeline entry shows the author (which medical staff member logged it)
**And** the estimated recovery date can be updated from any timeline entry
**And** the timeline is read-only for non-medical roles (they cannot see it per existing access control)

### Story 13.3: Injury Status & Return-to-Play Tracking

As a medical staff member,
I want to set a color-coded status on each injury so coaches and staff can see player availability at a glance,
So that squad selection and training planning account for player fitness.

**Acceptance Criteria:**

**Given** an injury record exists for a player
**When** the medical staff member updates the injury status
**Then** the status can be set to: Red (Out — unavailable for training and matches), Yellow (Modified — available for modified training only), or Green (Cleared — fully fit, returned to play)
**And** the player list (/players) shows the current injury status as a colored indicator next to the player's name (visible to all roles)
**And** the player's profile shows the status badge on their overview tab
**And** coaches can see the status indicator but NOT the injury details (medical data remains restricted)
**And** changing status to Green prompts the medical staff to set a clearance date and final notes
**And** a notification is sent to admins when a player's status changes

> **Depends on:** [Q-S2-05](sprint2-3-open-questions.md#q-s2-05-injury-status-workflow) — Status transitions and who can change them may be adjusted based on client workflow. Default assumption: only medical staff can change injury status.

### Story 13.4: Injury Dashboard & Archiving

As a medical staff member,
I want a dashboard showing all current injuries across the squad and the ability to archive resolved injuries,
So that I have a real-time overview of squad fitness and a clean workspace.

**Acceptance Criteria:**

**Given** the user has the medical/physio role
**When** they navigate to a medical dashboard (e.g., /injuries or a dedicated tab)
**Then** a summary view shows all currently injured players grouped by status (Red/Yellow/Green)
**And** each entry shows player name, injury type, body region, days since injury, and estimated return date
**And** when an injury's status is set to Green (Cleared) and a clearance date is recorded, the injury can be archived
**And** archived injuries move to a "History" tab, keeping the active view focused on current cases
**And** archived injuries remain fully accessible and searchable for historical reference
**And** the dashboard is accessible only to medical/physio and admin roles

---

# Sprint 3 — Scouting & Communications

Sprint 3 delivers the scouting suite (reports + shadow teams) and the WhatsApp notification layer, completing the platform's feature set as outlined in the original proposal.

> **Open questions for this sprint:** See [sprint2-3-open-questions.md](sprint2-3-open-questions.md) — questions Q-S3-01 through Q-S3-06.
> **Critical prerequisite:** Q-S3-01 (Jesper's scouting format) and Q-S3-03 (WhatsApp Business API setup) must be resolved before Sprint 3 starts.

## Epic 14: Scouting Reports

Scouts and admins can create, grade, and manage scouting reports on transfer targets. Reports include structured data, media attachments, and final recommendations. Access is restricted to scouts and admins.

**Proposal reference:** Sprint 3 "Scouting Reports".

### Story 14.1: Scouting Data Model & Report List

As a scout or admin,
I want to see a list of all scouting reports with target name, position, recommendation, and date,
So that I can quickly review and manage the club's scouting pipeline.

**Acceptance Criteria:**

**Given** the Convex schema for scouting is deployed (scoutingReports table: id, teamId, targetPlayerName, targetCurrentClub, targetPosition, targetAge, targetNationality, marketValue, scoutId, recommendation, status, createdAt, updatedAt)
**When** a scout or admin navigates to /scouting
**Then** a list/table displays all scouting reports with target name, current club, position, recommendation badge (Sign/Watch/Pass), and scout name
**And** the list can be filtered by recommendation, position, and status (Active/Archived)
**And** a search field filters by target player name or club
**And** clicking a report navigates to the full report detail view
**And** the scouting section is not visible to non-scout/non-admin roles
**And** access control is enforced at the Convex query layer

> **Depends on:** [Q-S3-01](sprint2-3-open-questions.md#q-s3-01-scouting-report-format-jesper-input-needed) — The data model fields listed here are provisional. Jesper's input will finalize the exact fields and may add custom attributes. **This is a blocking dependency.**

### Story 14.2: Scouting Report Creation & Media Attachments

As a scout,
I want to create a detailed scouting report with text analysis, media, and video links,
So that decision-makers have all the information they need to evaluate a target.

**Acceptance Criteria:**

**Given** a scout is on the scouting page
**When** the scout clicks "New Report"
**Then** a form appears with: target player info (name, current club, position, age, nationality, market value), strengths (free text), weaknesses (free text), tactical notes (free text), and video links (multiple URLs)
**And** the scout can attach files (photos, PDF reports, screenshots) to the report
**And** video links open in the source platform in a new tab (same pattern as Document Hub)
**And** the form is mobile-friendly with a simplified layout for scouts in the field
**And** the report can be saved as draft before final submission
**And** submitted reports are immediately visible to all scouts and admins

> **Depends on:** [Q-S3-01](sprint2-3-open-questions.md#q-s3-01-scouting-report-format-jesper-input-needed) — Form fields will be adjusted based on Jesper's report format. **This is a blocking dependency.**

### Story 14.3: Grading System & Recommendations

As a scout,
I want to grade a target player across multiple criteria and assign a final recommendation,
So that reports follow a consistent evaluation framework.

**Acceptance Criteria:**

**Given** the scout is creating or editing a scouting report
**When** the scout fills in the grading section
**Then** a set of evaluation criteria are displayed with a numerical rating scale (1-10) for each: Technical Ability, Tactical Awareness, Physical Attributes, Mental Attributes, Potential
**And** the scout selects a final recommendation: Sign, Watch, or Pass
**And** an overall score is automatically calculated as the average of individual criteria
**And** the recommendation and overall score are displayed prominently on the report list and detail views
**And** grades can be updated after initial submission (with edit history tracked)

> **Depends on:** [Q-S3-01](sprint2-3-open-questions.md#q-s3-01-scouting-report-format-jesper-input-needed) — Grading criteria and scale are provisional. Jesper may want different criteria, a different scale (e.g., letter grades, stars), or additional evaluation categories. **This is a blocking dependency.**

### Story 14.4: Follow-up Notes & Target Archiving

As a scout or admin,
I want to add follow-up notes to existing reports and archive targets that are no longer relevant,
So that the scouting pipeline stays current and historical data is preserved.

**Acceptance Criteria:**

**Given** a scouting report exists
**When** a scout or admin views the report detail
**Then** they can add follow-up notes (date + text) that appear chronologically below the original report
**And** follow-up notes show the author name and date
**And** an admin or the original scout can change the report status to "Archived" with a reason (Signed elsewhere, Budget, Not interested, Other)
**And** archived reports move to an "Archived" tab but remain searchable
**And** archived reports cannot be edited but can still have follow-up notes added

---

## Epic 15: Shadow Teams

A visual squad-planning tool where scouts and admins build shadow teams by position, categorize targets by priority, and rank them using drag-and-drop.

**Proposal reference:** Sprint 3 "Scouting Shadow Teams".

### Story 15.1: Shadow Team Data Model & Pitch View

As a scout or admin,
I want to see a visual pitch view displaying scouting targets organized by position,
So that I can evaluate squad coverage and identify gaps at a glance.

**Acceptance Criteria:**

**Given** the Convex schema for shadow teams is deployed (shadowTeams table: id, teamId, name, transferWindow, status; shadowTeamEntries table: id, shadowTeamId, scoutingReportId, position, category, rank)
**When** a scout or admin navigates to /scouting/shadow-team
**Then** a visual football pitch (formation view) displays with position zones
**And** each position zone shows the assigned scouting targets (player name + recommendation badge)
**And** empty positions show a visual indicator ("No targets")
**And** the pitch layout adapts to show common formations (4-3-3, 4-4-2, 3-5-2) with a formation selector
**And** the shadow team is restricted to scouts and admins (same access as scouting reports)

> **Depends on:** [Q-S3-02](sprint2-3-open-questions.md#q-s3-02-shadow-team-positions-and-categories) — Number of concurrent shadow teams and whether categories are fixed or custom. Default assumption: one active shadow team, 3 fixed categories.

### Story 15.2: Category Management & Player Assignment

As a scout or admin,
I want to categorize shadow team targets by priority (Immediate, Development, Emergency/Loan),
So that transfer planning reflects different urgency levels.

**Acceptance Criteria:**

**Given** the shadow team pitch view is displayed
**When** a scout or admin adds a target from the scouting report list to the shadow team
**Then** they select a position on the pitch and a category: Immediate (first choice targets), Development (long-term prospects), or Emergency/Loan (backup options)
**And** each category has a distinct visual treatment (color or icon) on the pitch view
**And** a player can only appear once per shadow team (but can be in multiple position zones if versatile)
**And** removing a target from the shadow team does not delete the scouting report
**And** a sidebar or panel lists all targets grouped by category with quick-add/remove actions

### Story 15.3: Drag-and-Drop Ranking

As a scout or admin,
I want to rank targets within each position using drag-and-drop,
So that the preferred order of targets is clear for transfer discussions.

**Acceptance Criteria:**

**Given** multiple targets are assigned to the same position on the shadow team
**When** the user drags a target card up or down within the position list
**Then** the ranking order is updated in real time and persisted
**And** the rank number is displayed next to each target (1st choice, 2nd choice, etc.)
**And** ranking changes are reflected immediately for all connected users (Convex real-time)
**And** the drag-and-drop interaction works on both desktop and tablet viewports

---

## Epic 16: Notifications & WhatsApp Integration

A unified notification system that extends the existing in-app notification center (Story 3.7) with WhatsApp Business API integration for external push notifications. Admins can manage templates, broadcast messages, and users can control their notification preferences.

**Proposal reference:** Sprint 3 "WhatsApp Notifications".
**Builds on:** Story 3.7 (sprint3-3-7-in-app-notification-center.md) — in-app notification center already implemented.

### Story 16.1: WhatsApp Business API Integration

As a developer,
I want to integrate the WhatsApp Business API with the platform backend,
So that the system can send automated and manual WhatsApp messages to users.

**Acceptance Criteria:**

**Given** the WhatsApp Business API credentials are configured (see prerequisites)
**When** the backend sends a message via the WhatsApp API
**Then** the message is delivered to the recipient's WhatsApp number
**And** delivery status is tracked (sent, delivered, read, failed) via webhook callbacks
**And** failed messages are logged with error details for admin review
**And** API credentials are stored securely (Convex environment variables, not in code)
**And** the integration includes rate limiting to respect WhatsApp API quotas

> **Depends on:** [Q-S3-03](sprint2-3-open-questions.md#q-s3-03-whatsapp-business-api-setup) — **Hard blocker.** WhatsApp Business account must be set up and verified before this story can start. Prerequisites checklist in the question document.

### Story 16.2: Automated Notification Triggers

As a user,
I want to receive WhatsApp notifications for important events (new calendar events, schedule changes, reminders),
So that I stay informed even when I'm not logged into the platform.

**Acceptance Criteria:**

**Given** the WhatsApp API integration is operational (Story 11.1)
**And** the user has opted in to WhatsApp notifications (Story 16.4)
**When** an admin creates a new calendar event that includes the user
**Then** the user receives a WhatsApp message with the event name, date/time, and location
**When** an event the user is invited to is updated or cancelled
**Then** the user receives a WhatsApp notification about the change
**And** a reminder is sent 24 hours before each event the user is attending
**And** each WhatsApp notification uses a pre-approved message template
**And** the corresponding in-app notification (Story 3.7) is also created (dual-channel)

> **Depends on:** [Q-S3-04](sprint2-3-open-questions.md#q-s3-04-whatsapp-notification-triggers) — Additional trigger types may be added based on client input. Default: calendar events only.

### Story 16.3: Admin Broadcast & Message Templates

As an admin,
I want to send manual WhatsApp broadcasts to groups of users and manage message templates,
So that I can communicate important club information outside of scheduled events.

**Acceptance Criteria:**

**Given** the admin navigates to a notification management page
**When** the admin creates a new broadcast
**Then** they can select recipients by role, by individual users, or "All staff"
**And** they can choose from pre-built message templates or compose a free-form message
**And** the broadcast is sent to all selected recipients who have opted in to WhatsApp
**And** a delivery report shows sent/delivered/read/failed counts
**And** message templates can be created and edited by admins (subject to WhatsApp template approval process)
**And** template variables are supported (e.g., {player_name}, {event_date}) and auto-populated at send time

> **Depends on:** [Q-S3-05](sprint2-3-open-questions.md#q-s3-05-whatsapp-message-templates--language) — Template language (English/Italian/both) and customization needs affect template design.

### Story 16.4: User Notification Preferences & Privacy

As a user,
I want to control which notifications I receive and through which channels (in-app, WhatsApp),
So that I'm not overwhelmed by messages and my privacy preferences are respected.

**Acceptance Criteria:**

**Given** the user navigates to their profile settings
**When** they open the "Notifications" section
**Then** they can toggle WhatsApp notifications on/off (opt-in model by default)
**And** when enabling WhatsApp, they must confirm their phone number
**And** they can choose notification categories: Calendar events, Schedule changes, Reminders, Broadcasts
**And** each category can be independently enabled/disabled per channel (in-app / WhatsApp)
**And** the opt-in choice is recorded with timestamp for GDPR compliance
**And** users can revoke WhatsApp consent at any time, which immediately stops all WhatsApp messages
**And** in-app notifications (Story 3.7) remain always active regardless of WhatsApp preferences

> **Depends on:** [Q-S3-06](sprint2-3-open-questions.md#q-s3-06-notification-opt-inopt-out-scope) — Opt-in vs opt-out default may change based on client's privacy policy.
