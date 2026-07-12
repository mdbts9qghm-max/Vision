/**
 * Wiederholungs-Modell für Gewohnheiten.
 * Pure Logik, keine Framework-Imports.
 */

import { isoWeekday } from "./dates";

/** ISO-Wochentag: 1 = Montag … 7 = Sonntag. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Recurrence =
  | { type: "daily" }
  | { type: "timesPerWeek"; times: number }
  | { type: "weekdays"; weekdays: IsoWeekday[] };

/**
 * Ist die Gewohnheit an diesem Kalendertag fällig?
 * "timesPerWeek" ist nicht an Tage gebunden — jeder Tag ist möglicher
 * Erledigungstag, solange die Woche das Soll noch nicht erreicht hat;
 * das bewertet der Aufrufer über den Wochenfortschritt.
 */
export function isDueOn(recurrence: Recurrence, iso: string): boolean {
  switch (recurrence.type) {
    case "daily":
      return true;
    case "timesPerWeek":
      return true;
    case "weekdays":
      return recurrence.weekdays.includes(isoWeekday(iso) as IsoWeekday);
  }
}
