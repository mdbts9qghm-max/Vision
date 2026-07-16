/**
 * WHOOP-OAuth-2.0-Flow: Authorize-URL bauen, Code gegen Tokens tauschen und
 * Tokens erneuern. Reines Server-Modul (nutzt Client-Secret).
 */

import {
  WHOOP_AUTH_URL,
  WHOOP_SCOPES,
  WHOOP_TOKEN_URL,
  whoopClientId,
  whoopClientSecret,
} from "./config";

export interface WhoopTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // Sekunden
  scope?: string;
}

/** Authorize-URL für den Consent-Screen. */
export function buildAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: whoopClientId(),
    redirect_uri: redirectUri,
    scope: WHOOP_SCOPES.join(" "),
    state,
  });
  return `${WHOOP_AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

async function postToken(body: URLSearchParams): Promise<WhoopTokens> {
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`WHOOP-Token-Fehler ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as TokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
    scope: json.scope,
  };
}

/** Autorisierungscode gegen Access-/Refresh-Token tauschen. */
export function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<WhoopTokens> {
  return postToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: whoopClientId(),
      client_secret: whoopClientSecret(),
    }),
  );
}

/** Access-Token per Refresh-Token erneuern (offline scope mitschicken). */
export function refreshTokens(refreshToken: string): Promise<WhoopTokens> {
  return postToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: whoopClientId(),
      client_secret: whoopClientSecret(),
      scope: "offline",
    }),
  );
}
