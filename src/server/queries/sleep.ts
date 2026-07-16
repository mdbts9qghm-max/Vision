import { and, desc, eq, gte, isNotNull, lte } from "drizzle-orm";
import { db } from "@/server/db";
import { metrics, plannedSessions, shifts } from "@/server/db/schema";
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
}

/** Schlaf-Tab-Daten in EINEM Turso-Roundtrip. */
export async function loadSleepPage(today: string): Promise<SleepPageData> {
  const yesterday = addDaysISO(today, -1);
  const tomorrow = addDaysISO(today, 1);
  const [shiftRows, metricRows, sessionRows, weightRows] = await db.batch([
    db
      .select({ date: shifts.date, type: shifts.type })
      .from(shifts)
      .where(and(gte(shifts.date, yesterday), lte(shifts.date, tomorrow))),
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
    session: sessionRows[0],
    weightKg: weightRows[0]?.value,
  };
}
