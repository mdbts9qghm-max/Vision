import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/server/db";
import { fastingSettings, shifts } from "@/server/db/schema";
import { addDaysISO } from "@/domain/dates";
import type { ShiftType } from "@/domain/coach";

export interface FastingPageData {
  /** Startdatum der Rotation (null = nicht gesetzt). */
  rotationStart: string | null;
  /** Manuell eingetragene Schichten im geladenen Zeitraum. */
  manualShifts: Record<string, ShiftType | undefined>;
}

/**
 * Daten für den Fasten-Bereich in EINEM Turso-Roundtrip: Rotationsstart +
 * die manuell gesetzten Schichten des Zeitraums (diese überschreiben die
 * Rotation).
 */
export async function loadFasting(
  from: string,
  days: number,
): Promise<FastingPageData> {
  const to = addDaysISO(from, days - 1);
  const [settingsRows, shiftRows] = await db.batch([
    db
      .select({ rotationStart: fastingSettings.rotationStart })
      .from(fastingSettings)
      .where(eq(fastingSettings.id, "singleton")),
    db
      .select({ date: shifts.date, type: shifts.type })
      .from(shifts)
      .where(and(gte(shifts.date, from), lte(shifts.date, to))),
  ]);

  const manualShifts: Record<string, ShiftType | undefined> = {};
  for (const s of shiftRows) manualShifts[s.date] = s.type;

  return {
    rotationStart: settingsRows[0]?.rotationStart ?? null,
    manualShifts,
  };
}
