/**
 * Erfolgsquoten und Wochenfortschritt — berechnet aus Completions.
 * Pure Logik, keine Framework-Imports.
 *
 * Kernregel (Habit-Spec 2.5/2.6): Ein bewusster Skip ist kein Fehlschlag.
 * Er wird aus dem Nenner genommen: rate = done / (due − skipped).
 * Erfolgsquote ist die Hauptmetrik; Streaks bleiben sekundär.
 */

import { addDaysISO, isoWeekday, weekStartISO } from "./dates";
import {
  isDueOn,
  shiftOn,
  type Completion,
  type Recurrence,
  type ShiftLookup,
} from "./recurrence";

export interface WeeklyProgress {
  done: number;
  target: number;
}

function indexByDate(completions: Iterable<Completion>) {
  const done = new Set<string>();
  const skipped = new Set<string>();
  for (const c of completions) {
    if (c.status === "skipped") skipped.add(c.date);
    else done.add(c.date);
  }
  return { done, skipped };
}

/**
 * Fortschritt in der Woche, die `refDate` enthält. Skips senken das
 * Wochensoll (bewusste Ruhe darf nicht als Rückstand erscheinen).
 */
export function weeklyProgress(
  recurrence: Recurrence,
  completions: Iterable<Completion>,
  refDate: string,
  shifts?: ShiftLookup,
): WeeklyProgress {
  const weekStart = weekStartISO(refDate);
  const weekEnd = addDaysISO(weekStart, 6);
  const { done, skipped } = indexByDate(completions);

  if (recurrence.type === "timesPerWeek") {
    // Nicht tagesgebunden: Soll = times minus bewusste Skips der Woche.
    let doneCount = 0;
    let skippedCount = 0;
    for (let day = weekStart; day <= weekEnd; day = addDaysISO(day, 1)) {
      if (skipped.has(day)) skippedCount++;
      else if (done.has(day)) doneCount++;
    }
    const target = Math.max(recurrence.times - skippedCount, 0);
    return { done: Math.min(doneCount, target), target };
  }

  // Tagesgebunden (daily/weekdays): Soll = fällige, nicht geskippte Tage.
  let dueCount = 0;
  let doneCount = 0;
  for (let day = weekStart; day <= weekEnd; day = addDaysISO(day, 1)) {
    if (!isDueOn(recurrence, day, shiftOn(shifts, day))) continue;
    if (skipped.has(day)) continue; // Skip senkt das Soll
    dueCount++;
    if (done.has(day)) doneCount++;
  }
  return { done: Math.min(doneCount, dueCount), target: dueCount };
}

/** Gesamter Wochenfortschritt über mehrere Gewohnheiten. */
export function overallWeeklyProgress(
  items: Array<{
    recurrence: Recurrence;
    completions: Iterable<Completion>;
  }>,
  refDate: string,
  shifts?: ShiftLookup,
): WeeklyProgress {
  let done = 0;
  let target = 0;
  for (const item of items) {
    const p = weeklyProgress(item.recurrence, item.completions, refDate, shifts);
    done += p.done;
    target += p.target;
  }
  return { done, target };
}

/**
 * Erfolgsquote (0..1) über die letzten `windowDays` Tage, frühestens ab
 * `since` (Anlegedatum). `null`, wenn im Fenster nichts (Netto-)Fälliges lag.
 *
 * Der heutige Tag zählt erst als fällig, wenn erledigt oder vorbei.
 * Skips werden aus dem Nenner genommen.
 */
export function successRate(
  recurrence: Recurrence,
  completions: Iterable<Completion>,
  today: string,
  since: string,
  windowDays = 30,
  shifts?: ShiftLookup,
): number | null {
  const { done, skipped } = indexByDate(completions);
  const effectiveEnd =
    done.has(today) || skipped.has(today) ? today : addDaysISO(today, -1);
  const windowStart = addDaysISO(today, -(windowDays - 1));
  const start = since > windowStart ? since : windowStart;
  if (start > effectiveEnd) return null;

  if (recurrence.type !== "timesPerWeek") {
    let due = 0;
    let completed = 0;
    for (let day = start; day <= effectiveEnd; day = addDaysISO(day, 1)) {
      if (!isDueOn(recurrence, day, shiftOn(shifts, day))) continue;
      if (skipped.has(day)) continue; // aus dem Nenner
      due++;
      if (done.has(day)) completed++;
    }
    return due === 0 ? null : completed / due;
  }

  const target = recurrence.times;
  let expected = 0;
  let achieved = 0;
  for (
    let week = weekStartISO(start);
    week <= effectiveEnd;
    week = addDaysISO(week, 7)
  ) {
    const weekEnd = addDaysISO(week, 6);
    const from = week < start ? start : week;
    const to = weekEnd > effectiveEnd ? effectiveEnd : weekEnd;
    const daysInWindow = isoWeekday(to) - isoWeekday(from) + 1;

    let doneInWeek = 0;
    let skippedInWeek = 0;
    for (let day = from; day <= to; day = addDaysISO(day, 1)) {
      if (skipped.has(day)) skippedInWeek++;
      else if (done.has(day)) doneInWeek++;
    }
    // Skips senken das Wochensoll; Rest anteilig aufs Fenster skaliert.
    const effTarget = Math.max(target - skippedInWeek, 0);
    const weekExpected = (effTarget * daysInWindow) / 7;
    expected += weekExpected;
    achieved += Math.min(doneInWeek, weekExpected);
  }
  return expected === 0 ? null : achieved / expected;
}
