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

export const HABIT_CATEGORY_LABEL: Record<
  "sleep" | "nutrition" | "movement" | "recovery" | "mind",
  string
> = {
  sleep: "Schlaf",
  nutrition: "Ernährung",
  movement: "Bewegung",
  recovery: "Erholung",
  mind: "Mentales",
};

export function recurrenceLabel(recurrence: Recurrence): string {
  const base = (() => {
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
  })();
  if (recurrence.shiftTypes && recurrence.shiftTypes.length > 0) {
    const shifts = recurrence.shiftTypes
      .map((s) => SHIFT_TYPE_LABEL[s])
      .join("/");
    return `${base} · nur ${shifts}`;
  }
  return base;
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

export const SHIFT_TYPE_LABEL: Record<
  "day" | "night" | "sleep" | "free" | "v",
  string
> = {
  day: "Tagschicht",
  night: "Nachtschicht",
  sleep: "Schlaftag",
  free: "Frei",
  v: "V-Schicht",
};

/** Kernzeiten je Schichtart — V-Schicht liegt willkürlich. */
export const SHIFT_TIME_LABEL: Record<
  "day" | "night" | "sleep" | "free" | "v",
  string
> = {
  day: "07:00–19:00",
  night: "19:00–07:00 · Vorschlaf ~14–17 Uhr",
  sleep: "Schlaf bis ~14:00, danach frei",
  free: "ganzer Tag frei",
  v: "≈08:00–20:00 (variabel)",
};

export const SESSION_KIND_LABEL: Record<
  "longrun" | "run" | "easy" | "gym" | "mobility" | "rest",
  string
> = {
  longrun: "Long Run",
  run: "Lauf (moderat)",
  easy: "Lockerer Lauf",
  gym: "Kraft",
  mobility: "Mobility",
  rest: "Ruhe",
};

/** "noch 12 Tage" · "heute fällig" · "3 Tage überfällig" */
export function deadlineLabel(daysLeft: number): string {
  if (daysLeft > 1) return `noch ${daysLeft} Tage`;
  if (daysLeft === 1) return "noch 1 Tag";
  if (daysLeft === 0) return "heute fällig";
  if (daysLeft === -1) return "1 Tag überfällig";
  return `${-daysLeft} Tage überfällig`;
}
