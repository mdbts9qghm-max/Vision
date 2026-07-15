import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { habitCompletions, habits } from "@/server/db/schema";
import type { Completion } from "@/domain/recurrence";

export type Habit = typeof habits.$inferSelect;
type HabitRow = typeof habits.$inferSelect;
type CompletionRow = typeof habitCompletions.$inferSelect;

export interface HabitWithCompletions {
  habit: Habit;
  /** Volle Completion-Historie (done/skipped) — Streaks & Quoten brauchen sie. */
  completions: Completion[];
}

/** Gruppiert vorgeladene Zeilen — kein zusätzlicher DB-Roundtrip. */
export function assembleHabits(
  habitRows: HabitRow[],
  completionRows: Pick<
    CompletionRow,
    "habitId" | "date" | "status" | "value"
  >[],
): HabitWithCompletions[] {
  const byHabit = new Map<string, Completion[]>();
  for (const c of completionRows) {
    const entry: Completion = { date: c.date, status: c.status, value: c.value };
    const list = byHabit.get(c.habitId);
    if (list) list.push(entry);
    else byHabit.set(c.habitId, [entry]);
  }
  return habitRows.map((habit) => ({
    habit,
    completions: byHabit.get(habit.id) ?? [],
  }));
}

export async function getHabitsWithCompletions(): Promise<
  HabitWithCompletions[]
> {
  // Single User: beide Tabellen sind klein — in EINER Batch-Abfrage laden
  // statt zweier abhängiger Roundtrips.
  const [habitRows, completionRows] = await db.batch([
    db.select().from(habits).orderBy(asc(habits.createdAt)),
    db
      .select({
        habitId: habitCompletions.habitId,
        date: habitCompletions.date,
        status: habitCompletions.status,
        value: habitCompletions.value,
      })
      .from(habitCompletions),
  ]);
  return assembleHabits(habitRows, completionRows);
}

export async function getHabitById(id: string): Promise<Habit | undefined> {
  const rows = await db.select().from(habits).where(eq(habits.id, id));
  return rows[0];
}

/** Anzahl aktiver (nicht archivierter) Gewohnheiten — für die 3–5-Warnung. */
export async function countActiveHabits(): Promise<number> {
  const rows = await db
    .select({ id: habits.id, archivedAt: habits.archivedAt })
    .from(habits);
  return rows.filter((r) => r.archivedAt === null).length;
}
