# SPRINT SCOPE OF WORK

## Sprint 3 — Scouting, Notifications & Handoff

|                         |                                                                              |
| ----------------------- | ---------------------------------------------------------------------------- |
| **Provider**            | NativeSquare SAS                                                             |
| **Client**              | Brain Analytics Ltd                                                          |
| **Project**             | Football Club Management Platform                                            |
| **Sprint**              | Sprint 3 — Scouting, Notifications & Handoff                                 |
| **Sprint Fee**          | 2500€                                                                        |
| **Duration**            | 10 business days from Double Key                                             |
| **Staging Environment** | Same staging environment, updated with Sprint 3 deliverables                 |
| **Governing Agreement** | Sprint Engagement Agreement between NativeSquare SAS and Brain Analytics Ltd |

---

## 1. Sprint Overview

This is the final Sprint of the engagement. It delivers the remaining functional modules (Scouting Reports, Shadow Teams, WhatsApp Notifications), incorporates any feedback from the Sprint 2 Demo, and concludes with a full project handoff including documentation, training materials, and compliance deliverables.

---

## 2. Functional Requirements

### Phase 1 — Sprint 2 Feedback & Polish

| Functional Requirement | Description                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| Sprint 2 Fixes         | Address any bugs or UX adjustments identified during the Sprint 2 Demo or client feedback |

**Note:** The Provider will accommodate reasonable adjustments and refinements based on the Client's feedback from the Sprint 2 Demo, provided they fit within the Sprint 3 timeline. The Provider retains sole discretion over whether a requested change constitutes a refinement (included) or a scope addition (subject to the Scope Change Procedure).

### Phase 2 — Feature 6: Scouting Reports

Build a structured scouting report system for evaluating transfer targets.

| Functional Requirement   | Description                                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Scouting Report Creation | Scouts and admins can create structured reports on potential transfer targets with player name, position, current club, and age        |
| Grading System           | Each report includes a grading system for key attributes (technical, physical, tactical, mental) with a numerical or qualitative scale |
| Recommendation           | Each report includes a recommendation: Sign / Watch / Pass, with a written justification                                               |
| Media Attachments        | Scouts can attach images, video links, and documents to a scouting report for visual reference                                         |
| Follow-Up Notes          | Scouts can add timestamped follow-up notes to existing reports (e.g., after attending a second match)                                  |
| Report Search & Filters  | Reports are searchable by player name, position, recommendation, and scout. Filterable by date range                                   |
| Access Control           | Scouting reports are visible only to scouts and admins. Other roles cannot see the scouting module                                     |

### Phase 3 — Feature 7: Shadow Teams

Build a visual squad planning tool for ranking scouting targets by position.

| Functional Requirement | Description                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| Pitch Visualization    | Interactive pitch diagram where admins/scouts can place scouted players by position                      |
| Priority Categories    | Each player placement is tagged with a priority: Immediate / Development / Emergency                     |
| Linked Reports         | Each player on the shadow team links to their scouting report for quick access                           |
| Multiple Boards        | Admins can create and manage multiple shadow team boards (e.g., "Summer Window 2026", "January Targets") |
| Drag & Drop            | Players can be repositioned on the pitch via drag and drop                                               |
| Access Control         | Shadow teams are visible only to scouts and admins                                                       |

### Phase 4 — Feature 8: WhatsApp Notifications

Integrate WhatsApp Business API for automated and manual notifications, extending the in-app notification center.

| Functional Requirement            | Description                                                                                                                               |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| WhatsApp Business API Integration | Connect to the WhatsApp Business API for sending notifications to users who have opted in                                                 |
| Automated Event Notifications     | When a calendar event is created, updated, or cancelled, opted-in users receive a WhatsApp message in addition to the in-app notification |
| Admin Broadcasts                  | Admins can send manual broadcast messages to selected roles or individual users via WhatsApp                                              |
| Message Templates                 | Pre-approved WhatsApp message templates for common scenarios (event reminder, schedule change, announcement)                              |
| User Privacy Controls             | Users can opt in or opt out of WhatsApp notifications from their account settings. Phone number is never shared with other users          |
| Delivery Status                   | Admins can see delivery status (sent, delivered, read) for broadcast messages                                                             |

### Phase 5 — Production Deployment & Data Migration

Deploy the platform to the production environment and migrate existing client data from the legacy platform.

| Deliverable                       | Description                                                                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Production Environment Setup      | Configure production Convex deployment, Next.js hosting, DNS, SSL, and all environment variables (API keys, OAuth, MUX, etc.)                                                                                |
| Data Migration — Users & Accounts | Migrate existing user accounts from the legacy Supabase platform to Convex, preserving roles, email addresses, and team assignments. Users retain their existing credentials or are prompted to set new ones |
| Data Migration — Players          | Migrate existing player profiles, including bio data, performance stats, fitness logs, contract records, and status history                                                                                  |
| Data Migration — Documents        | Migrate existing documents and folder structures, preserving permissions and file storage references                                                                                                         |
| Data Migration — Calendar         | Migrate existing calendar events if applicable, preserving event types and historical data                                                                                                                   |
| Migration Verification            | End-to-end verification that all migrated data is accurate, complete, and accessible by the correct users. Side-by-side comparison with the legacy platform                                                  |
| Rollback Plan                     | Documented rollback procedure in case critical issues are discovered post-migration. Legacy platform remains accessible during a transition period                                                           |

### Phase 6 — Handoff, Documentation & Compliance

Prepare the project for handoff to the Client's team or for ongoing maintenance.

| Deliverable             | Description                                                                                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Technical Documentation | Comprehensive documentation covering: architecture overview, data model, API routes, authentication flow, deployment procedures, and environment configuration                               |
| User Guide              | End-user documentation explaining how to use each module (Calendar, Documents, Players, Dashboards, Scouting, etc.) with screenshots                                                         |
| Training Videos         | Recorded video walkthroughs covering: admin workflows, daily operations, and technical maintenance. Format: screen recordings with voiceover                                                 |
| Deployment Guide        | Step-by-step guide for deploying to production: Convex deployment, Next.js hosting, environment variables, DNS configuration                                                                 |
| Data Privacy & GDPR     | Documentation covering personal data handling, data retention policies, user consent mechanisms, and data export/deletion capabilities as required by applicable data protection regulations |
| Code Handoff            | Full repository access with clean commit history, documented environment setup, and a working local development guide                                                                        |

---

## 3. Assumptions & Dependencies

- The Client will provide WhatsApp Business API credentials and an approved WhatsApp Business account before Phase 4 begins.
- WhatsApp message templates must be pre-approved by Meta before they can be used for automated notifications. The Provider will submit templates; approval timelines are controlled by Meta.
- The Client will provide access to the legacy Supabase database (read-only) for data migration purposes. The Provider will need connection credentials and documentation of the existing data model if available.
- The Client will validate migrated data accuracy during the migration verification phase. A sign-off on data completeness is required before the legacy platform is decommissioned.
- The legacy platform will remain accessible in read-only mode during a transition period (minimum 2 weeks post-migration) as a safety net.
- The Client will designate team members to participate in training sessions and review documentation.
- The Client will confirm which data privacy regulations apply (GDPR, UK Data Protection Act, or other) so the Provider can tailor the compliance documentation accordingly.
- **Sprint 2 feedback**: The Provider will accommodate reasonable adjustments and refinements based on the Client's feedback from the Sprint 2 Demo, provided they fit within the Sprint 3 timeline. The Provider retains sole discretion over whether a requested change constitutes a refinement (included) or a scope addition (subject to the Scope Change Procedure).

---

## 4. Deliverables

At the conclusion of this Sprint, the Provider will deliver:

- A fully functional Scouting Reports module deployed to the staging environment
- A fully functional Shadow Teams module deployed to the staging environment
- WhatsApp notification integration operational (subject to Meta template approval timelines)
- **Production deployment** of the complete platform with all Sprint 1, 2, and 3 features
- **Data migration** from the legacy Supabase platform to the production Convex environment, verified and signed off
- Technical documentation, user guide, and deployment guide
- Training video recordings
- Data privacy and GDPR compliance documentation
- Full code repository handoff with development setup guide
- A final Sprint Demo and handoff session walking the Client through all deliverables

---

## 5. Signatures

By signing below, both Parties confirm their agreement to the scope, functional requirements, and assumptions described in this SOW. This SOW is governed by the Sprint Engagement Agreement between NativeSquare SAS and Brain Analytics Ltd.

| For NativeSquare SAS       | For Brain Analytics Ltd    |
| -------------------------- | -------------------------- |
| Name: Maxime Gey           | Name: Remi Vincent         |
| Title: Founder             | Title: COO                 |
| Date: ******\_\_\_\_****** | Date: ******\_\_\_\_****** |
| Signature:                 | Signature:                 |
