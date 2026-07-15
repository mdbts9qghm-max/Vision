import type { Habit } from "@/server/queries/habits";

/** Mess-/Zähl-Gewohnheit mit Zwei-Level-Ziel (hat einen Zielwert). */
export function isMeasureHabit(habit: Habit): boolean {
  return habit.targetValue != null && habit.targetValue > 0;
}

/** Sinnvolle Schrittweite für den Wert-Stepper. */
export function habitStep(targetValue: number, unit?: string | null): number {
  const u = (unit ?? "").toLowerCase();
  if (u === "l" || u === "liter") return 0.25;
  if (targetValue <= 5) return 0.5;
  return 1;
}
