/**
 * Zwei-Level-Ziel (Habit-Spec 2.4): Minimum (nicht verhandelbar) + Ziel
 * (eigentlicher Anspruch). Minimum erreicht = Erfolg; Ziel erreicht = Bonus.
 * Rettet die Kontinuität an schlechten Tagen (Alles-oder-nichts vermeiden).
 * Pure Logik, keine Framework-Imports.
 */

export type GoalLevel = "none" | "minimum" | "target";

export interface TwoLevelGoal {
  minValue?: number | null;
  targetValue?: number | null;
}

/**
 * Bewertet einen erfassten Wert gegen Minimum/Ziel.
 * Ohne definierte Schwellen zählt jede Erledigung als volles Ziel.
 */
export function evaluateLevel(
  goal: TwoLevelGoal,
  value: number | null | undefined,
): GoalLevel {
  const min = goal.minValue ?? null;
  const target = goal.targetValue ?? null;

  // Reine Check-Gewohnheit ohne Werte: erledigt = Ziel.
  if (min === null && target === null) {
    return value === null || value === undefined ? "none" : "target";
  }
  if (value === null || value === undefined) return "none";

  if (target !== null && value >= target) return "target";
  if (min !== null && value >= min) return "minimum";
  // Ziel gesetzt, aber kein Minimum: alles darunter zählt noch nicht.
  if (min === null && target !== null) return "none";
  return "none";
}
