/**
 * Fitness-Berechnungen — pure Logik, keine Framework-Imports.
 */

import { addDaysISO } from "./dates";

export interface SeriesPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

/**
 * Gleitender Rückblick-Schnitt: für jeden Messpunkt der Mittelwert aller
 * Werte der letzten `windowDays` Tage (inkl. des Tages selbst). Lücken in
 * der Messreihe sind erlaubt — gemittelt wird über vorhandene Werte.
 */
export function trailingAverage(
  points: SeriesPoint[],
  windowDays = 7,
): SeriesPoint[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((p) => {
    const from = addDaysISO(p.date, -(windowDays - 1));
    const window = sorted.filter((q) => q.date >= from && q.date <= p.date);
    const sum = window.reduce((s, q) => s + q.value, 0);
    return { date: p.date, value: sum / window.length };
  });
}

/** Mittelwert der Werte innerhalb der letzten `days` Tage bis `today`. */
export function averageOverDays(
  points: SeriesPoint[],
  today: string,
  days: number,
): number | null {
  const from = addDaysISO(today, -(days - 1));
  const window = points.filter((p) => p.date >= from && p.date <= today);
  if (window.length === 0) return null;
  return window.reduce((s, p) => s + p.value, 0) / window.length;
}
