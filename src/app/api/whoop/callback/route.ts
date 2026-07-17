import { NextResponse } from "next/server";
import { isAuthenticated } from "@/server/auth";
import { whoopRedirectUri } from "@/server/whoop/config";
import { exchangeCode } from "@/server/whoop/oauth";
import { saveTokens } from "@/server/whoop/client";
import { syncWhoop } from "@/server/whoop/sync";
import { verifyState } from "@/server/whoop/state";

export const dynamic = "force-dynamic";

/** OAuth-Rücksprung von WHOOP: State-Signatur prüfen, Code tauschen, sichern. */
export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const back = (status: string, detail?: string) => {
    const target = new URL(`/dashboard?whoop=${status}`, request.url);
    if (detail) target.searchParams.set("d", detail.slice(0, 160));
    return NextResponse.redirect(target);
  };

  if (oauthError) return back("denied", oauthError);
  if (!code) return back("error", "Kein Code erhalten");
  if (!(await verifyState(state))) return back("error", "State ungültig/abgelaufen");

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
  } catch (e) {
    return back(
      "error",
      e instanceof Error ? e.message : "Token-Tausch fehlgeschlagen",
    );
  }
}
