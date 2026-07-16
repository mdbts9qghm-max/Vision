/**
 * WHOOP-OAuth-Konfiguration. Client-ID/Secret kommen aus den Env-Variablen
 * (in Vercel hinterlegen — niemals committen). Die Redirect-URI wird aus dem
 * Request-Origin abgeleitet, damit sie lokal wie in Produktion stimmt.
 */

export const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
export const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
export const WHOOP_API_BASE = "https://api.prod.whoop.com/developer";

// offline = Refresh-Token; der Rest sind Lesezugriffe für unsere Werte.
export const WHOOP_SCOPES = [
  "offline",
  "read:recovery",
  "read:sleep",
  "read:profile",
];

export const WHOOP_CALLBACK_PATH = "/api/whoop/callback";

export function whoopClientId(): string {
  const id = process.env.WHOOP_CLIENT_ID;
  if (!id) throw new Error("WHOOP_CLIENT_ID fehlt (Env-Variable setzen).");
  return id;
}

export function whoopClientSecret(): string {
  const secret = process.env.WHOOP_CLIENT_SECRET;
  if (!secret) throw new Error("WHOOP_CLIENT_SECRET fehlt (Env-Variable setzen).");
  return secret;
}

/** Sind die Zugangsdaten überhaupt konfiguriert? (für die UI). */
export function whoopConfigured(): boolean {
  return !!process.env.WHOOP_CLIENT_ID && !!process.env.WHOOP_CLIENT_SECRET;
}

/** Redirect-URI aus dem Request ableiten (muss im WHOOP-Dashboard stehen). */
export function whoopRedirectUri(origin: string): string {
  return `${origin}${WHOOP_CALLBACK_PATH}`;
}
