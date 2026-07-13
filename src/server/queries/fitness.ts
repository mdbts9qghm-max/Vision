import { and, asc, desc, eq, gte } from "drizzle-orm";
import { db } from "@/server/db";
import { metrics, workouts } from "@/server/db/schema";
import type { SeriesPoint } from "@/domain/fitness";

export type Workout = typeof workouts.$inferSelect;

export async function getMetricSeries(
  type: "weight" | "steps" | "sleep",
  sinceISO: string,
): Promise<SeriesPoint[]> {
  return db
    .select({ date: metrics.date, value: metrics.value })
    .from(metrics)
    .where(and(eq(metrics.type, type), gte(metrics.date, sinceISO)))
    .orderBy(asc(metrics.date));
}

export async function getRecentWorkouts(limit = 10): Promise<Workout[]> {
  return db
    .select()
    .from(workouts)
    .orderBy(desc(workouts.date), desc(workouts.createdAt))
    .limit(limit);
}

export async function getWorkoutsSince(sinceISO: string): Promise<Workout[]> {
  return db
    .select()
    .from(workouts)
    .where(gte(workouts.date, sinceISO))
    .orderBy(desc(workouts.date));
}
