# Open Questions — Sprint 2 & Sprint 3

This document tracks all open questions that require client input before or during Sprint 2 and Sprint 3. Each question has a unique ID referenced from the corresponding stories in `epics.md`.

**How to use this document:**
1. Alex sends relevant questions to Ryan/client before each sprint starts
2. Client answers are recorded in the "Answer" field
3. Once answered, Alex notifies the dev agent, who updates the affected stories
4. Status moves from `OPEN` → `ANSWERED`

---

## Sprint 2 — Staff & Medical

### Q-S2-01: Staff certification types

- **Context:** The proposal mentions "certifications with expiry tracking" and "auto-alerts 30 days before expiry" for staff profiles.
- **Question:** What types of certifications does Sampdoria track for staff? (e.g., DBS checks, coaching badges UEFA A/B/Pro, medical licenses, safeguarding certificates, first aid). Do we need predefined categories or a fully flexible system?
- **Affects:** Story 7.3 (Certification Tracking & Expiry Alerts)
- **Impact if unanswered:** We'll build a generic key-value system (certification name + expiry date). If they want predefined categories with specific validation rules, stories will need revision.
- **Status:** `OPEN`
- **Answer:**

### Q-S2-02: Staff profile fields

- **Context:** The proposal lists "bios, job titles" but doesn't detail the full field list.
- **Question:** Beyond name, job title, photo, phone, and email — what other fields are needed for staff profiles? (e.g., department, date joined, qualifications, specialization for physios, languages spoken)
- **Affects:** Story 7.1 (Staff Data Model & Directory View), Story 7.2 (Staff Profile Creation)
- **Impact if unanswered:** We'll mirror the player profile approach (core bio fields + contact info) and keep it extensible. Fields can be added later without schema changes.
- **Status:** `OPEN`
- **Answer:**

### Q-S2-03: Staff permission granularity

- **Context:** The proposal mentions "permission levels (Physio vs Scout, etc.)". We already have role-based access (Admin, Coach, Analyst, Physio/Medical, Player, Staff) from Sprint 1.
- **Question:** Are the existing 6 roles sufficient for staff permission levels, or does the client need more granular permissions within the staff directory? (e.g., "Head Coach can see all staff, Assistant Coach can only see their department")
- **Affects:** Story 7.4 (Staff Permission Levels)
- **Impact if unanswered:** We'll reuse the existing role system. If they need department-level scoping, this becomes a more significant data model change.
- **Status:** `OPEN`
- **Answer:**

### Q-S2-04: Injury classification system

- **Context:** The proposal specifically mentions "Orchard Codes and Mechanism of Injury" — this is a standardized sports medicine classification system.
- **Question:** Does the Sampdoria medical team actually use Orchard Codes? Or would a simpler classification (body part + injury type + severity) be more practical? If they use Orchard Codes, can they provide the subset they use?
- **Affects:** Story 8.1 (Injury Data Model & Classification)
- **Impact if unanswered:** We'll implement a simpler classification (body region, injury type dropdown, severity scale) with the ability to add Orchard Codes later as an optional field. If they want full Orchard Code integration, the data model and UI will be more complex.
- **Status:** `OPEN`
- **Answer:**

### Q-S2-05: Injury status workflow

- **Context:** The proposal mentions color-coded statuses: Red (Out), Yellow (Modified Training), Green (Cleared). This implies a specific return-to-play workflow.
- **Question:** Is the Red/Yellow/Green status system what the medical team uses today? Are there intermediate states? Who can change an injury status — only medical staff, or can coaches also mark a player as "Cleared"?
- **Affects:** Story 8.3 (Injury Status & Return-to-Play Tracking)
- **Impact if unanswered:** We'll implement the 3-status system (Out/Modified/Cleared) restricted to medical staff. If coaches need visibility or update rights, permission logic changes.
- **Status:** `OPEN`
- **Answer:**

---

## Sprint 3 — Scouting & Communications

### Q-S3-01: Scouting report format (Jesper input needed)

- **Context:** The proposal states "Scouting report format to be confirmed with Jesper before Sprint 3". This is a named prerequisite in the original SOW.
- **Question:** What fields does Jesper want in a scouting report? (e.g., target player info, current club, position, age, market value, strengths/weaknesses, video links, scout's recommendation). What does the grading system look like — numerical (1-10), letter grades, star ratings?
- **Affects:** Story 9.1 (Scouting Data Model), Story 9.2 (Report Creation), Story 9.3 (Grading & Recommendations)
- **Impact if unanswered:** This blocks the entire scouting epic design. Without knowing the report format, we cannot build the data model or UI. We'll need Jesper's input at least 1 week before Sprint 3 starts.
- **Status:** `OPEN`
- **Answer:**

### Q-S3-02: Shadow team positions and categories

- **Context:** The proposal mentions "Visual pitch view with targets ranked by position" and categories "Immediate, Development, Emergency/Loan".
- **Question:** How many shadow teams can exist at once? Is it one per season, or multiple (e.g., one per window)? Are the 3 categories (Immediate/Development/Emergency) fixed or should admins be able to create custom categories?
- **Affects:** Story 10.1 (Shadow Team Data Model & Pitch View), Story 10.2 (Category Management)
- **Impact if unanswered:** We'll build one active shadow team with the 3 fixed categories and allow archiving per transfer window. If they need multiple concurrent shadow teams, the data model needs an additional layer.
- **Status:** `OPEN`
- **Answer:**

### Q-S3-03: WhatsApp Business API setup

- **Context:** The proposal notes "WhatsApp Business API access and credentials need to be provided or set up jointly". This is a hard technical prerequisite.
- **Question:** Does BrainAnalytics/Sampdoria already have a WhatsApp Business account? If not, we need to set one up (requires a dedicated phone number and Meta Business verification, which can take 1-2 weeks).
- **Affects:** Story 11.1 (WhatsApp Business API Integration) — blocks the entire notification epic
- **Impact if unanswered:** Without API access, we cannot build or test WhatsApp notifications. This needs to be initiated at least 2 weeks before Sprint 3 starts.
- **Status:** `OPEN`
- **Prerequisites:**
  - [ ] WhatsApp Business account created
  - [ ] Meta Business Manager verification completed
  - [ ] Dedicated phone number assigned
  - [ ] API credentials shared with dev team
- **Answer:**

### Q-S3-04: WhatsApp notification triggers

- **Context:** The proposal mentions "automated triggers: new events, schedule changes, reminders" and "manual broadcasts".
- **Question:** Which events should trigger automatic WhatsApp messages? (e.g., new calendar event, event cancelled, event in 24h reminder, new document uploaded, injury status change). What's the expected volume — are we talking 5-10 messages/day or 50+?
- **Affects:** Story 11.2 (Automated Notification Triggers), Story 11.3 (Admin Broadcast & Templates)
- **Impact if unanswered:** We'll start with calendar event triggers only (create/update/cancel + 24h reminder) and add other triggers incrementally. Volume affects rate limiting and cost.
- **Status:** `OPEN`
- **Answer:**

### Q-S3-05: WhatsApp message templates & language

- **Context:** WhatsApp Business API requires pre-approved message templates for outbound messages. Templates must be submitted to Meta for review (24-48h approval).
- **Question:** What language should templates be in? (Italian for Sampdoria? English? Both?) Does the client want to customize message wording, or are standard templates fine?
- **Affects:** Story 11.3 (Admin Broadcast & Templates)
- **Impact if unanswered:** We'll create English templates as default. If Italian is needed, we need translations before Sprint 3 starts so templates can be submitted for Meta approval.
- **Status:** `OPEN`
- **Answer:**

### Q-S3-06: Notification opt-in/opt-out scope

- **Context:** The proposal mentions "opt-in/out for privacy compliance". WhatsApp notifications in the EU are subject to GDPR.
- **Question:** Should users opt-in (explicit consent required before any message) or opt-out (enabled by default, users can disable)? Does the client have a privacy policy that covers WhatsApp communications?
- **Affects:** Story 11.4 (User Opt-in/Opt-out & Privacy)
- **Impact if unanswered:** We'll default to opt-in (GDPR-safe). This means users won't receive WhatsApp notifications until they explicitly enable them in their profile settings.
- **Status:** `OPEN`
- **Answer:**

---

## Timeline & Action Items

| Action | Owner | Deadline | Notes |
|--------|-------|----------|-------|
| Send Sprint 2 questions (Q-S2-*) to Ryan | Alex | Before Sprint 2 kick-off | Staff + Injury questions |
| Get Jesper's scouting report format (Q-S3-01) | Alex → Ryan | 1 week before Sprint 3 | Blocks entire Epic 9 |
| Initiate WhatsApp Business setup (Q-S3-03) | Alex → Ryan | 2 weeks before Sprint 3 | Meta verification takes time |
| Send Sprint 3 questions (Q-S3-*) to Ryan | Alex | During Sprint 2 | Get answers early |
