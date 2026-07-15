import type { HabitInput } from "@/server/actions/habits";

/**
 * Kuratierte Vorschlagsliste (Habit-Spec Kap. 3) — bewusst begrenzt,
 * Kontext Schichtarbeit + Ultra. Jeder Vorschlag bringt einen konkreten
 * Auslöser mit. Initial nur 3–5 aktivieren.
 */
export interface HabitPreset extends HabitInput {
  key: string;
}

export const HABIT_LIBRARY: HabitPreset[] = [
  // Schlaf (höchste Priorität)
  {
    key: "anchor-sleep",
    name: "Ankerschlafzeit",
    cue: "Immer zur gleichen Kernzeit ins Bett",
    category: "sleep",
    recurrence: { type: "daily" },
  },
  {
    key: "nap-before-night",
    name: "Nap vor Nachtschicht",
    cue: "Vor der Nachtschicht 14–17 Uhr hinlegen",
    category: "sleep",
    recurrence: { type: "daily", shiftTypes: ["night"] },
  },
  {
    key: "caffeine-stop",
    name: "Koffein-Stopp",
    cue: "6–8 h vor dem geplanten Schlaf kein Koffein mehr",
    category: "sleep",
    recurrence: { type: "daily" },
  },
  {
    key: "light-mgmt",
    name: "Sonnenbrille nach Nachtschicht",
    cue: "Auf dem Heimweg nach der Nacht Sonnenbrille auf",
    category: "sleep",
    recurrence: { type: "daily", shiftTypes: ["night", "sleep"] },
  },
  // Ernährung
  {
    key: "protein",
    name: "Protein-Tagesziel",
    cue: "Zu jeder Mahlzeit eine Proteinquelle",
    category: "nutrition",
    recurrence: { type: "daily" },
  },
  {
    key: "hydration",
    name: "Hydration",
    cue: "Über den Tag verteilt trinken",
    category: "nutrition",
    recurrence: { type: "daily" },
    minValue: 2,
    targetValue: 3,
    unit: "L",
  },
  {
    key: "fueling",
    name: "Fueling im Long Run",
    cue: "Im langen Lauf 60–90 g KH pro Stunde üben",
    category: "nutrition",
    recurrence: { type: "timesPerWeek", times: 1 },
  },
  // Bewegung
  {
    key: "strength",
    name: "Kraft 2×/Woche",
    cue: "An freien Tagen: hintere Kette, einbeinig, Rumpf",
    category: "movement",
    recurrence: { type: "timesPerWeek", times: 2 },
  },
  {
    key: "mobility",
    name: "Mobility / Prehab",
    cue: "Nach dem Zähneputzen 10 min Mobility",
    category: "movement",
    recurrence: { type: "daily" },
  },
  // Erholung & Mentales
  {
    key: "readiness",
    name: "Readiness-Check",
    cue: "Nach dem Aufwachen WHOOP-Werte eintragen",
    category: "recovery",
    recurrence: { type: "daily" },
  },
  {
    key: "focus",
    name: "Tagesfokus setzen",
    cue: "Nach dem ersten Kaffee den Fokus des Tages festlegen",
    category: "mind",
    recurrence: { type: "daily" },
  },
];

export function findPreset(key: string | undefined): HabitPreset | undefined {
  if (!key) return undefined;
  return HABIT_LIBRARY.find((p) => p.key === key);
}
