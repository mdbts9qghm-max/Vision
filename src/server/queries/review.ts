import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  checkins,
  habitCompletions,
  habits,
  metrics,
  shifts,
  weeklyReviews,
  workouts,
} from "@/server/db/schema";
import { addDaysISO } from "@/domain/dates";
import type { ShiftType } from "@/domain/coach";
import type { Checkin } from "@/domain/checkin";
import type { Recurrence, Completion } from "@/domain/recurrence";

export interface ReviewHabitItem {
  recurrence: Recurrence;
  completions: Completion[];
}

export interface ReviewPageData {
  review?: { wentWell?: string; toImprove?: string; focusNext?: string };
  pastReviews: Array<{
    weekStart: string;
    wentWell: string | null;
    toImprove: string | null;
    focusNext: string | null;
  }>;
  allCheckins: Checkin[];
  habitItems: ReviewHabitItem[];
  shifts: Record<string, ShiftType>;
  training: { km: number; runCount: number; gymCount: number };
  recovery: { avg: number | null; count: number };
}

/** Alle Daten für den Wochenrückblick in EINEM Turso-Roundtrip. */
export async function loadReviewPage(
  weekStart: string,
): Promise<ReviewPageData> {
  const weekEnd = addDaysISO(weekStart, 6);

  const [
    reviewRows,
    pastRows,
    checkinRows,
    habitRows,
    completionRows,
    shiftRows,
    trainingRows,
    recoveryRows,
  ] = await db.batch([
    db
      .select()
      .from(weeklyReviews)
      .where(eq(weeklyReviews.weekStart, weekStart)),
    db
      .select({
        weekStart: weeklyReviews.weekStart,
        wentWell: weeklyReviews.wentWell,
        toImprove: weeklyReviews.toImprove,
        focusNext: weeklyReviews.focusNext,
      })
      .from(weeklyReviews)
      .orderBy(sql`${weeklyReviews.weekStart} desc`)
      .limit(8),
    db
      .select({
        date: checkins.date,
        mood: checkins.mood,
        energy: checkins.energy,
        stress: checkins.stress,
        note: checkins.note,
      })
      .from(checkins)
      .orderBy(asc(checkins.date)),
    db
      .select({
        id: habits.id,
        recurrence: habits.recurrence,
        archivedAt: habits.archivedAt,
      })
      .from(habits)
      .orderBy(asc(habits.createdAt)),
    db
      .select({
        habitId: habitCompletions.habitId,
        date: habitCompletions.date,
        status: habitCompletions.status,
      })
      .from(habitCompletions),
    db
      .select({ date: shifts.date, type: shifts.type })
      .from(shifts)
      .where(and(gte(shifts.date, weekStart), lte(shifts.date, weekEnd))),
    db
      .select({
        km: sql<number>`coalesce(sum(${workouts.distanceKm}), 0)`,
        gymCount: sql<number>`sum(case when ${workouts.type} = 'Kraft' then 1 else 0 end)`,
        runCount: sql<number>`sum(case when ${workouts.type} = 'Kraft' then 0 else 1 end)`,
      })
      .from(workouts)
      .where(and(gte(workouts.date, weekStart), lte(workouts.date, weekEnd))),
    db
      .select({
        avg: sql<number | null>`avg(${metrics.value})`,
        count: sql<number>`count(*)`,
      })
      .from(metrics)
      .where(
        and(
          eq(metrics.type, "recovery"),
          gte(metrics.date, weekStart),
          lte(metrics.date, weekEnd),
        ),
      ),
  ]);

  // Completions je Habit gruppieren (nur aktive Habits zählen für die Quote).
  const completionsByHabit = new Map<string, Completion[]>();
  for (const c of completionRows) {
    const list = completionsByHabit.get(c.habitId) ?? [];
    list.push({ date: c.date, status: c.status });
    completionsByHabit.set(c.habitId, list);
  }
  const habitItems: ReviewHabitItem[] = habitRows
    .filter((h) => !h.archivedAt)
    .map((h) => ({
      recurrence: h.recurrence,
      completions: completionsByHabit.get(h.id) ?? [],
    }));

  const shiftMap: Record<string, ShiftType> = {};
  for (const s of shiftRows) shiftMap[s.date] = s.type;

  return {
    review: reviewRows[0]
      ? {
          wentWell: reviewRows[0].wentWell ?? undefined,
          toImprove: reviewRows[0].toImprove ?? undefined,
          focusNext: reviewRows[0].focusNext ?? undefined,
        }
      : undefined,
    pastReviews: pastRows,
    allCheckins: checkinRows,
    habitItems,
    shifts: shiftMap,
    training: {
      km: trainingRows[0]?.km ?? 0,
      runCount: trainingRows[0]?.runCount ?? 0,
      gymCount: trainingRows[0]?.gymCount ?? 0,
    },
    recovery: {
      avg:
        recoveryRows[0]?.avg != null
          ? Math.round(recoveryRows[0].avg)
          : null,
      count: recoveryRows[0]?.count ?? 0,
    },
  };
}
