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

### Epic 1: Design System & Project Setup
Set up the monorepo from the NativeSquare template, configure the shadcn/ui design system with the project's visual identity, and establish the foundational UI components that all modules will use.
**FRs covered:** None directly (enabling epic)
**UX-DRs covered:** UX-DR1, UX-DR2, UX-DR3, UX-DR5, UX-DR6, UX-DR7, UX-DR8

### Epic 2: Authentication, Navigation & Homepage
Users can sign in, see a role-appropriate homepage with quick access to all modules, and navigate the platform through a consistent sidebar. Admins can invite new users and assign roles.
**FRs covered:** FR33, FR34, FR35, FR36, FR37, FR38, FR39
**UX-DRs covered:** UX-DR4

### Epic 3: Calendar & Scheduling
Club staff and players can view, respond to, and sync calendar events. Admins can create and manage the club's full event schedule including recurring events. A TV-friendly "What's on Today" view keeps the club informed.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10

### Epic 4: Document Hub
Admins can organize, upload, and permission club documents in a structured folder system. Staff and players can browse, search, and download documents relevant to their role.
**FRs covered:** FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19

### Epic 5: Player Profiles & Management
Admins can onboard players, manage profiles, log performance and fitness data, and track player status. Medical staff can manage injury history. Players can view their own data and update their contact info.
**FRs covered:** FR20, FR21, FR22, FR23, FR24, FR25, FR28, FR29, FR30, FR31, FR32

### Epic 6: Contract Management
Admins can upload player contracts and have key terms extracted automatically via AI. Contract data is securely visible only to admins.
**FRs covered:** FR26, FR27

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
