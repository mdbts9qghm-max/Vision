import { NextResponse } from "next/server";
import { syncWhoop } from "@/server/whoop/sync";

// Wird vom täglichen Vercel-Cron aufgerufen (siehe vercel.json) und holt die
// WHOOP-Werte automatisch. Kein Login — die Aktion zieht nur die eigenen Daten
// in die eigene DB. Optionaler Schutz per CRON_SECRET (Vercel schickt dann
// automatisch "Authorization: Bearer <CRON_SECRET>").
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await syncWhoop();
    return NextResponse.json(
      { ok: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    // Nicht verbunden o. Ä. ist kein harter Fehler fürs Monitoring.
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "sync failed" },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
