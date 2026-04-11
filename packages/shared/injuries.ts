/**
 * Injury classification constants for the Brain Analytics Platform.
 *
 * Single source of truth for ALL injury classification enums.
 * When the client provides their injury taxonomy CSV, update the values here
 * and all consumers (backend validators, Zod schemas, UI dropdowns) will
 * pick up the changes automatically.
 */

// ---------------------------------------------------------------------------
// Body Regions
// ---------------------------------------------------------------------------

export const BODY_REGIONS = [
  "head",
  "neck",
  "shoulder",
  "upper_arm",
  "elbow",
  "forearm",
  "wrist",
  "hand",
  "chest",
  "abdomen",
  "upper_back",
  "lower_back",
  "hip",
  "groin",
  "thigh",
  "knee",
  "shin",
  "calf",
  "ankle",
  "foot",
] as const;

export type BodyRegion = (typeof BODY_REGIONS)[number];

export const BODY_REGION_LABELS: Record<BodyRegion, string> = {
  head: "Head",
  neck: "Neck",
  shoulder: "Shoulder",
  upper_arm: "Upper Arm",
  elbow: "Elbow",
  forearm: "Forearm",
  wrist: "Wrist",
  hand: "Hand",
  chest: "Chest",
  abdomen: "Abdomen",
  upper_back: "Upper Back",
  lower_back: "Lower Back",
  hip: "Hip",
  groin: "Groin",
  thigh: "Thigh",
  knee: "Knee",
  shin: "Shin",
  calf: "Calf",
  ankle: "Ankle",
  foot: "Foot",
};

// ---------------------------------------------------------------------------
// Injury Mechanisms
// ---------------------------------------------------------------------------

export const INJURY_MECHANISMS = [
  "contact",
  "non_contact",
  "overuse",
] as const;

export type InjuryMechanism = (typeof INJURY_MECHANISMS)[number];

export const INJURY_MECHANISM_LABELS: Record<InjuryMechanism, string> = {
  contact: "Contact",
  non_contact: "Non-Contact",
  overuse: "Overuse",
};

// ---------------------------------------------------------------------------
// Injury Sides
// ---------------------------------------------------------------------------

export const INJURY_SIDES = ["left", "right", "bilateral", "na"] as const;

export type InjurySide = (typeof INJURY_SIDES)[number];

export const INJURY_SIDE_LABELS: Record<InjurySide, string> = {
  left: "Left",
  right: "Right",
  bilateral: "Bilateral",
  na: "N/A",
};

// ---------------------------------------------------------------------------
// Injury Statuses (extended from Story 5.5)
// ---------------------------------------------------------------------------
// Previous values: ["current", "recovered"]
// New values: ["active", "rehab", "assessment", "cleared"]
// Backward compat mapping: "current" -> "active", "recovered" -> "cleared"

export const INJURY_STATUSES = [
  "active",
  "rehab",
  "assessment",
  "cleared",
] as const;

export type InjuryStatus = (typeof INJURY_STATUSES)[number];

export const INJURY_STATUS_LABELS: Record<InjuryStatus, string> = {
  active: "Active",
  rehab: "In Rehab",
  assessment: "Under Assessment",
  cleared: "Cleared",
};

/**
 * Maps legacy status values to new status values.
 * Used for backward compatibility with existing data.
 */
export const LEGACY_STATUS_MAP: Record<string, InjuryStatus> = {
  current: "active",
  recovered: "cleared",
};

// ---------------------------------------------------------------------------
// Injury Severities (unchanged from Story 5.5, but labels added)
// ---------------------------------------------------------------------------

export const INJURY_SEVERITIES = ["minor", "moderate", "severe"] as const;

export type InjurySeverity = (typeof INJURY_SEVERITIES)[number];

export const INJURY_SEVERITY_LABELS: Record<InjurySeverity, string> = {
  minor: "Minor",
  moderate: "Moderate",
  severe: "Severe",
};
