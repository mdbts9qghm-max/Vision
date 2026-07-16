/**
 * WHOOP-API-Client: hält die Tokens in der DB, erneuert sie bei Bedarf und
 * kapselt authentifizierte GET-Requests gegen die WHOOP v2-API.
 */

import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { whoopConnection } from "@/server/db/schema";
import { expiryFromNow, needsRefresh } from "@/domain/whoop";
import { WHOOP_API_BASE } from "./config";
import { refreshTokens, type WhoopTokens } from "./oauth";

export type WhoopConnection = typeof whoopConnection.$inferSelect;

export async function getConnection(): Promise<WhoopConnection | undefined> {
  const rows = await db
    .select()
    .from(whoopConnection)
    .where(eq(whoopConnection.id, "singleton"))
    .limit(1);
  return rows[0];
}

/** Tokens speichern (Upsert der Singleton-Zeile). */
export async function saveTokens(tokens: WhoopTokens): Promise<void> {
  const row = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: expiryFromNow(tokens.expiresIn),
    scope: tokens.scope ?? null,
    updatedAt: new Date().toISOString(),
  };
  await db
    .insert(whoopConnection)
    .values({ id: "singleton", ...row })
    .onConflictDoUpdate({ target: whoopConnection.id, set: row });
}

export async function disconnect(): Promise<void> {
  await db.delete(whoopConnection).where(eq(whoopConnection.id, "singleton"));
}

export async function markSynced(now = new Date()): Promise<void> {
  await db
    .update(whoopConnection)
    .set({ lastSyncAt: now.toISOString() })
    .where(eq(whoopConnection.id, "singleton"));
}

/** Gültiges Access-Token holen — erneuert automatisch, wenn es (fast) abläuft. */
async function validAccessToken(conn: WhoopConnection): Promise<string> {
  if (!needsRefresh(conn.expiresAt)) return conn.accessToken;
  const tokens = await refreshTokens(conn.refreshToken);
  await saveTokens(tokens);
  return tokens.accessToken;
}

/**
 * Authentifizierter GET gegen die WHOOP-API. Bei 401 wird einmal erneuert und
 * erneut versucht (falls das Token serverseitig doch abgelaufen war).
 */
export async function whoopGet<T>(path: string): Promise<T> {
  const conn = await getConnection();
  if (!conn) throw new Error("WHOOP ist nicht verbunden.");

  let token = await validAccessToken(conn);
  let res = await fetch(`${WHOOP_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (res.status === 401) {
    const tokens = await refreshTokens(conn.refreshToken);
    await saveTokens(tokens);
    token = tokens.accessToken;
    res = await fetch(`${WHOOP_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`WHOOP-API ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}
