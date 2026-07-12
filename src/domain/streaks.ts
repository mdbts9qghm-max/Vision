/**
 * Streak-Berechnung — immer aus Completions berechnet, nie gespeichert.
 *
 * Semantik (Produktentscheidung):
 * - "daily" und "weekdays": Tages-Streak über fällige Tage. Der heutige Tag
 *   darf noch offen sein, ohne die Streak zu brechen (er zählt dann nur
 *   noch nicht mit).
 * - "timesPerWeek": Wochen-Streak — aufeinanderfolgende Wochen, in denen das
 *   Soll erreicht wurde. Die laufende, noch unfertige Woche bricht die
 *   Streak nicht; sie zählt erst mit, sobald das Soll erreicht ist.
 */

import { addDaysISO, weekStartISO } from "./dates";
import { isDueOn, type Recurrence } from "./recurrence";

export type StreakUnit = "days" | "weeks";

export interface Streak {
  value: number;
  unit: StreakUnit;
}

export function computeStreak(
  recurrence: Recurrence,
  completedDates: Iterable<string>,
  today: string,
): Streak {
  const done = new Set(completedDates);
  if (recurrence.type === "timesPerWeek") {
    return {
      value: weekStreak(recurrence.times, done, today),
      unit: "weeks",
    };
  }
  return { value: dayStreak(recurrence, done, today), unit: "days" };
}

function dayStreak(
  recurrence: Recurrence,
  done: Set<string>,
  today: string,
): number {
  if (recurrence.type === "weekdays" && recurrence.weekdays.length === 0) {
    return 0;
  }

  let day = today;
  // Heute darf noch offen sein — dann startet die Zählung gestern.
  if (isDueOn(recurrence, day) && !done.has(day)) {
    day = addDaysISO(day, -1);
  }

  let count = 0;
  for (;;) {
    if (isDueOn(recurrence, day)) {
      if (!done.has(day)) break;
      count++;
    }
    day = addDaysISO(day, -1);
  }
  return count;
}

function weekStreak(target: number, done: Set<string>, today: string): number {
  const perWeek = new Map<string, number>();
  for (const date of done) {
    const week = weekStartISO(date);
    perWeek.set(week, (perWeek.get(week) ?? 0) + 1);
  }

  let count = 0;
  let week = weekStartISO(today);
  // Laufende Woche zählt nur, wenn schon erfüllt — sonst überspringen.
  if ((perWeek.get(week) ?? 0) >= target) count++;
  week = addDaysISO(week, -7);

  while ((perWeek.get(week) ?? 0) >= target) {
    count++;
    week = addDaysISO(week, -7);
  }
  return count;
}
