import { and, desc, eq, gte, isNotNull, lte } from "drizzle-orm";
import { db } from "@/server/db";
import {
  fastingSettings,
  metrics,
  plannedSessions,
  shifts,
} from "@/server/db/schema";
import { addDaysISO } from "@/domain/dates";
import type { ShiftType, SessionKind } from "@/domain/coach";

export interface SleepPageData {
  shiftYesterday?: ShiftType;
  shiftToday?: ShiftType;
  shiftTomorrow?: ShiftType;
  sleepHours?: number;
  recoveryPct?: number;
  /** Heutige geplante Einheit (für das Fueling). */
  session?: {
    kind: SessionKind;
    targetKm: number | null;
    targetMin: number | null;
  };
  /** Zuletzt geloggtes Körpergewicht (für das Proteinziel). */
  weightKg?: number;
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
  const [shiftRows, metricRows, sessionRows, weightRows, fastingRows] =
    await db.batch([
      db
        .select({ date: shifts.date, type: shifts.type })
        .from(shifts)
        .where(and(gte(shifts.date, yesterday), lte(shifts.date, horizon))),
      db
        .select({ type: metrics.type, value: metrics.value })
        .from(metrics)
        .where(eq(metrics.date, today)),
      db
        .select({
          kind: plannedSessions.kind,
          targetKm: plannedSessions.targetKm,
          targetMin: plannedSessions.targetMin,
        })
        .from(plannedSessions)
        .where(eq(plannedSessions.date, today)),
      db
        .select({ value: metrics.value })
        .from(metrics)
        .where(and(eq(metrics.type, "weight"), isNotNull(metrics.value)))
        .orderBy(desc(metrics.date))
        .limit(1),
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
    session: sessionRows[0],
    weightKg: weightRows[0]?.value,
  };
}
