/**
 * Server-side Convex HTTP client for API routes.
 *
 * Uses the authenticated user's token (from Next.js cookies) so Convex
 * functions can enforce auth/team scoping via requireAuth().
 */

import { ConvexHttpClient } from "convex/browser";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

/**
 * Get a ConvexHttpClient pre-configured with the current user's auth token.
 * Must be called within a Next.js server context (API route, server action, etc.)
 *
 * Creates a new client per call to avoid race conditions where concurrent
 * requests could overwrite each other's auth tokens on a shared singleton.
 */
export async function getAuthenticatedConvexClient(): Promise<ConvexHttpClient> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  }
  const client = new ConvexHttpClient(url);
  const token = await convexAuthNextjsToken();
  if (token) {
    client.setAuth(token);
  }
  return client;
}
