/**
 * Hudl GraphQL mapping: StatsBomb match ID -> Wyscout match ID.
 *
 * Story 8.3 — AC1: Sends a GraphQL query to the Hudl mapping API.
 * Ported from football-dashboard-2/src/lib/hudl.ts.
 */

import { ConfigError } from "./auth";

interface GslMappedIdentifiersResponse {
  data: {
    gslMappedIdentifiers: {
      externalIdentifiers: Array<{
        externalSourceId: string;
        externalSource: string;
      }>;
    };
  };
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new ConfigError(name);
  }
  return value;
}

/**
 * Resolve a StatsBomb match ID to its corresponding Wyscout match ID
 * via the Hudl GraphQL mapping API.
 *
 * @returns The Wyscout match ID, or null if no mapping exists.
 * @throws ConfigError if env vars are missing
 * @throws Error if the upstream API call fails
 */
export async function getWyscoutMatchId(
  statsbombMatchId: string
): Promise<string | null> {
  const hudlUrl = requireEnv("HUDL_MAPPING_URL");
  const hudlToken = requireEnv("HUDL_MAPPING_TOKEN");

  // Sanitize match ID to prevent GraphQL injection (only alphanumeric + hyphens allowed)
  const sanitizedId = statsbombMatchId.replace(/[^a-zA-Z0-9\-_]/g, "");
  if (sanitizedId !== statsbombMatchId) {
    throw new Error(
      `Invalid statsbombMatchId: contains disallowed characters`
    );
  }

  const query = `
    query GslMappedIdentifiers {
      gslMappedIdentifiers(input: {
        externalId: "${sanitizedId}"
        externalEntityType: STATSBOMB_MATCH
        externalEntitySource: STATSBOMB_GLOBAL_FOOTBALL_SBD
      }) {
        externalIdentifiers {
          externalSourceId
          externalSource
        }
      }
    }
  `;

  const response = await fetch(hudlUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hudl-ApiToken": hudlToken,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Hudl API request failed (${response.status}): ${text}`
    );
  }

  const data = (await response.json()) as GslMappedIdentifiersResponse;

  const wyscoutIdentifier =
    data.data?.gslMappedIdentifiers?.externalIdentifiers?.find(
      (id) => id.externalSource === "WYSCOUT"
    );

  return wyscoutIdentifier?.externalSourceId ?? null;
}
