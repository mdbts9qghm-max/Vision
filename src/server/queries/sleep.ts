import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/server/db";
import { metrics, shifts } from "@/server/db/schema";
import { addDaysISO } from "@/domain/dates";
import type { ShiftType } from "@/domain/coach";

export interface SleepPageData {
  shiftYesterday?: ShiftType;
  shiftToday?: ShiftType;
  shiftTomorrow?: ShiftType;
  sleepHours?: number;
  recoveryPct?: number;
}

/** Schlaf-Tab-Daten in EINEM Turso-Roundtrip. */
export async function loadSleepPage(today: string): Promise<SleepPageData> {
  const yesterday = addDaysISO(today, -1);
  const tomorrow = addDaysISO(today, 1);
  const [shiftRows, metricRows] = await db.batch([
    db
      .select({ date: shifts.date, type: shifts.type })
      .from(shifts)
      .where(and(gte(shifts.date, yesterday), lte(shifts.date, tomorrow))),
    db
      .select({ type: metrics.type, value: metrics.value })
      .from(metrics)
      .where(eq(metrics.date, today)),
  ]);

  const byDate: Record<string, ShiftType> = {};
  for (const s of shiftRows) byDate[s.date] = s.type;
  const metricsToday: Partial<Record<string, number>> = {};
  for (const m of metricRows) metricsToday[m.type] = m.value;

  return {
    shiftYesterday: byDate[yesterday],
    shiftToday: byDate[today],
    shiftTomorrow: byDate[tomorrow],
    sleepHours: metricsToday.sleep,
    recoveryPct: metricsToday.recovery,
  };
}
