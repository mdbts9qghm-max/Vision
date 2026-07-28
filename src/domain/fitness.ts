/**
 * Fitness-Berechnungen — pure Logik, keine Framework-Imports.
 */

import { addDaysISO, weekStartISO } from "./dates";

export interface SeriesPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface WeeklyVolume {
  /** Montag der Woche. */
  weekStart: string;
  km: number;
  runs: number;
  isCurrent: boolean;
}

/**
 * Wochenvolumen der letzten `weeks` Wochen (älteste zuerst, inkl. laufender
 * Woche). Zeigt den Aufbau über die Zeit — die Kernkurve im Ultra-Training.
 */
export function weeklyVolume(
  workouts: Array<{ date: string; distanceKm?: number | null; type: string }>,
  today: string,
  weeks: number,
): WeeklyVolume[] {
  const currentWeek = weekStartISO(today);
  const buckets = new Map<string, { km: number; runs: number }>();
  for (let i = weeks - 1; i >= 0; i--) {
    buckets.set(addDaysISO(currentWeek, -7 * i), { km: 0, runs: 0 });
  }
  for (const w of workouts) {
    const bucket = buckets.get(weekStartISO(w.date));
    if (!bucket) continue;
    if (w.type === "Kraft") continue; // nur Läufe zählen aufs Volumen
    bucket.km += w.distanceKm ?? 0;
    bucket.runs += 1;
  }
  return [...buckets.entries()].map(([weekStart, b]) => ({
    weekStart,
    km: Math.round(b.km * 10) / 10,
    runs: b.runs,
    isCurrent: weekStart === currentWeek,
  }));
}

/** Werte der letzten `days` Tage bis `today`, Lücken bleiben Lücken. */
export function lastDays(
  points: SeriesPoint[],
  today: string,
  days: number,
): SeriesPoint[] {
  const from = addDaysISO(today, -(days - 1));
  return points
    .filter((p) => p.date >= from && p.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));
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
