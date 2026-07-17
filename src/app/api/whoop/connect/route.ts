import { NextResponse } from "next/server";
import { isAuthenticated } from "@/server/auth";
import { whoopConfigured, whoopRedirectUri } from "@/server/whoop/config";
import { buildAuthUrl } from "@/server/whoop/oauth";
import { signState } from "@/server/whoop/state";

export const dynamic = "force-dynamic";

/** Startet den WHOOP-OAuth-Flow und leitet zum Consent-Screen. */
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
  // Signierter, zustandsloser State — kein Cookie nötig.
  const state = await signState();
  return NextResponse.redirect(
    buildAuthUrl(whoopRedirectUri(url.origin), state),
  );
}
