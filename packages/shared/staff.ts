/**
 * Staff-related constants for the Brain Analytics Platform.
 * Single source of truth for staff enum values used across backend and frontend.
 */

export const STAFF_DEPARTMENTS = [
  "Coaching",
  "Medical",
  "Operations",
  "Analytics",
  "Management",
  "Academy",
] as const;

export type StaffDepartment = (typeof STAFF_DEPARTMENTS)[number];

export const STAFF_STATUSES = ["active", "inactive"] as const;

export type StaffStatus = (typeof STAFF_STATUSES)[number];

/** Human-friendly display labels for each staff status. */
export const STAFF_STATUS_LABELS: Record<StaffStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};

/** Human-friendly display labels for each staff department. */
export const STAFF_DEPARTMENT_LABELS: Record<StaffDepartment, string> = {
  Coaching: "Coaching",
  Medical: "Medical",
  Operations: "Operations",
  Analytics: "Analytics",
  Management: "Management",
  Academy: "Academy",
};
