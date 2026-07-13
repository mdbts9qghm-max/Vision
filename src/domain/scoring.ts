/**
 * Erfolgsquoten und Wochenfortschritt — berechnet aus Completions.
 * Pure Logik, keine Framework-Imports.
 */

import { addDaysISO, isoWeekday, weekStartISO } from "./dates";
import { isDueOn, type Recurrence } from "./recurrence";

export interface WeeklyProgress {
  done: number;
  target: number;
}

/** Fortschritt in der Woche, die `refDate` enthält. */
export function weeklyProgress(
  recurrence: Recurrence,
  completedDates: Iterable<string>,
  refDate: string,
): WeeklyProgress {
  const weekStart = weekStartISO(refDate);
  const weekEnd = addDaysISO(weekStart, 6);
  const done = new Set(completedDates);

  let target: number;
  let count = 0;
  switch (recurrence.type) {
    case "daily":
      target = 7;
      break;
    case "timesPerWeek":
      target = recurrence.times;
      break;
    case "weekdays":
      target = recurrence.weekdays.length;
      break;
  }

  for (let day = weekStart; day <= weekEnd; day = addDaysISO(day, 1)) {
    if (!done.has(day)) continue;
    // Bei Wochentags-Habits zählen nur fällige Tage aufs Wochensoll.
    if (recurrence.type === "weekdays" && !isDueOn(recurrence, day)) continue;
    count++;
  }
  return { done: Math.min(count, target), target };
}

/**
 * Gesamter Wochenfortschritt über mehrere Gewohnheiten:
 * Summe der (gedeckelten) Erledigungen gegen die Summe der Wochensolls.
 */
export function overallWeeklyProgress(
  items: Array<{
    recurrence: Recurrence;
    completedDates: Iterable<string>;
  }>,
  refDate: string,
): WeeklyProgress {
  let done = 0;
  let target = 0;
  for (const item of items) {
    const p = weeklyProgress(item.recurrence, item.completedDates, refDate);
    done += p.done;
    target += p.target;
  }
  return { done, target };
}

/**
 * Erfolgsquote (0..1) über die letzten `windowDays` Tage, frühestens ab
 * `since` (Anlegedatum der Gewohnheit — davor gab es nichts zu erfüllen).
 * `null`, wenn im Fenster noch nichts fällig war.
 *
 * Wie bei der Streak gilt: Der heutige Tag darf noch offen sein — er zählt
 * erst als fällig, wenn er erledigt oder vorbei ist. Sonst startet jede
 * Gewohnheit morgens mit einer schlechteren Quote, als sie verdient.
 *
 * - daily/weekdays: erledigte fällige Tage / fällige Tage.
 * - timesPerWeek: erreichte / erwartete Erledigungen pro Woche; angebrochene
 *   Wochen (Fensterrand, Anlegewoche, laufende Woche) zählen anteilig.
 */
export function successRate(
  recurrence: Recurrence,
  completedDates: Iterable<string>,
  today: string,
  since: string,
  windowDays = 30,
): number | null {
  const done = new Set(completedDates);
  const effectiveEnd = done.has(today) ? today : addDaysISO(today, -1);
  const windowStart = addDaysISO(today, -(windowDays - 1));
  const start = since > windowStart ? since : windowStart;
  if (start > effectiveEnd) return null;

  if (recurrence.type !== "timesPerWeek") {
    let due = 0;
    let completed = 0;
    for (let day = start; day <= effectiveEnd; day = addDaysISO(day, 1)) {
      if (!isDueOn(recurrence, day)) continue;
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
    const weekExpected = (target * daysInWindow) / 7;

    let doneInWeek = 0;
    for (let day = from; day <= to; day = addDaysISO(day, 1)) {
      if (done.has(day)) doneInWeek++;
    }
    expected += weekExpected;
    achieved += Math.min(doneInWeek, weekExpected);
  }
  return expected === 0 ? null : achieved / expected;
}
