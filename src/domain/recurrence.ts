/**
 * Wiederholungs-Modell für Gewohnheiten.
 * Pure Logik, keine Framework-Imports.
 */

import { isoWeekday } from "./dates";
import type { ShiftType } from "./coach";

/** ISO-Wochentag: 1 = Montag … 7 = Sonntag. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type BaseRecurrence =
  | { type: "daily" }
  | { type: "timesPerWeek"; times: number }
  | { type: "weekdays"; weekdays: IsoWeekday[] };

/**
 * `shiftTypes` (optional): die Gewohnheit ist nur an diesen Schichtarten
 * fällig — der stärkste Anker im Schichtalltag (z. B. „nur an Freischichten").
 */
export type Recurrence = BaseRecurrence & { shiftTypes?: ShiftType[] };

/**
 * Erledigungsstatus eines Tages (verpasst = kein Eintrag, wird berechnet).
 * `partial`: Wert geloggt, aber Minimum noch nicht erreicht — zählt nicht als
 * erledigt, ist aber auch kein bewusster Skip.
 */
export type CompletionStatus = "done" | "skipped" | "partial";

export interface Completion {
  date: string; // YYYY-MM-DD
  status: CompletionStatus;
  value?: number | null; // für Zwei-Level-Auswertung
}

/**
 * Ist die Gewohnheit an diesem Kalendertag fällig?
 *
 * - `timesPerWeek` ist nicht an Tage gebunden — jeder Tag ist möglicher
 *   Erledigungstag, solange die Woche das Soll noch nicht erreicht hat.
 * - `shiftTypes`: Ist die Schicht bekannt und nicht in der Liste, ist der Tag
 *   nicht fällig. Unbekannte Schicht schränkt nicht ein (Anzeige „im Zweifel
 *   zeigen"; wer die Schicht loggt, bekommt die korrekte Fälligkeit).
 */
export function isDueOn(
  recurrence: Recurrence,
  iso: string,
  shift?: ShiftType,
): boolean {
  if (
    recurrence.shiftTypes &&
    recurrence.shiftTypes.length > 0 &&
    shift !== undefined &&
    !recurrence.shiftTypes.includes(shift)
  ) {
    return false;
  }
  switch (recurrence.type) {
    case "daily":
      return true;
    case "timesPerWeek":
      return true;
    case "weekdays":
      return recurrence.weekdays.includes(isoWeekday(iso) as IsoWeekday);
  }
}

/** Bequemer Zugriff auf die Schicht eines Tages aus einer optionalen Map. */
export type ShiftLookup = Record<string, ShiftType | undefined> | undefined;

export function shiftOn(shifts: ShiftLookup, iso: string): ShiftType | undefined {
  return shifts?.[iso];
}
