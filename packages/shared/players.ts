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

export const INJURY_SEVERITIES = ["minor", "moderate", "severe"] as const;

export type InjurySeverity = (typeof INJURY_SEVERITIES)[number];

export const INJURY_STATUSES = ["current", "recovered"] as const;

export type InjuryStatus = (typeof INJURY_STATUSES)[number];
