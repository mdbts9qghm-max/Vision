/**
 * Abstand zwischen Lauftagen. Die Wochen werden einzeln geplant — diese Tests
 * planen deshalb wie die echte Regenerierung mehrere Wochen hintereinander und
 * reichen die Lauftage der Vorwoche weiter.
 */

import { describe, expect, it } from "vitest";
import {
  isRunKind,
  planStartblockWeek,
  planWeek,
  runDaysOf,
  type CoachParams,
  type PlannedDay,
  type ShiftType,
} from "./coach";
import { addDaysISO } from "./dates";

/** Rotation Tag → Nacht → Schlaftag → Frei → Frei ab `from`. */
function rotationShifts(from: string, days: number): Record<string, ShiftType> {
  const cycle: ShiftType[] = ["day", "night", "sleep", "free", "free"];
  const out: Record<string, ShiftType> = {};
  for (let i = 0; i < days; i++) {
    out[addDaysISO(from, i)] = cycle[i % cycle.length];
  }
  return out;
}

/** Plant `weeks` Wochen am Stück, wie regenerate() es tut. */
function planChained(
  weekStarts: string[],
  shifts: Record<string, ShiftType | undefined>,
  mode: "startblock" | "ausbau",
): PlannedDay[] {
  const params: CoachParams = {
    weeklyKmBase: 15,
    progressionPct: 7,
    deloadEveryWeeks: 4,
    weeklyGymTarget: 2,
  };
  const out: PlannedDay[] = [];
  let runDaysBefore: string[] = [];
  weekStarts.forEach((ws, i) => {
    const plan =
      mode === "startblock"
        ? planStartblockWeek(ws, shifts, i, { runDaysBefore })
        : planWeek(params, ws, shifts, 30, "ausbau", { runDaysBefore });
    runDaysBefore = runDaysOf(plan);
    out.push(...plan.days);
  });
  return out;
}

/** Längste Kette aufeinanderfolgender Lauftage. */
function longestRunStreak(days: PlannedDay[]): number {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let streak = 0;
  let worst = 0;
  for (const d of sorted) {
    streak = isRunKind(d.kind) ? streak + 1 : 0;
    worst = Math.max(worst, streak);
  }
  return worst;
}

const WEEKS = ["2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24"];

describe("Startblock: nie zwei Lauftage am Stück", () => {
  it("gilt auch über die Wochengrenze hinweg", () => {
    // 28 Tage volle Rotation, damit jede Schichtkombination vorkommt.
    const shifts = rotationShifts("2026-08-03", 28);
    const days = planChained(WEEKS, shifts, "startblock");
    expect(longestRunStreak(days)).toBe(1);
  });

  it("gilt für jeden Startpunkt der Rotation", () => {
    // Der Zyklus ist 5 Tage lang, die Woche 7 — die Phasenlage verschiebt
    // sich also. Alle fünf Lagen prüfen.
    for (let offset = 0; offset < 5; offset++) {
      const cycle: ShiftType[] = ["day", "night", "sleep", "free", "free"];
      const shifts: Record<string, ShiftType> = {};
      for (let i = 0; i < 28; i++) {
        shifts[addDaysISO("2026-08-03", i)] = cycle[(i + offset) % 5];
      }
      const days = planChained(WEEKS, shifts, "startblock");
      expect(longestRunStreak(days), `Rotations-Versatz ${offset}`).toBe(1);
    }
  });

  it("der flexible Schlaftag wird zum Ruhetag, wenn er Läufe verketten würde", () => {
    // Nacht (Lauf-Slot) → Schlaftag → Frei (Lauf-Slot): der Schlaftag darf
    // hier keine Einheit bekommen.
    const shifts: Record<string, ShiftType> = {
      "2026-08-03": "day",
      "2026-08-04": "night",
      "2026-08-05": "sleep",
      "2026-08-06": "free",
      "2026-08-07": "free",
      "2026-08-08": "day",
      "2026-08-09": "night",
    };
    const plan = planStartblockWeek("2026-08-03", shifts, 1);
    const byDate = new Map(plan.days.map((d) => [d.date, d]));
    const schlaftag = byDate.get("2026-08-05")!;
    const nachbarnLaufen =
      isRunKind(byDate.get("2026-08-04")?.kind) ||
      isRunKind(byDate.get("2026-08-06")?.kind);
    if (nachbarnLaufen) expect(isRunKind(schlaftag.kind)).toBe(false);
    expect(longestRunStreak(plan.days)).toBe(1);
  });
});

describe("Aufbauphase: nie drei Lauftage am Stück", () => {
  it("auch über die Wochengrenze hinweg", () => {
    const shifts = rotationShifts("2026-08-03", 28);
    const days = planChained(WEEKS, shifts, "ausbau");
    // Eine bewusste Zweier-Folge pro Woche ist erlaubt (Back-to-Back),
    // drei am Stück nie.
    expect(longestRunStreak(days)).toBeLessThanOrEqual(2);
  });
});

describe("runDaysOf", () => {
  it("liefert genau die Lauftage", () => {
    const shifts = rotationShifts("2026-08-03", 7);
    const plan = planStartblockWeek("2026-08-03", shifts, 0);
    const dates = runDaysOf(plan);
    for (const d of plan.days) {
      expect(dates.includes(d.date)).toBe(isRunKind(d.kind));
    }
  });
});
