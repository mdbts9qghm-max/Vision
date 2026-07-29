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
  // Tagschicht (Arbeit 07:00–19:00, wach ab ~06:00, Bett ~22:30)
  day: { startMin: hm(9), endMin: hm(17) },
  //
  // Nachtschicht (Arbeit 19:00–07:00, Vorschlaf 15:00–17:00).
  //
  // Dieser Tag ist der Sonderfall: von der Öffnung hier bis zur Öffnung am
  // Schlaftag (14:00) liegen 29 h, nicht 24 h — du bist über 24 h am Stück
  // wach. In 29 h passen "8 h essen + 16 h fasten" nicht hinein; entweder
  // wird das Fenster länger oder das Fasten länger als 16 h. Weil das Fasten
  // 16 h nicht überschreiten soll, wird hier das Fenster länger.
  //
  // Praktischer Rhythmus: Frühstück ab 09:00, letzte Mahlzeit ~14:00 vor dem
  // Vorschlaf, nach dem Aufstehen um 17:00 die kräftige Mahlzeit vor
  // Schichtbeginn, danach höchstens noch eine Kleinigkeit bis 22:00 — tief
  // nachts (2–5 Uhr) bleibt es bewusst zu.
  night: { startMin: hm(9), endMin: hm(22) },
  //
  // Schlaftag (Tagschlaf 08:00–14:00, wach ab 14:00, Bett ~22:00): 6 h, damit
  // das Fenster ~2 h vor dem Schlafen schließt. Kürzer als 8 h ist unkritisch
  // — kurze Fenster verlängern das Fasten nie über 16 h hinaus.
  sleep: { startMin: hm(14), endMin: hm(20) },
  // Freischicht
  free: { startMin: hm(9), endMin: hm(17) },
  // V-Schicht (Arbeit 08:00–20:00) — gleicher Takt wie die Tagschicht, damit
  // ein eingeschobener V-Tag die 16 h nicht sprengt.
  v: { startMin: hm(9), endMin: hm(17) },
  // Urlaub — wie ein freier Tag
  vacation: { startMin: hm(9), endMin: hm(17) },
  // Krank — bewusst kein Fasten
  sick: null,
};

/**
 * Zweite (und jede weitere) Nacht in Folge. Anders als bei der ersten Nacht
 * schläfst du hier 08:00–14:00 und bist erst ab 14:00 wach — ein Fenster ab
 * 09:00 würde in deinen Tagschlaf fallen. Schluss bleibt 22:00, damit auch
 * hier höchstens 16 h Fasten folgen.
 */
export const FOLLOW_NIGHT_WINDOW = { startMin: hm(14), endMin: hm(22) };

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
    "Letzte richtige Mahlzeit gegen 14 Uhr — mit vollem Magen schläfst du um 15 Uhr schlechter vor.",
    "Nach dem Vorschlaf (ab 17:00) die kräftige Mahlzeit vor Schichtbeginn.",
    "In der Schicht höchstens noch eine proteinreiche Kleinigkeit bis 22:00, danach ist zu — tief nachts (2–5 Uhr) verdaut der Körper am schlechtesten.",
    "Der Nachtschicht-Tag ist 29 h lang. Deshalb ist das Fenster hier länger als 8 h — sonst würdest du danach über 16 h fasten.",
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

/**
 * Obergrenze fürs Fasten (die „16" in 16/8). Harte Regel: kein Übergang darf
 * länger sein — kürzer ist erlaubt.
 */
export const FAST_TARGET_MIN = 16 * 60;

/**
 * Reguläre Fensterlänge (die „8" in 16/8). Gilt für alle Tage außer der
 * Nachtschicht: dort ist der Tag 29 h lang, dort wird das Fenster bewusst
 * länger, damit das Fasten die 16 h nicht überschreitet.
 */
export const WINDOW_MAX_MIN = 8 * 60;

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

/**
 * Essensfenster für eine Schichtart. `null` = kein Fasten vorgesehen.
 * `followNight` schaltet auf das Fenster der Folgenacht um (Tagschlaf bis 14
 * Uhr) — für ein konkretes Datum nimmt man besser `windowForDate`.
 */
export function windowForShift(
  shift: ShiftType | undefined,
  opts: { followNight?: boolean } = {},
): EatingWindow | null {
  if (!shift) return null;
  const w =
    shift === "night" && opts.followNight
      ? FOLLOW_NIGHT_WINDOW
      : FASTING_WINDOWS[shift];
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

/**
 * Ist `date` eine Folgenacht (Vortag war ebenfalls Nachtschicht)? Nur dann
 * gilt das spätere Fenster.
 */
export function isFollowNight(
  date: string,
  manualShifts: Record<string, ShiftType | undefined>,
  rotationStart: string | null | undefined,
): boolean {
  if (effectiveShift(date, manualShifts, rotationStart).shift !== "night")
    return false;
  return (
    effectiveShift(addDaysISO(date, -1), manualShifts, rotationStart).shift ===
    "night"
  );
}

/**
 * Essensfenster für ein konkretes Datum — wie `windowForShift`, erkennt aber
 * zusätzlich Folgenächte. Das ist der Weg, den die UI nehmen sollte.
 */
export function windowForDate(
  date: string,
  manualShifts: Record<string, ShiftType | undefined>,
  rotationStart: string | null | undefined,
): EatingWindow | null {
  const { shift } = effectiveShift(date, manualShifts, rotationStart);
  return windowForShift(shift, {
    followNight: isFollowNight(date, manualShifts, rotationStart),
  });
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

export interface FastBridge {
  /** Fastenlänge vom Fensterschluss heute bis zur Öffnung morgen (Minuten). */
  minutes: number;
  /** Abweichung vom 16-h-Ziel (negativ = kürzer als 16 h). */
  deltaMin: number;
  /** Kürzer als 16 h — unkritisch, aber sichtbar gemacht. */
  short: boolean;
  /** Länger als 16 h — soll in der Standard-Rotation nie vorkommen. */
  long: boolean;
}

/**
 * Fastenlänge zwischen dem Fenster von heute und dem von morgen.
 *
 * Es gilt exakt: Fasten = 24 h − Fensterlänge heute + (Start morgen −
 * Start heute). Die 16 h werden also genau dann eingehalten, wenn
 * `Fensterschluss heute ≥ Start morgen + 8 h` ist. Genau danach sind die
 * Fenster in FASTING_WINDOWS gewählt.
 *
 * Ein zu LANGER Übergang entsteht nur noch durch manuell eingeschobene
 * Schichten (z. B. ein Schlaftag mitten in der Woche) — der wird als `long`
 * markiert statt versteckt.
 */
export function fastBetween(
  today: EatingWindow | null,
  tomorrow: EatingWindow | null,
): FastBridge | null {
  if (!today || !tomorrow) return null;
  const minutes = 1440 - today.endMin + tomorrow.startMin;
  const deltaMin = minutes - FAST_TARGET_MIN;
  return {
    minutes,
    deltaMin,
    short: minutes < FAST_TARGET_MIN,
    long: minutes > FAST_TARGET_MIN,
  };
}

export interface FastingDay {
  date: string;
  shift: ShiftType | undefined;
  source: "manual" | "rotation" | "none";
  window: EatingWindow | null;
  /** Fasten bis zur Öffnung am Folgetag (null am letzten Tag der Liste). */
  fast: FastBridge | null;
}

/**
 * Tagesplan für `days` Tage ab `from` (für die Wochenübersicht). Jeder Tag
 * kennt zusätzlich das Fasten bis zur Öffnung am Folgetag.
 */
export function fastingPlan(
  from: string,
  days: number,
  manualShifts: Record<string, ShiftType | undefined>,
  rotationStart: string | null | undefined,
): FastingDay[] {
  const base = Array.from({ length: days }, (_, i) => {
    const date = addDaysISO(from, i);
    const { shift, source } = effectiveShift(date, manualShifts, rotationStart);
    return {
      date,
      shift,
      source,
      window: windowForShift(shift, {
        followNight: isFollowNight(date, manualShifts, rotationStart),
      }),
    };
  });
  return base.map((d, i) => ({
    ...d,
    fast: fastBetween(d.window, base[i + 1]?.window ?? null),
  }));
}
