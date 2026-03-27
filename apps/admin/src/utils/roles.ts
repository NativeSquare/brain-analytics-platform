/**
 * Role and status constants for the admin app.
 * Mirrors @packages/shared/roles — kept local to avoid adding a cross-package
 * dependency on @packages/shared in the admin app.
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

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  coach: "Coach",
  analyst: "Analyst",
  physio: "Physio / Medical",
  player: "Player",
  staff: "Staff",
};

export const USER_STATUSES = ["active", "invited", "deactivated"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];
