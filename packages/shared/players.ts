/**
 * Player-related constants for the Brain Analytics Platform.
 * Single source of truth for player enum values used across backend and frontend.
 */

export const PLAYER_POSITIONS = [
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Forward",
] as const;

export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

export const PLAYER_STATUSES = ["active", "onLoan", "leftClub"] as const;

export type PlayerStatus = (typeof PLAYER_STATUSES)[number];

/** Human-friendly display labels for each player status. */
export const PLAYER_STATUS_LABELS: Record<PlayerStatus, string> = {
  active: "Active",
  onLoan: "On Loan",
  leftClub: "Left the Club",
};

export const PREFERRED_FOOT_OPTIONS = ["Left", "Right", "Both"] as const;

export type PreferredFoot = (typeof PREFERRED_FOOT_OPTIONS)[number];

// Re-export all injury classification constants from the dedicated injuries module.
// This maintains backward compatibility for existing imports from "@packages/shared/players".
export {
  INJURY_SEVERITIES,
  type InjurySeverity,
  INJURY_SEVERITY_LABELS,
  INJURY_STATUSES,
  type InjuryStatus,
  INJURY_STATUS_LABELS,
  LEGACY_STATUS_MAP,
  BODY_REGIONS,
  type BodyRegion,
  BODY_REGION_LABELS,
  INJURY_MECHANISMS,
  type InjuryMechanism,
  INJURY_MECHANISM_LABELS,
  INJURY_SIDES,
  type InjurySide,
  INJURY_SIDE_LABELS,
} from "./injuries";
