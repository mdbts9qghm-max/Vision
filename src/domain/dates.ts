/**
 * Datums-Konvention der App: Tage sind `YYYY-MM-DD`-Strings in der lokalen
 * Zeitzone des Nutzers (Europe/Berlin) — nie UTC-Mitternacht.
 * Pure Logik, keine Framework-Imports.
 */

export const USER_TIME_ZONE = "Europe/Berlin";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Kalendertag eines Zeitpunkts in der Nutzer-Zeitzone, als "YYYY-MM-DD". */
export function toISODate(d: Date, timeZone: string = USER_TIME_ZONE): string {
  // en-CA formatiert als YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Heutiger Kalendertag in der Nutzer-Zeitzone. */
export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

/** Formale Gültigkeit eines "YYYY-MM-DD"-Strings inkl. echtem Kalenderdatum. */
export function isValidISODate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/** Lesbares deutsches Datum, z.B. "Sonntag, 12. Juli". */
export function formatLongDate(
  iso: string,
  timeZone: string = USER_TIME_ZONE,
): string {
  const [y, m, d] = iso.split("-").map(Number);
  // Mittag UTC, damit kein Zeitzonen-Versatz den Kalendertag kippt.
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("de-DE", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}
