import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  coachSettings,
  dayFocus,
  goals,
  habitCompletions,
  habits,
  metrics,
  milestones,
  plannedSessions,
  readinessChecks,
  shifts,
  workouts,
} from "@/server/db/schema";
import { addDaysISO } from "@/domain/dates";
import type { ShiftType } from "@/domain/coach";
import type { DaySignals } from "@/domain/readiness";
import { assembleHabits, type HabitWithCompletions } from "./habits";
import { assembleGoals, type GoalWithMilestones } from "./goals";
import type { CoachSettings, PlannedSession } from "./coach";

export interface DashboardData {
  habits: HabitWithCompletions[];
  goals: GoalWithMilestones[];
  focus?: string;
  todaySession?: PlannedSession;
  signals: DaySignals;
  shifts: Record<string, ShiftType>;
  settings: CoachSettings;
  weekPlannedKm: number;
  weekActuals: { km: number; gymCount: number; runCount: number };
  metricsToday: Partial<Record<string, number>>;
}

const DEFAULT_SETTINGS = (currentWeek: string): CoachSettings => ({
  id: "singleton",
  weeklyKmBase: 15,
  progressionPct: 7,
  deloadEveryWeeks: 4,
  weeklyGymTarget: 3,
  startWeek: currentWeek,
});

/**
 * Lädt alle Dashboard-Daten in EINEM Turso-Roundtrip (db.batch) statt ~19
 * Einzelabfragen. Single User → alle Tabellen sind klein.
 */
export async function loadDashboard(
  today: string,
  currentWeek: string,
): Promise<DashboardData> {
  const weekEnd = addDaysISO(currentWeek, 6);

  const [
    habitRows,
    completionRows,
    focusRows,
    planRows,
    readinessRows,
    metricRows,
    shiftRows,
    settingsRows,
    plannedKmRows,
    actualsRows,
    goalRows,
    milestoneRows,
  ] = await db.batch([
    db.select().from(habits).orderBy(asc(habits.createdAt)),
    db
      .select({
        habitId: habitCompletions.habitId,
        date: habitCompletions.date,
        status: habitCompletions.status,
        value: habitCompletions.value,
      })
      .from(habitCompletions),
    db.select({ text: dayFocus.text }).from(dayFocus).where(eq(dayFocus.date, today)),
    db.select().from(plannedSessions).where(eq(plannedSessions.date, today)),
    db
      .select({ score: readinessChecks.score })
      .from(readinessChecks)
      .where(eq(readinessChecks.date, today)),
    db
      .select({ type: metrics.type, value: metrics.value })
      .from(metrics)
      .where(eq(metrics.date, today)),
    db
      .select({ date: shifts.date, type: shifts.type })
      .from(shifts)
      .where(and(gte(shifts.date, currentWeek), lte(shifts.date, weekEnd))),
    db.select().from(coachSettings),
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
    db.select().from(goals).orderBy(asc(goals.createdAt)),
    db.select().from(milestones).orderBy(asc(milestones.sortOrder)),
  ]);

  const metricsToday: Partial<Record<string, number>> = {};
  for (const m of metricRows) metricsToday[m.type] = m.value;

  const shiftMap: Record<string, ShiftType> = {};
  for (const s of shiftRows) shiftMap[s.date] = s.type;

  const signals: DaySignals = {
    sleepHours: metricsToday.sleep ?? null,
    recoveryPct: metricsToday.recovery ?? null,
    readiness: readinessRows[0]?.score ?? null,
  };

  return {
    habits: assembleHabits(habitRows, completionRows),
    goals: assembleGoals(goalRows, milestoneRows),
    focus: focusRows[0]?.text,
    todaySession: planRows[0],
    signals,
    shifts: shiftMap,
    settings: settingsRows[0] ?? DEFAULT_SETTINGS(currentWeek),
    weekPlannedKm: plannedKmRows[0]?.km ?? 0,
    weekActuals: {
      km: actualsRows[0]?.km ?? 0,
      gymCount: actualsRows[0]?.gymCount ?? 0,
      runCount: actualsRows[0]?.runCount ?? 0,
    },
    metricsToday,
  };
}
