"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";

/**
 * Hook to get the current user's own staff profile.
 *
 * Story 13.4 AC #13: Returns the staff profile (or null if no linked profile).
 * Returns undefined while loading.
 */
export function useOwnStaffProfile() {
  const profile = useQuery(api.staff.queries.getOwnStaffProfile, {});
  return profile;
}
