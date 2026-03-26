<style>
  .question-box {
    background-color: #FFF3E0;
    border-left: 4px solid #F57C00;
    padding: 12px 16px;
    margin: 16px 0;
    font-weight: bold;
    font-size: 1.05em;
  }
</style>

# Sprint 1 — Scope Clarification & Implementation Plan

## Purpose

This document outlines our implementation approach for Sprint 1. We have a few questions that require your input (Section 1), followed by a summary of our planned approach for each module (Section 2).

---

## 1. Questions for Brain Analytics

### Player Accounts & Role

The SOW requires "Player Self-Service" (players view their own stats/contracts and edit their contact info) and "RSVP Tracking" (players respond to calendar events). Both of these require players to have their own accounts on the platform.

Your current platform does not have a "Player" role. We plan to add one with appropriate permissions: players will be able to view their own profile, respond to calendar events, and browse documents shared with them. Admin features (event creation, document uploads, player management) will remain restricted to admins.

<div class="question-box">
&#10140; Can you confirm this is the right approach?
</div>

---

### Document Hub — Folder Structure

Your current platform organizes documents using flat document types (Contract, Medical Report, GPS File). The SOW calls for a more structured approach with categories like Playbooks, Policies, Contracts, and Nutrition plans, along with the ability for admins to create and manage folders.

We propose the following structure:

```
Documents
├── Playbooks/
│   ├── Attacking Plan.pdf
│   └── Set Piece Book.pdf
├── Contracts/          (admin-only visibility)
│   ├── Player A Contract.pdf
│   └── Player B Contract.pdf
├── Policies/
│   └── Code of Conduct.pdf
└── Nutrition/
    └── Meal Plan March.pdf
```

Main categories are fully manageable by admins (create, rename, delete). Within each category, admins can also create subfolders to organize documents further (e.g. "Playbooks > Attacking" and "Playbooks > Defensive").

<div class="question-box">
&#10140; Does this match your vision, or would you organize it differently?
</div>

---

### Player Profile Fields & Performance/Fitness KPIs

The SOW mentions "Player Bio & Info", "Performance Stats" (input by admins), and "Physical & Fitness Data" (input by admins or medical staff), but does not specify the exact fields.

We need your input on what to include. Here is our starting proposal:

#### Player Bio & Info
| Field | Type | Notes |
|-------|------|-------|
| Photo | Image upload | Profile picture |
| Date of birth | Date | |
| Nationality | Text | |
| Position | Select | GK, CB, LB, RB, CM, CAM, CDM, LW, RW, ST |
| Squad number | Number | |
| Preferred foot | Select | Left / Right / Both |
| Height (cm) | Number | |
| Weight (kg) | Number | |
| Phone | Text | Player's personal phone |
| Personal email | Text | Separate from login email |
| Address | Text | |
| Emergency contact name | Text | |
| Emergency contact relationship | Text | |
| Emergency contact phone | Text | |

#### Performance Stats (per match, manually entered by admins)
| Field | Type |
|-------|------|
| Match date | Date |
| Opponent | Text |
| Minutes played | Number |
| Goals | Number |
| Assists | Number |
| Yellow cards | Number |
| Red cards | Number |

#### Physical & Fitness Data (log entries over time, entered by admins/medical)
| Field | Type |
|-------|------|
| Date | Date |
| Weight (kg) | Number |
| Body fat (%) | Number |
| Notes / test results | Free text |

<div class="question-box">
&#10140; Please confirm, add, or remove fields from these lists. If you have an existing Excel template or form you use today for any of this data, sharing it would be very helpful.
</div>

---

## 2. Implementation Precisions

Below is a summary of how we plan to build each module. This is shared for full transparency so you know what to expect at the Sprint Demo.

### Calendar & Scheduling

Events will include both a start and end time, along with a dedicated location field. We will build full recurrence support (daily, weekly, bi-weekly, monthly) with the ability to set an end date for a series and to modify or cancel individual occurrences independently.

Event creation will be admin-only. All other roles (Coach, Player, Staff) will be able to view events and submit their RSVP responses. Admins can also disable RSVPs on specific events when attendance confirmation is not needed. Events can be shared with entire roles or with specific individual users for maximum flexibility.

Users will be able to subscribe to the calendar from Google Calendar or Apple Calendar using a personal feed URL that stays up to date automatically.

The "What's on Today" view will be a dedicated full-screen page designed for display on club TVs and screens. It updates in real time as events are added or modified throughout the day.

Notifications will appear in the app via a notification center in the navigation bar, triggered whenever events are created, updated, or cancelled. Event types (Match, Training, Meeting, Rehab) will each have a distinct color on the calendar for easy visual scanning.

### Document Hub

Admins will be able to upload PDFs, images, spreadsheets, and video links. Video links open directly in the source platform (YouTube, Hudl, Wyscout) for the best playback experience. When an admin needs to update a document, they can replace the file directly from the document's detail view.

Read tracking will show admins how many users have opened each document (e.g. "Opened by 18/25"), giving visibility into whether the team is engaging with shared materials.

Documents support granular permissions: admins control access at the role level and can also share individual documents or folders with specific users. The search and filtering system lets users find documents by name, type, or folder.

### Player Profiles

Player profiles will include a comprehensive bio section, a performance stats log (per match, manually entered by admins), a physical/fitness data log (entered by admins or medical staff), and an injury history section (accessible only to medical staff) to track both current and historic injuries over time.

To prepare for future integration with external data providers (GPS trackers, performance platforms), each player profile will include a section where admins can configure external account/ID links. This will allow seamless data import once the integrations are built in future sprints.

Contract management will be admin-only and hidden from non-admin users. We will build the contract section with AI-powered data extraction from uploaded PDFs, reproducing the functionality from your current platform (automatic extraction of salary, bonuses, clauses, duration, and termination terms).

Players will be able to view their own profile, stats, fitness data, and contract details. They can update their own contact information and emergency contacts. All other fields remain admin-managed.

Player statuses include "Active", "On Loan", and "Left the Club". Admins can change a player's status at any time. Players marked as "Left the Club" have their account deactivated, but their profile remains accessible to admins for reference. "On Loan" players retain their account access with a visible status indicator. Any status can be changed back if circumstances change (e.g. a loaned player returning).

### Backend & Infrastructure

For this rebuild, we will use Convex as the backend framework. This is a deliberate technical choice that brings several concrete benefits to the project:

**Real-time by default.** Every screen in the platform updates instantly when data changes. When an admin creates a calendar event, it appears on every connected user's screen immediately. When a document is uploaded, the list refreshes automatically. This means features like the "What's on Today" TV display and the notification center work seamlessly without any extra engineering effort.

**Improved stability and maintainability.** Convex provides end-to-end type safety from the database to the frontend, which significantly reduces bugs and makes the codebase easier to maintain and extend in future sprints. The access control logic (team isolation, role-based permissions) is enforced directly in the data layer, making it robust and auditable.

**No impact on your workflow.** From your perspective, the platform will look and behave exactly the same. The dashboard, the admin panel, the user experience are all identical. The difference is under the hood: a more reliable, faster, and easier-to-extend foundation.

**Cost and hosting.** Convex pricing is comparable to Supabase for this scale of usage. We will handle the full migration of your existing data models, so there is no extra work on your side.

Your existing data models and security rules will be migrated to Convex schemas with the same level of team isolation and role-based access you have today.

### General Approach

We will build a professional, production-ready UI with a clean, modern design consistent across all three modules. "Players" will appear as a main navigation item in the sidebar alongside Calendar and Documents.

The homepage will follow the same structure as your current platform (quick access to dashboards, next match, today's events, recent results) with the new modules integrated seamlessly.

---

## Next Steps

1. Please review and respond to the 3 questions highlighted above.
2. Once we have your answers, we will finalize the technical specification and begin implementation.
3. We will share access to the staging environment as work progresses.

Looking forward to your feedback.

Best regards,
NativeSquare
