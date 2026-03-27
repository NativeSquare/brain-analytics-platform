/**
 * Calendar event constants and types.
 * Single source of truth for event type and recurrence values.
 */

import { z } from "zod";
import { USER_ROLES } from "./roles";

export const EVENT_TYPES = ["match", "training", "meeting", "rehab"] as const;

export type EventType = (typeof EVENT_TYPES)[number];

/** Semantic color keys — actual Tailwind classes live in the EventTypeBadge component. */
export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  match: "red",
  training: "green",
  meeting: "blue",
  rehab: "orange",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  match: "Match",
  training: "Training",
  meeting: "Meeting",
  rehab: "Rehab",
};

export const RECURRENCE_FREQUENCIES = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
] as const;

export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

// ---------------------------------------------------------------------------
// Zod validation schema for event creation form (Story 3.2)
// ---------------------------------------------------------------------------

/** Base event fields shared by one-off and recurring schemas. */
const baseEventFields = {
  name: z.string().min(1, "Event name is required").max(200, "Event name must be 200 characters or less"),
  eventType: z.enum(EVENT_TYPES, { message: "Please select an event type" }),
  startsAt: z.number({ message: "Start date/time is required" }),
  endsAt: z.number({ message: "End date/time is required" }),
  location: z.string().max(200, "Location must be 200 characters or less").optional(),
  description: z.string().max(2000, "Description must be 2000 characters or less").optional(),
  rsvpEnabled: z.boolean(),
  invitedRoles: z.array(z.enum(USER_ROLES)),
  invitedUserIds: z.array(z.string()),
};

export const createEventSchema = z
  .object({
    ...baseEventFields,
    isRecurring: z.literal(false).optional(),
  })
  .refine((data) => data.endsAt > data.startsAt, {
    message: "End time must be after start time",
    path: ["endsAt"],
  })
  .refine((data) => data.invitedRoles.length > 0 || data.invitedUserIds.length > 0, {
    message: "At least one role or user must be invited",
    path: ["invitedRoles"],
  });

export type CreateEventFormData = z.infer<typeof createEventSchema>;

// ---------------------------------------------------------------------------
// Zod validation schema for recurring event creation (Story 3.3)
// ---------------------------------------------------------------------------

const MAX_SERIES_SPAN_MS = 365 * 24 * 60 * 60 * 1000;

export const createRecurringEventSchema = z
  .object({
    ...baseEventFields,
    isRecurring: z.literal(true),
    frequency: z.enum(RECURRENCE_FREQUENCIES, { message: "Please select a recurrence frequency" }),
    endDate: z.number({ message: "Series end date is required" }),
  })
  .refine((data) => data.endsAt > data.startsAt, {
    message: "End time must be after start time",
    path: ["endsAt"],
  })
  .refine((data) => data.invitedRoles.length > 0 || data.invitedUserIds.length > 0, {
    message: "At least one role or user must be invited",
    path: ["invitedRoles"],
  })
  .refine((data) => data.endDate > data.startsAt, {
    message: "Series end date must be after the event start date",
    path: ["endDate"],
  })
  .refine((data) => data.endDate - data.startsAt <= MAX_SERIES_SPAN_MS, {
    message: "Series cannot span more than 1 year",
    path: ["endDate"],
  });

export type CreateRecurringEventFormData = z.infer<typeof createRecurringEventSchema>;

/** Discriminated form data: either one-off or recurring. */
export type EventFormData = CreateEventFormData | CreateRecurringEventFormData;

// ---------------------------------------------------------------------------
// Recurrence frequency labels (for UI display)
// ---------------------------------------------------------------------------

export const RECURRENCE_FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Bi-Weekly",
  monthly: "Monthly",
};
