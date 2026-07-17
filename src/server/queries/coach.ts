import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  coachSettings,
  metrics,
  plannedSessions,
  shifts,
  workouts,
} from "@/server/db/schema";
import { todayISO, weekStartISO, addDaysISO } from "@/domain/dates";
import type { ShiftType } from "@/domain/coach";
import type { SeriesPoint } from "@/domain/fitness";

export type CoachSettings = typeof coachSettings.$inferSelect;
export type PlannedSession = typeof plannedSessions.$inferSelect;
export type Workout = typeof workouts.$inferSelect;

export interface CoachPageData {
  settings: CoachSettings;
  shiftMap: Record<string, ShiftType>;
  plan: PlannedSession[];
  weekPlannedKm: number;
  weekActuals: { km: number; gymCount: number; runCount: number };
  weightSeries: SeriesPoint[];
  recentWorkouts: Workout[];
  /** Tage (im sichtbaren Fenster) mit bereits geloggtem Training. */
  loggedDates: Set<string>;
  /** Längste je gelaufene Einzelstrecke (km) — für "Road to 100 km". */
  longestRunKm: number;
  /** Gesamte gelaufene Distanz (km). */
  totalRunKm: number;
}

/**
 * Alle Coach-Seiten-Daten (Plan + Logbuch) in EINEM Turso-Roundtrip.
 * Fehlen die Settings (Erstnutzung), werden sie einmalig nachgelegt.
 */
export async function loadCoachPage(
  today: string,
  horizon: string,
  currentWeek: string,
): Promise<CoachPageData> {
  const weekEnd = addDaysISO(currentWeek, 6);
  const chartSince = addDaysISO(today, -89);
  const [
    settingsRows,
    shiftRows,
    planRows,
    plannedKmRows,
    actualsRows,
    weightRows,
    recentRows,
    windowWorkoutRows,
    runStatsRows,
  ] = await db.batch([
    db.select().from(coachSettings),
    db
      .select({ date: shifts.date, type: shifts.type })
      .from(shifts)
      .where(and(gte(shifts.date, today), lte(shifts.date, horizon))),
    db
      .select()
      .from(plannedSessions)
      .where(
        and(gte(plannedSessions.date, today), lte(plannedSessions.date, horizon)),
      )
      .orderBy(asc(plannedSessions.date)),
    db
      .select({ km: sql<number>`coalesce(sum(${plannedSessions.targetKm}), 0)` })
      .from(plannedSessions)
      .where(
        and(
          gte(plannedSessions.date, currentWeek),
          lte(plannedSessions.date, weekEnd),
        ),
      ),
    db
      .select({
        km: sql<number>`coalesce(sum(${workouts.distanceKm}), 0)`,
        gymCount: sql<number>`sum(case when ${workouts.type} = 'Kraft' then 1 else 0 end)`,
        runCount: sql<number>`sum(case when ${workouts.type} = 'Kraft' then 0 else 1 end)`,
      })
      .from(workouts)
      .where(and(gte(workouts.date, currentWeek), lte(workouts.date, weekEnd))),
    db
      .select({ date: metrics.date, value: metrics.value })
      .from(metrics)
      .where(and(eq(metrics.type, "weight"), gte(metrics.date, chartSince)))
      .orderBy(asc(metrics.date)),
    db
      .select()
      .from(workouts)
      .orderBy(desc(workouts.date), desc(workouts.createdAt))
      .limit(12),
    db
      .select({ date: workouts.date })
      .from(workouts)
      .where(and(gte(workouts.date, today), lte(workouts.date, horizon))),
    db
      .select({
        longest: sql<number>`coalesce(max(${workouts.distanceKm}), 0)`,
        total: sql<number>`coalesce(sum(${workouts.distanceKm}), 0)`,
      })
      .from(workouts),
  ]);

  const shiftMap: Record<string, ShiftType> = {};
  for (const s of shiftRows) shiftMap[s.date] = s.type;

  return {
    settings: settingsRows[0] ?? (await getOrCreateCoachSettings()),
    shiftMap,
    plan: planRows,
    weekPlannedKm: plannedKmRows[0]?.km ?? 0,
    weekActuals: {
      km: actualsRows[0]?.km ?? 0,
      gymCount: actualsRows[0]?.gymCount ?? 0,
      runCount: actualsRows[0]?.runCount ?? 0,
    },
    weightSeries: weightRows,
    recentWorkouts: recentRows,
    loggedDates: new Set(windowWorkoutRows.map((w) => w.date)),
    longestRunKm: runStatsRows[0]?.longest ?? 0,
    totalRunKm: runStatsRows[0]?.total ?? 0,
  };
}

/** Singleton-Einstellungen; beim ersten Zugriff mit Defaults angelegt. */
export async function getOrCreateCoachSettings(): Promise<CoachSettings> {
  const rows = await db.select().from(coachSettings);
  if (rows[0]) return rows[0];
  const [created] = await db
    .insert(coachSettings)
    .values({ startWeek: weekStartISO(todayISO()) })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  return (await db.select().from(coachSettings))[0];
}

export async function getShiftMap(
  from: string,
  to: string,
): Promise<Record<string, ShiftType>> {
  const rows = await db
    .select({ date: shifts.date, type: shifts.type })
    .from(shifts)
    .where(and(gte(shifts.date, from), lte(shifts.date, to)));
  return Object.fromEntries(rows.map((r) => [r.date, r.type]));
}

export interface WeekActuals {
  km: number;
  gymCount: number;
  runCount: number;
}

/** Tatsächliche km, Läufe und Kraft-Einheiten in der Woche ab `weekStart`. */
export async function getWeekActuals(weekStart: string): Promise<WeekActuals> {
  const weekEnd = addDaysISO(weekStart, 6);
  const [row] = await db
    .select({
      km: sql<number>`coalesce(sum(${workouts.distanceKm}), 0)`,
      gymCount: sql<number>`sum(case when ${workouts.type} = 'Kraft' then 1 else 0 end)`,
      runCount: sql<number>`sum(case when ${workouts.type} = 'Kraft' then 0 else 1 end)`,
    })
    .from(workouts)
    .where(and(gte(workouts.date, weekStart), lte(workouts.date, weekEnd)));
  return {
    km: row?.km ?? 0,
    gymCount: row?.gymCount ?? 0,
    runCount: row?.runCount ?? 0,
  };
}

/** Summe der geplanten km einer Woche (gespeicherter Plan). */
export async function getWeekPlannedKm(weekStart: string): Promise<number> {
  const weekEnd = addDaysISO(weekStart, 6);
  const [row] = await db
    .select({
      km: sql<number>`coalesce(sum(${plannedSessions.targetKm}), 0)`,
    })
    .from(plannedSessions)
    .where(
      and(
        gte(plannedSessions.date, weekStart),
        lte(plannedSessions.date, weekEnd),
      ),
    );
  return row?.km ?? 0;
}
