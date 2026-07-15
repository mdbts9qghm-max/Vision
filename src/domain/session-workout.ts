/**
 * Bildet eine geplante Coach-Einheit auf einen loggbaren Workout-Entwurf ab
 * (für das Ein-Tap-Erledigt-Logging). Pure Logik, keine Framework-Imports.
 */

import type { SessionKind } from "./coach";

export interface WorkoutDraft {
  type: string;
  durationMin: number;
  distanceKm?: number;
  note: string;
}

// Grobe Dauer-Schätzung, wenn nur Kilometer geplant sind (lockeres Z2-Tempo).
const PACE_MIN_PER_KM = 7;

export function plannedSessionToWorkout(
  kind: SessionKind,
  targetKm?: number | null,
  targetMin?: number | null,
): WorkoutDraft | null {
  const note = "Aus dem Coach-Plan geloggt";
  switch (kind) {
    case "longrun":
    case "run":
    case "easy": {
      const km = targetKm ?? undefined;
      const durationMin =
        targetMin ??
        (km !== undefined ? Math.max(Math.round(km * PACE_MIN_PER_KM), 1) : 30);
      return { type: "Laufen", durationMin, distanceKm: km, note };
    }
    case "gym":
      return { type: "Kraft", durationMin: targetMin ?? 40, note };
    case "mobility":
      return { type: "Mobility", durationMin: targetMin ?? 12, note };
    case "rest":
      return null;
  }
}
