/**
 * Wochen-Historie einer Gewohnheit — Grundlage für das Analytics-Chart.
 * Pure Logik, keine Framework-Imports.
 */

import { addDaysISO, weekStartISO } from "./dates";
import type { Completion, Recurrence, ShiftLookup } from "./recurrence";
import { weeklyProgress, type WeeklyProgress } from "./scoring";

export interface WeekHistoryEntry extends WeeklyProgress {
  /** Montag der Woche (YYYY-MM-DD). */
  weekStart: string;
  /** Die laufende, noch unfertige Woche. */
  isCurrent: boolean;
}

/**
 * Die letzten `weeks` Wochen (älteste zuerst, laufende Woche zuletzt).
 * `done` ist aufs Wochensoll gedeckelt — Mehrleistung bläht das Chart
 * nicht auf (keine Gamification-Inflation).
 */
export function weeklyHistory(
  recurrence: Recurrence,
  completions: Iterable<Completion>,
  today: string,
  weeks = 12,
  shifts?: ShiftLookup,
): WeekHistoryEntry[] {
  const list = [...completions];
  const currentWeek = weekStartISO(today);
  const result: WeekHistoryEntry[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = addDaysISO(currentWeek, -7 * i);
    result.push({
      weekStart,
      isCurrent: weekStart === currentWeek,
      ...weeklyProgress(recurrence, list, weekStart, shifts),
    });
  }
  return result;
}
