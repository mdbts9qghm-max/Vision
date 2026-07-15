import { and, asc, desc, eq, gte } from "drizzle-orm";
import { db } from "@/server/db";
import { metrics, workouts } from "@/server/db/schema";
import { addDaysISO, weekStartISO } from "@/domain/dates";
import type { SeriesPoint } from "@/domain/fitness";

export type Workout = typeof workouts.$inferSelect;

export interface FitnessData {
  weight: SeriesPoint[];
  steps: SeriesPoint[];
  sleep: SeriesPoint[];
  recentWorkouts: Workout[];
  weekWorkouts: Workout[];
}

/** Alle Fitness-Daten in EINEM Turso-Roundtrip (db.batch). */
export async function loadFitness(today: string): Promise<FitnessData> {
  const chartSince = addDaysISO(today, -89);
  const shortSince = addDaysISO(today, -6);
  const weekStart = weekStartISO(today);
  const series = (type: "weight" | "steps" | "sleep", since: string) =>
    db
      .select({ date: metrics.date, value: metrics.value })
      .from(metrics)
      .where(and(eq(metrics.type, type), gte(metrics.date, since)))
      .orderBy(asc(metrics.date));

  const [weight, steps, sleep, recentWorkouts, weekWorkouts] = await db.batch([
    series("weight", chartSince),
    series("steps", shortSince),
    series("sleep", shortSince),
    db.select().from(workouts).orderBy(desc(workouts.date), desc(workouts.createdAt)).limit(10),
    db
      .select()
      .from(workouts)
      .where(gte(workouts.date, weekStart))
      .orderBy(desc(workouts.date)),
  ]);
  return { weight, steps, sleep, recentWorkouts, weekWorkouts };
}
