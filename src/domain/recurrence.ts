/**
 * Wiederholungs-Modell für Gewohnheiten (Typen).
 * Die Berechnungslogik (fällig heute? erfüllt diese Woche?) folgt in
 * MVP-Schritt 2 — inkl. Unit-Tests, bevor sie im UI verwendet wird.
 */

/** ISO-Wochentag: 1 = Montag … 7 = Sonntag. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Recurrence =
  | { type: "daily" }
  | { type: "timesPerWeek"; times: number }
  | { type: "weekdays"; weekdays: IsoWeekday[] };
