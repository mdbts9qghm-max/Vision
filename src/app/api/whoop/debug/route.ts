import { NextResponse } from "next/server";
import { isAuthenticated } from "@/server/auth";
import { getConnection } from "@/server/whoop/client";
import { needsRefresh } from "@/domain/whoop";
import { WHOOP_API_BASE } from "@/server/whoop/config";

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
      headers: { Authorization: `Bearer ${token}` },
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
    {
      label: "refresh->v2/recovery (Vertausch-Test)",
      ...(await probe("/v2/recovery?limit=1", conn.refreshToken)),
    },
    { label: "access->v2/profile", ...(await probe("/v2/user/profile/basic", token)) },
  ];

  return NextResponse.json(
    { info, probes },
    { headers: { "Cache-Control": "no-store" } },
  );
}
