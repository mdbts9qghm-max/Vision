import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { habitCompletions, habits } from "@/server/db/schema";

export type Habit = typeof habits.$inferSelect;

export interface HabitWithCompletions {
  habit: Habit;
  /** Alle Erledigungstage (YYYY-MM-DD) — Streaks brauchen die volle Historie. */
  completedDates: string[];
}

export async function getHabitsWithCompletions(): Promise<
  HabitWithCompletions[]
> {
  const rows = await db.select().from(habits).orderBy(asc(habits.createdAt));
  if (rows.length === 0) return [];

  const completions = await db
    .select({
      habitId: habitCompletions.habitId,
      date: habitCompletions.date,
    })
    .from(habitCompletions)
    .where(
      inArray(
        habitCompletions.habitId,
        rows.map((h) => h.id),
      ),
    );

  const byHabit = new Map<string, string[]>();
  for (const c of completions) {
    const list = byHabit.get(c.habitId);
    if (list) list.push(c.date);
    else byHabit.set(c.habitId, [c.date]);
  }

  return rows.map((habit) => ({
    habit,
    completedDates: byHabit.get(habit.id) ?? [],
  }));
}

export async function getHabitById(id: string): Promise<Habit | undefined> {
  const rows = await db.select().from(habits).where(eq(habits.id, id));
  return rows[0];
}
