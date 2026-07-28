import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/server/db";
import { fastingSettings, metrics, shifts } from "@/server/db/schema";
import { addDaysISO } from "@/domain/dates";
import type { ShiftType } from "@/domain/coach";

export interface SleepPageData {
  shiftYesterday?: ShiftType;
  shiftToday?: ShiftType;
  shiftTomorrow?: ShiftType;
  sleepHours?: number;
  recoveryPct?: number;
  /** Manuelle Schichten im Fasten-Zeitraum (ab gestern). */
  shiftMap: Record<string, ShiftType | undefined>;
  /** Startdatum der Fasten-Rotation (null = nicht gesetzt). */
  rotationStart: string | null;
}

/**
 * Schlaf-Tab-Daten in EINEM Turso-Roundtrip. Der Zeitraum reicht bis
 * `fastingDays` in die Zukunft, weil der Fasten-Block dort seine Übersicht
 * zeigt.
 */
export async function loadSleepPage(
  today: string,
  fastingDays = 15,
): Promise<SleepPageData> {
  const yesterday = addDaysISO(today, -1);
  const tomorrow = addDaysISO(today, 1);
  const horizon = addDaysISO(today, fastingDays);
  const [shiftRows, metricRows, fastingRows] = await db.batch([
    db
      .select({ date: shifts.date, type: shifts.type })
      .from(shifts)
      .where(and(gte(shifts.date, yesterday), lte(shifts.date, horizon))),
    db
      .select({ type: metrics.type, value: metrics.value })
      .from(metrics)
      .where(eq(metrics.date, today)),
    db
      .select({ rotationStart: fastingSettings.rotationStart })
      .from(fastingSettings)
      .where(eq(fastingSettings.id, "singleton")),
  ]);

  const byDate: Record<string, ShiftType> = {};
  for (const s of shiftRows) byDate[s.date] = s.type;
  const metricsToday: Partial<Record<string, number>> = {};
  for (const m of metricRows) metricsToday[m.type] = m.value;

  return {
    shiftYesterday: byDate[yesterday],
    shiftToday: byDate[today],
    shiftTomorrow: byDate[tomorrow],
    shiftMap: byDate,
    rotationStart: fastingRows[0]?.rotationStart ?? null,
    sleepHours: metricsToday.sleep,
    recoveryPct: metricsToday.recovery,
  };
}
