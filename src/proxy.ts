import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/server/session";

/**
 * Schützt alle Routen außer Login und statischen Dateien.
 * (Next 16: proxy.ts ist der Nachfolger von middleware.ts.)
 * Die eigentliche Signaturprüfung läuft per Web Crypto (Edge-kompatibel).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const authed = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (pathname === "/login") {
    if (authed) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!authed) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Alles außer Next-Interna, API-Routen (eigene Auth) und statischen
  // Assets (Dateien mit Endung). /api/health bleibt so öffentlich (Keep-warm).
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
