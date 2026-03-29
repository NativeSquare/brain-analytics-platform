"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";

/**
 * Hook wrapping `getOwnPlayerProfile` query.
 *
 * Story 5.6 AC #13: Provides the authenticated player's profile
 * for the "My Profile" navigation shortcut.
 *
 * Returns:
 * - `undefined` while loading
 * - `null` if the user has no linked player profile
 * - The full player object with `photoUrl` if found
 */
export function useOwnPlayerProfile() {
  return useQuery(api.players.queries.getOwnPlayerProfile, {});
}
