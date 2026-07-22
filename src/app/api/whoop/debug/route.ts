import { NextResponse } from "next/server";
import { isAuthenticated } from "@/server/auth";
import { getConnection } from "@/server/whoop/client";
import { needsRefresh } from "@/domain/whoop";
import {
  WHOOP_API_BASE,
  WHOOP_TOKEN_URL,
  WHOOP_USER_AGENT,
  whoopClientId,
  whoopClientSecret,
} from "@/server/whoop/config";

/** Probiert eine Refresh-Variante und meldet Status + Antwort (kein Speichern). */
async function tryRefresh(
  refreshToken: string,
  opts: { basic: boolean; scope: boolean },
): Promise<{ variant: string; status: number; body: string }> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": WHOOP_USER_AGENT,
    Accept: "application/json",
  };
  if (opts.basic) {
    const cred = Buffer.from(
      `${whoopClientId()}:${whoopClientSecret()}`,
    ).toString("base64");
    headers.Authorization = `Basic ${cred}`;
  } else {
    body.set("client_id", whoopClientId());
    body.set("client_secret", whoopClientSecret());
  }
  if (opts.scope) body.set("scope", "offline");

  const variant = `${opts.basic ? "basic" : "body"}Auth${opts.scope ? "+scope" : ""}`;
  try {
    const res = await fetch(WHOOP_TOKEN_URL, { method: "POST", headers, body });
    const text = await res.text().catch(() => "");
    return { variant, status: res.status, body: text.slice(0, 90) };
  } catch (e) {
    return { variant, status: 0, body: e instanceof Error ? e.message : String(e) };
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Geschützter Diagnose-Endpunkt: zeigt den Token-Zustand und was die WHOOP-API
 * auf ein paar Test-Requests antwortet. Gibt NIE das echte Token aus (nur
 * Länge + kurzer Präfix), damit nichts geleakt wird.
 */
async function probe(path: string, token: string) {
  try {
    const res = await fetch(`${WHOOP_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": WHOOP_USER_AGENT,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const body = await res.text().catch(() => "");
    return { path, status: res.status, body: body.slice(0, 250) };
  } catch (e) {
    return { path, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const conn = await getConnection();
  if (!conn) return NextResponse.json({ connected: false });

  const token = conn.accessToken;
  const info = {
    connected: true,
    scope: conn.scope,
    expiresAt: conn.expiresAt,
    needsRefresh: needsRefresh(conn.expiresAt),
    accessTokenLen: token?.length ?? 0,
    accessTokenPrefix: token ? token.slice(0, 8) : null,
    accessLooksJwt: token?.startsWith("ey") ?? false,
    refreshTokenLen: conn.refreshToken?.length ?? 0,
    refreshTokenPrefix: conn.refreshToken ? conn.refreshToken.slice(0, 8) : null,
    accessEqualsRefresh: token === conn.refreshToken,
    tokenMeta: conn.tokenMeta,
    lastSyncAt: conn.lastSyncAt,
  };

  const probes = [
    { label: "access->v2/recovery", ...(await probe("/v2/recovery?limit=1", token)) },
    { label: "access->v2/profile", ...(await probe("/v2/user/profile/basic", token)) },
  ];

  // Refresh-Format-Test: 4 gängige Varianten nacheinander. Die erste, die 200
  // liefert, verrät das korrekte Format. (Ein Erfolg verbraucht das Refresh-
  // Token — spätere Varianten scheitern dann; das ist ok fürs Diagnostizieren.)
  const refreshVariants = [
    await tryRefresh(conn.refreshToken, { basic: false, scope: true }),
    await tryRefresh(conn.refreshToken, { basic: false, scope: false }),
    await tryRefresh(conn.refreshToken, { basic: true, scope: true }),
    await tryRefresh(conn.refreshToken, { basic: true, scope: false }),
  ];

  return NextResponse.json(
    { info, probes, refreshVariants },
    { headers: { "Cache-Control": "no-store" } },
  );
}
