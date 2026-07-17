import { NextResponse } from "next/server";
import { isAuthenticated } from "@/server/auth";
import { whoopConfigured, whoopRedirectUri } from "@/server/whoop/config";
import { buildAuthUrl } from "@/server/whoop/oauth";

export const dynamic = "force-dynamic";

/** Startet den WHOOP-OAuth-Flow: State setzen und zum Consent-Screen leiten. */
export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!whoopConfigured()) {
    return NextResponse.redirect(
      new URL("/dashboard?whoop=unconfigured", request.url),
    );
  }

  const url = new URL(request.url);
  const state = crypto.randomUUID();

  // Cookie DIREKT an die Redirect-Antwort hängen — nur so wird der Set-Cookie
  // Header bei einer Weiterleitung zuverlässig mitgeschickt (Next.js-Fallstrick).
  const res = NextResponse.redirect(
    buildAuthUrl(whoopRedirectUri(url.origin), state),
  );
  res.cookies.set("whoop_oauth_state", state, {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
