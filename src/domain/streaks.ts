/**
 * Streak-Berechnung — immer aus Completions berechnet, nie gespeichert.
 * Sekundäre Metrik (Habit-Spec 2.6): klein dargestellt, nie Hauptzahl.
 *
 * Semantik:
 * - "daily"/"weekdays": Tages-Streak über fällige Tage. Der heutige Tag darf
 *   offen sein, ohne zu brechen (zählt dann noch nicht mit).
 * - "timesPerWeek": Wochen-Streak über erfüllte Wochen; laufende unfertige
 *   Woche bricht nicht.
 * - **Ein bewusster Skip bricht den Streak nicht** (neutral).
 */

import { addDaysISO, weekStartISO } from "./dates";
import {
  isDueOn,
  shiftOn,
  type Completion,
  type Recurrence,
  type ShiftLookup,
} from "./recurrence";

export type StreakUnit = "days" | "weeks";

export interface Streak {
  value: number;
  unit: StreakUnit;
}

const MAX_LOOKBACK_DAYS = 750; // Sicherheitsgrenze gegen Endlosläufe

function indexByDate(completions: Iterable<Completion>) {
  const done = new Set<string>();
  const skipped = new Set<string>();
  for (const c of completions) {
    if (c.status === "done") done.add(c.date);
    else if (c.status === "skipped") skipped.add(c.date);
    // "partial" bricht den Streak (Minimum nicht erreicht).
  }
  return { done, skipped };
}

export function computeStreak(
  recurrence: Recurrence,
  completions: Iterable<Completion>,
  today: string,
  shifts?: ShiftLookup,
): Streak {
  const { done, skipped } = indexByDate(completions);
  if (recurrence.type === "timesPerWeek") {
    return {
      value: weekStreak(recurrence.times, done, skipped, today),
      unit: "weeks",
    };
  }
  return {
    value: dayStreak(recurrence, done, skipped, today, shifts),
    unit: "days",
  };
}

function dayStreak(
  recurrence: Recurrence,
  done: Set<string>,
  skipped: Set<string>,
  today: string,
  shifts?: ShiftLookup,
): number {
  if (recurrence.type === "weekdays" && recurrence.weekdays.length === 0) {
    return 0;
  }

  let day = today;
  // Heute darf offen sein — dann startet die Zählung gestern.
  if (
    isDueOn(recurrence, day, shiftOn(shifts, day)) &&
    !done.has(day) &&
    !skipped.has(day)
  ) {
    day = addDaysISO(day, -1);
  }

  let count = 0;
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
    if (isDueOn(recurrence, day, shiftOn(shifts, day))) {
      if (skipped.has(day)) {
        // neutral: bricht nicht, zählt nicht
      } else if (done.has(day)) {
        count++;
      } else {
        break;
      }
    }
    day = addDaysISO(day, -1);
  }
  return count;
}

function weekStreak(
  target: number,
  done: Set<string>,
  skipped: Set<string>,
  today: string,
): number {
  const donePerWeek = new Map<string, number>();
  const skipPerWeek = new Map<string, number>();
  for (const date of done) {
    const w = weekStartISO(date);
    donePerWeek.set(w, (donePerWeek.get(w) ?? 0) + 1);
  }
  for (const date of skipped) {
    const w = weekStartISO(date);
    skipPerWeek.set(w, (skipPerWeek.get(w) ?? 0) + 1);
  }

  const satisfied = (week: string): boolean => {
    const effTarget = Math.max(target - (skipPerWeek.get(week) ?? 0), 0);
    return (donePerWeek.get(week) ?? 0) >= effTarget;
  };

  let count = 0;
  let week = weekStartISO(today);
  // Laufende Woche zählt nur, wenn schon erfüllt (auch via Skip-Reduktion).
  const currentDone = donePerWeek.get(week) ?? 0;
  if (currentDone > 0 && satisfied(week)) count++;
  week = addDaysISO(week, -7);

  for (let i = 0; i < 200 && satisfied(week); i++) {
    // Eine komplett leere, nicht-geskippte Vergangenheitswoche ist erfüllt
    // nur, wenn effTarget 0 ist — das beendet den Streak sauber.
    if ((donePerWeek.get(week) ?? 0) === 0 && (skipPerWeek.get(week) ?? 0) === 0) {
      break;
    }
    count++;
    week = addDaysISO(week, -7);
  }
  return count;
}
