import { and, asc, gte, lte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { coachSettings, plannedSessions, shifts, workouts } from "@/server/db/schema";
import { todayISO, weekStartISO, addDaysISO } from "@/domain/dates";
import type { ShiftType } from "@/domain/coach";

export type CoachSettings = typeof coachSettings.$inferSelect;
export type PlannedSession = typeof plannedSessions.$inferSelect;

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

export async function getPlanRange(
  from: string,
  to: string,
): Promise<PlannedSession[]> {
  return db
    .select()
    .from(plannedSessions)
    .where(and(gte(plannedSessions.date, from), lte(plannedSessions.date, to)))
    .orderBy(asc(plannedSessions.date));
}

export interface WeekActuals {
  km: number;
  gymCount: number;
}

/** Tatsächlich gelaufene km + Kraft-Einheiten in der Woche ab `weekStart`. */
export async function getWeekActuals(weekStart: string): Promise<WeekActuals> {
  const weekEnd = addDaysISO(weekStart, 6);
  const [row] = await db
    .select({
      km: sql<number>`coalesce(sum(${workouts.distanceKm}), 0)`,
      gymCount: sql<number>`sum(case when ${workouts.type} = 'Kraft' then 1 else 0 end)`,
    })
    .from(workouts)
    .where(and(gte(workouts.date, weekStart), lte(workouts.date, weekEnd)));
  return { km: row?.km ?? 0, gymCount: row?.gymCount ?? 0 };
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
