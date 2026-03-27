/**
 * Role and status constants for the Brain Analytics Platform.
 * Single source of truth for RBAC enum values used across backend and frontend.
 */

export const USER_ROLES = [
  "admin",
  "coach",
  "analyst",
  "physio",
  "player",
  "staff",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["active", "invited", "deactivated"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];
