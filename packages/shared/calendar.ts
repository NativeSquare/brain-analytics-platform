/**
 * Calendar event constants and types.
 * Single source of truth for event type and recurrence values.
 */

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
