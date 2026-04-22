/**
 * Wyscout OAuth2 client credentials token management.
 *
 * Story 8.3 — AC3: Obtains and caches an OAuth2 access token in-memory
 * with automatic refresh when expired or within 60 seconds of expiry.
 */

interface TokenCache {
  accessToken: string;
  expiresAt: number; // epoch ms
}

let tokenCache: TokenCache | null = null;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new ConfigError(name);
  }
  return value;
}

export class ConfigError extends Error {
  constructor(public readonly variable: string) {
    super(`Configuration error: ${variable} is not set`);
    this.name = "ConfigError";
  }
}

/**
 * Get a valid Wyscout access token, refreshing if needed.
 * Token is cached in a module-level variable (per server process).
 */
export async function getAccessToken(): Promise<string> {
  const clientId = requireEnv("WYSCOUT_CLIENT_ID");
  const clientSecret = requireEnv("WYSCOUT_CLIENT_SECRET");
  // Accept WYSCOUT_BASE_URL with or without a trailing "/videos/" segment.
  const baseUrl = requireEnv("WYSCOUT_BASE_URL")
    .replace(/\/+$/, "")
    .replace(/\/videos$/, "");

  // Return cached token if still valid (with 60s buffer)
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  // Perform OAuth2 client credentials grant
  const tokenUrl = `${baseUrl}/oauth/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Wyscout OAuth2 token request failed (${response.status}): ${text}`
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return tokenCache.accessToken;
}

/**
 * Get a Basic auth header from client credentials.
 * Used as fallback for endpoints that accept Basic auth directly.
 */
export function getBasicAuthHeader(): string {
  const clientId = requireEnv("WYSCOUT_CLIENT_ID");
  const clientSecret = requireEnv("WYSCOUT_CLIENT_SECRET");
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

/** Reset the cached token (useful for testing). */
export function _resetTokenCache(): void {
  tokenCache = null;
}
