/**
 * Schicht-Fasten (16/8): leitet aus der Schicht das passende 8-Stunden-
 * Essensfenster ab und sagt live, ob gerade gegessen oder gefastet wird.
 *
 * Pure Logik, keine Framework-Imports — voll unit-testbar.
 *
 * Grundprinzip (siehe TIPS unten): Fenster ~1–2 h nach dem Aufstehen öffnen,
 * ~2–3 h vor dem Schlafen schließen, tief nachts (2–5 Uhr) nichts Schweres.
 */

import { addDaysISO, diffDaysISO } from "./dates";
import { hm } from "./sleep";
import type { ShiftType } from "./coach";

// ═══════════════════════════════════════════════════════════════════════════
//  KONFIGURATION — hier anpassen, alles andere richtet sich danach
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Essensfenster je Schichtart (Minuten seit 00:00, `hm(stunde, minute)`).
 * `null` = kein Fastenfenster (z. B. krank — Gesundwerden hat Vorrang).
 */
export const FASTING_WINDOWS: Record<
  ShiftType,
  { startMin: number; endMin: number } | null
> = {
  // Tagschicht (Arbeit 07:00–19:00)
  day: { startMin: hm(9), endMin: hm(17) },
  // Nachtschicht (Arbeit 19:00–07:00)
  night: { startMin: hm(14), endMin: hm(22) },
  // Schlaftag (Tagschlaf 08:00–14:00)
  sleep: { startMin: hm(14), endMin: hm(21) },
  // Freischicht
  free: { startMin: hm(9), endMin: hm(17) },
  // V-Schicht (Arbeit 08:00–20:00)
  v: { startMin: hm(10), endMin: hm(18) },
  // Urlaub — wie ein freier Tag
  vacation: { startMin: hm(9), endMin: hm(17) },
  // Krank — bewusst kein Fasten
  sick: null,
};

/**
 * Standard-Rotation, die sich fortlaufend wiederholt. Der gesetzte
 * Rotationsstart entspricht dem ERSTEN Eintrag dieser Liste.
 * V-Schichten sind bewusst nicht Teil der Rotation — sie werden bei Bedarf
 * als einzelner Tag überschrieben.
 */
export const SHIFT_ROTATION: ShiftType[] = [
  "day",
  "night",
  "sleep",
  "free",
  "free",
];

/** Hinweise, die in der UI erklärt werden. */
export const FASTING_TIPS = {
  principle: [
    "Fenster ~1–2 h nach dem Aufstehen öffnen und ~2–3 h vor dem Schlafen schließen.",
    "Tief nachts (2–5 Uhr) nichts Schweres essen — da ist die Verdauung am trägsten.",
  ],
  nightShift: [
    "Kräftige Mahlzeit vor der Schicht, danach durch die Nacht fasten.",
    "Bei Bedarf ist eine kleine, proteinreiche Kleinigkeit erlaubt — kein Grund für ein schlechtes Gewissen.",
  ],
  mantras: [
    "Schlaf geht vor Fasten.",
    "Ein unperfekter Übergangstag ruiniert nichts — Konstanz über die Woche zählt.",
  ],
  disclaimer:
    "Allgemeine Information, kein medizinischer Rat. Bei Vorerkrankungen, Medikamenten oder Beschwerden bitte ärztlich abklären.",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
//  LOGIK
// ═══════════════════════════════════════════════════════════════════════════

export interface EatingWindow {
  startMin: number;
  endMin: number;
  /** Länge des Fensters in Stunden (z. B. 8). */
  hours: number;
}

/** "HH:MM" aus Minuten seit 00:00. */
export function formatMin(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Kompakte Dauer, z. B. "2 h 15 min" oder "45 min". */
export function formatDuration(minutes: number): string {
  const total = Math.max(Math.round(minutes), 0);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Essensfenster für eine Schichtart. `null` = kein Fasten vorgesehen. */
export function windowForShift(shift: ShiftType | undefined): EatingWindow | null {
  if (!shift) return null;
  const w = FASTING_WINDOWS[shift];
  if (!w) return null;
  return {
    ...w,
    hours: Math.round(((w.endMin - w.startMin) / 60) * 10) / 10,
  };
}

/**
 * Schicht laut Rotation für ein Datum. `rotationStart` ist der Tag, an dem die
 * Rotation mit ihrem ersten Eintrag beginnt. Ohne Startdatum: undefined.
 */
export function rotationShiftFor(
  date: string,
  rotationStart: string | null | undefined,
): ShiftType | undefined {
  if (!rotationStart) return undefined;
  const len = SHIFT_ROTATION.length;
  if (len === 0) return undefined;
  const delta = diffDaysISO(rotationStart, date);
  return SHIFT_ROTATION[((delta % len) + len) % len];
}

/**
 * Effektive Schicht eines Tages: ein manuell eingetragener Tag gewinnt immer,
 * sonst greift die Rotation.
 */
export function effectiveShift(
  date: string,
  manualShifts: Record<string, ShiftType | undefined>,
  rotationStart: string | null | undefined,
): { shift: ShiftType | undefined; source: "manual" | "rotation" | "none" } {
  const manual = manualShifts[date];
  if (manual) return { shift: manual, source: "manual" };
  const rotated = rotationShiftFor(date, rotationStart);
  if (rotated) return { shift: rotated, source: "rotation" };
  return { shift: undefined, source: "none" };
}

export type FastingState = "eating" | "fasting" | "none";

export interface FastingStatus {
  state: FastingState;
  /** Minuten bis zum nächsten Wechsel (Fensterstart bzw. -ende). */
  minutesUntilChange: number | null;
  /** Zeitpunkt des nächsten Wechsels als "HH:MM" (null, wenn kein Fenster). */
  changeAt: string | null;
  /** Kurztext für die UI. */
  label: string;
}

/**
 * Live-Status zum Zeitpunkt `nowMin` (Minuten seit 00:00 des Tages).
 * `nextDayStartMin` erlaubt nach Fensterschluss den Ausblick auf morgen.
 */
export function fastingStatus(
  window: EatingWindow | null,
  nowMin: number,
  nextDayStartMin?: number | null,
): FastingStatus {
  if (!window) {
    return {
      state: "none",
      minutesUntilChange: null,
      changeAt: null,
      label: "Heute kein Fastenfenster",
    };
  }

  if (nowMin < window.startMin) {
    const left = window.startMin - nowMin;
    return {
      state: "fasting",
      minutesUntilChange: left,
      changeAt: formatMin(window.startMin),
      label: `Fastenzeit — Fenster öffnet in ${formatDuration(left)}`,
    };
  }

  if (nowMin < window.endMin) {
    const left = window.endMin - nowMin;
    return {
      state: "eating",
      minutesUntilChange: left,
      changeAt: formatMin(window.endMin),
      label: `Essen erlaubt — noch ${formatDuration(left)}`,
    };
  }

  // Fenster ist zu: bis morgen fasten.
  if (nextDayStartMin == null) {
    return {
      state: "fasting",
      minutesUntilChange: null,
      changeAt: null,
      label: "Fastenzeit — Fenster für heute geschlossen",
    };
  }
  const left = 1440 - nowMin + nextDayStartMin;
  return {
    state: "fasting",
    minutesUntilChange: left,
    changeAt: formatMin(nextDayStartMin),
    label: `Fastenzeit — Fenster öffnet morgen um ${formatMin(nextDayStartMin)}`,
  };
}

export interface FastingDay {
  date: string;
  shift: ShiftType | undefined;
  source: "manual" | "rotation" | "none";
  window: EatingWindow | null;
}

/** Tagesplan für `days` Tage ab `from` (für die Wochenübersicht). */
export function fastingPlan(
  from: string,
  days: number,
  manualShifts: Record<string, ShiftType | undefined>,
  rotationStart: string | null | undefined,
): FastingDay[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDaysISO(from, i);
    const { shift, source } = effectiveShift(date, manualShifts, rotationStart);
    return { date, shift, source, window: windowForShift(shift) };
  });
}
