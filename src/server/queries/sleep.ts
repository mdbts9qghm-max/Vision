import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/server/db";
import { fastingSettings, metrics, shifts } from "@/server/db/schema";
import { addDaysISO } from "@/domain/dates";
import type { ShiftType } from "@/domain/coach";
import { averageOverDays, type SeriesPoint } from "@/domain/fitness";

/** Tage im Erholungs-Verlauf. */
export const TREND_DAYS = 14;

export interface SleepPageData {
  shiftYesterday?: ShiftType;
  shiftToday?: ShiftType;
  shiftTomorrow?: ShiftType;
  sleepHours?: number;
  recoveryPct?: number;
  hrv?: number;
  rhr?: number;
  /** Verläufe der letzten `TREND_DAYS` Tage. */
  recoverySeries: SeriesPoint[];
  sleepSeries: SeriesPoint[];
  /** 7-Tage-Schnitte (null = keine Werte im Zeitraum). */
  avg7: {
    recovery: number | null;
    sleep: number | null;
    hrv: number | null;
    rhr: number | null;
  };
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
  const trendSince = addDaysISO(today, -(TREND_DAYS - 1));
  const [shiftRows, metricRows, fastingRows] = await db.batch([
    db
      .select({ date: shifts.date, type: shifts.type })
      .from(shifts)
      .where(and(gte(shifts.date, yesterday), lte(shifts.date, horizon))),
    db
      .select({ date: metrics.date, type: metrics.type, value: metrics.value })
      .from(metrics)
      .where(and(gte(metrics.date, trendSince), lte(metrics.date, today))),
    db
      .select({ rotationStart: fastingSettings.rotationStart })
      .from(fastingSettings)
      .where(eq(fastingSettings.id, "singleton")),
  ]);

  const byDate: Record<string, ShiftType> = {};
  for (const s of shiftRows) byDate[s.date] = s.type;

  const metricsToday: Partial<Record<string, number>> = {};
  for (const m of metricRows) {
    if (m.date === today) metricsToday[m.type] = m.value;
  }
  const series = (type: string): SeriesPoint[] =>
    metricRows
      .filter((m) => m.type === type)
      .map((m) => ({ date: m.date, value: m.value }))
      .sort((a, b) => a.date.localeCompare(b.date));

  const recoverySeries = series("recovery");
  const sleepSeries = series("sleep");
  const round1 = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);

  return {
    shiftYesterday: byDate[yesterday],
    shiftToday: byDate[today],
    shiftTomorrow: byDate[tomorrow],
    shiftMap: byDate,
    rotationStart: fastingRows[0]?.rotationStart ?? null,
    sleepHours: metricsToday.sleep,
    recoveryPct: metricsToday.recovery,
    hrv: metricsToday.hrv,
    rhr: metricsToday.rhr,
    recoverySeries,
    sleepSeries,
    avg7: {
      recovery: round1(averageOverDays(recoverySeries, today, 7)),
      sleep: round1(averageOverDays(sleepSeries, today, 7)),
      hrv: round1(averageOverDays(series("hrv"), today, 7)),
      rhr: round1(averageOverDays(series("rhr"), today, 7)),
    },
  };
}
