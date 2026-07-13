import type { IsoWeekday, Recurrence } from "@/domain/recurrence";
import type { Streak } from "@/domain/streaks";

export const WEEKDAY_SHORT: Record<IsoWeekday, string> = {
  1: "Mo",
  2: "Di",
  3: "Mi",
  4: "Do",
  5: "Fr",
  6: "Sa",
  7: "So",
};

export function recurrenceLabel(recurrence: Recurrence): string {
  switch (recurrence.type) {
    case "daily":
      return "Täglich";
    case "timesPerWeek":
      return `${recurrence.times}× pro Woche`;
    case "weekdays":
      return [...recurrence.weekdays]
        .sort((a, b) => a - b)
        .map((d) => WEEKDAY_SHORT[d])
        .join(" · ");
  }
}

export function streakLabel(streak: Streak): string {
  const unit =
    streak.unit === "weeks"
      ? streak.value === 1
        ? "Woche"
        : "Wochen"
      : streak.value === 1
        ? "Tag"
        : "Tage";
  return `${streak.value} ${unit}`;
}

export function percentLabel(rate: number | null): string {
  if (rate === null) return "–";
  return `${Math.round(rate * 100)} %`;
}

export const PRIORITY_LABEL: Record<"low" | "medium" | "high", string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
};

/** "noch 12 Tage" · "heute fällig" · "3 Tage überfällig" */
export function deadlineLabel(daysLeft: number): string {
  if (daysLeft > 1) return `noch ${daysLeft} Tage`;
  if (daysLeft === 1) return "noch 1 Tag";
  if (daysLeft === 0) return "heute fällig";
  if (daysLeft === -1) return "1 Tag überfällig";
  return `${-daysLeft} Tage überfällig`;
}
