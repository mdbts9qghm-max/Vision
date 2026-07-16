import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";

// Öffentlicher Keep-warm-Endpunkt (kein Auth, siehe proxy.ts-Matcher).
// Ein externer Ping-Dienst (z. B. UptimeRobot, alle 5 Min.) ruft ihn auf und
// hält so die Vercel-Function UND die Turso-Verbindung warm — keine Cold-Starts.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await db.run(sql`select 1`);
    return NextResponse.json(
      { ok: true, ts: Date.now() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
