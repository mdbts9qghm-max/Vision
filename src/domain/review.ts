/**
 * Aggregation für den Wochenrückblick. Pure Logik, keine Framework-Imports.
 * Baut auf checkin.ts auf und liefert Wochenmittel, Trend über mehrere Wochen
 * und den Vergleich zur Vorwoche.
 */

import { addDaysISO, weekStartISO } from "./dates";
import {
  summarizeCheckins,
  type Checkin,
  type CheckinSummary,
} from "./checkin";

/** Check-ins einer ISO-Woche (Mo–So) herausfiltern. */
export function checkinsInWeek(checkins: Checkin[], weekStart: string): Checkin[] {
  const weekEnd = addDaysISO(weekStart, 6);
  return checkins.filter((c) => c.date >= weekStart && c.date <= weekEnd);
}

/** Zusammenfassung genau einer Woche. */
export function weekSummary(
  checkins: Checkin[],
  weekStart: string,
): CheckinSummary {
  return summarizeCheckins(checkinsInWeek(checkins, weekStart));
}

export interface WeekTrendEntry extends CheckinSummary {
  weekStart: string;
  isCurrent: boolean;
}

/**
 * Wohlbefinden/Facetten über die letzten `weeks` Wochen (älteste zuerst),
 * inklusive der laufenden Woche. Mirror von history.weeklyHistory.
 */
export function weeklyCheckinTrend(
  checkins: Checkin[],
  today: string,
  weeks: number,
): WeekTrendEntry[] {
  const currentWeek = weekStartISO(today);
  const out: WeekTrendEntry[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = addDaysISO(currentWeek, -7 * i);
    out.push({
      weekStart: ws,
      isCurrent: ws === currentWeek,
      ...weekSummary(checkins, ws),
    });
  }
  return out;
}

export interface FacetDelta {
  value: number | null;
  previous: number | null;
  delta: number | null; // aktuell - vorher
}

/** Vergleich einer Kennzahl zwischen zwei Wochen. */
export function facetDelta(
  current: number | null,
  previous: number | null,
): FacetDelta {
  const delta =
    current != null && previous != null
      ? Math.round((current - previous) * 10) / 10
      : null;
  return { value: current, previous, delta };
}
