import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAuthenticated } from "@/server/auth";
import { whoopRedirectUri } from "@/server/whoop/config";
import { exchangeCode } from "@/server/whoop/oauth";
import { saveTokens } from "@/server/whoop/client";
import { syncWhoop } from "@/server/whoop/sync";

export const dynamic = "force-dynamic";

/** OAuth-Rücksprung von WHOOP: State prüfen, Code tauschen, Tokens sichern. */
export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const store = await cookies();
  const savedState = store.get("whoop_oauth_state")?.value;
  store.delete("whoop_oauth_state");

  const back = (status: string) =>
    NextResponse.redirect(new URL(`/dashboard?whoop=${status}`, request.url));

  if (oauthError) return back("denied");
  if (!code || !state || !savedState || state !== savedState) {
    return back("error");
  }

  try {
    const tokens = await exchangeCode(code, whoopRedirectUri(url.origin));
    await saveTokens(tokens);
    // Direkt einmal synchronisieren, damit sofort Werte da sind (best effort).
    try {
      await syncWhoop();
    } catch {
      // Sync-Fehler ignorieren — Verbindung steht trotzdem.
    }
    return back("connected");
  } catch {
    return back("error");
  }
}
