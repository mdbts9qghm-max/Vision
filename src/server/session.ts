/**
 * Session-Token: `<expiry-unix>.<hmac>` — signiert mit SESSION_SECRET.
 * Nutzt ausschließlich Web Crypto, damit derselbe Code in Node (Server
 * Actions) und in der Edge-Runtime (middleware) läuft.
 */

export const SESSION_COOKIE = "vision_session";

/** Session-Laufzeit: 180 Tage (iOS begrenzt Cookies ohnehin clientseitig). */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET fehlt oder ist zu kurz (min. 16 Zeichen) — siehe .env.example",
    );
  }
  return secret;
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Konstantzeit-Vergleich, um Timing-Seitenkanäle zu vermeiden. */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) {
    diff |= (ab[i % ab.length] ?? 0) ^ (bb[i % bb.length] ?? 0);
  }
  return diff === 0;
}

export async function createSessionToken(
  now: Date = new Date(),
): Promise<string> {
  const expiry = Math.floor(now.getTime() / 1000) + SESSION_MAX_AGE_SECONDS;
  const sig = await hmacHex(sessionSecret(), String(expiry));
  return `${expiry}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined,
  now: Date = new Date(),
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const expiryPart = token.slice(0, dot);
  const sigPart = token.slice(dot + 1);
  const expiry = Number(expiryPart);
  if (!Number.isInteger(expiry)) return false;
  const expected = await hmacHex(sessionSecret(), expiryPart);
  if (!timingSafeEqual(sigPart, expected)) return false;
  return expiry * 1000 > now.getTime();
}
