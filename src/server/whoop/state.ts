/**
 * Zustandsloser CSRF-State für den WHOOP-OAuth-Flow. Statt den State in einem
 * Cookie zwischenzuspeichern (was zwischen Safari und PWA verloren geht),
 * signieren wir ihn mit dem SESSION_SECRET per HMAC und prüfen im Rücksprung
 * nur die Signatur. Web Crypto → läuft in Node- und Edge-Runtime.
 */

const enc = new TextEncoder();

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET fehlt oder ist zu kurz (min. 16 Zeichen).");
  }
  return s;
}

async function hmacHex(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Signierten State erzeugen: `<nonce>.<ts>.<hmac>`. */
export async function signState(now: number = Date.now()): Promise<string> {
  const payload = `${crypto.randomUUID()}.${now}`;
  return `${payload}.${await hmacHex(payload)}`;
}

/** Signatur + Alter prüfen (Standard 10 Min gültig). */
export async function verifyState(
  state: string | null,
  now: number = Date.now(),
  maxAgeMs = 10 * 60 * 1000,
): Promise<boolean> {
  if (!state) return false;
  const parts = state.split(".");
  if (parts.length !== 3) return false;
  const [nonce, ts, sig] = parts;
  const expected = await hmacHex(`${nonce}.${ts}`);
  if (sig !== expected) return false;
  const t = Number(ts);
  if (!Number.isFinite(t)) return false;
  return now - t <= maxAgeMs && now >= t - 60_000;
}
