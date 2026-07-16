import { describe, expect, it } from "vitest";
import { hm, sleepPlan, tomorrowPrep } from "./sleep";
import type { ShiftType } from "./coach";

const ALL: ShiftType[] = ["day", "night", "sleep", "free", "v"];

describe("sleepPlan — Invarianten", () => {
  it("alle Segmente liegen in 0..1440 mit start < end", () => {
    for (const shift of ALL) {
      for (const first of [true, false]) {
        const plan = sleepPlan(shift, { firstNight: first });
        for (const s of plan.segments) {
          expect(s.startMin).toBeGreaterThanOrEqual(0);
          expect(s.endMin).toBeLessThanOrEqual(1440);
          expect(s.startMin).toBeLessThan(s.endMin);
        }
        for (const m of plan.markers) {
          expect(m.atMin).toBeGreaterThanOrEqual(0);
          expect(m.atMin).toBeLessThanOrEqual(1440);
        }
        expect(plan.tips.length).toBeGreaterThan(0);
        expect(plan.eveningRoutine.length).toBeGreaterThan(0);
      }
    }
  });

  it("tomorrowPrep liefert für jede Schicht Anweisungen, differenziert bei Nacht", () => {
    for (const shift of ALL) {
      expect(tomorrowPrep(shift).length).toBeGreaterThan(0);
    }
    // erste vs. Folgenacht unterscheiden sich
    expect(tomorrowPrep("night", { firstNight: true })).not.toEqual(
      tomorrowPrep("night", { firstNight: false }),
    );
    // ohne Schicht: Hinweis zum Eintragen
    expect(tomorrowPrep(undefined)[0]).toContain("keine Schicht");
  });

  it("über Mitternacht laufender Nachtschlaf wird gesplittet (Freischicht)", () => {
    const plan = sleepPlan("free");
    const sleeps = plan.segments.filter((s) => s.kind === "sleep");
    // 23:00–07:00 → [23:00–24:00] + [00:00–07:00]
    expect(sleeps.some((s) => s.startMin === hm(23) && s.endMin === 1440)).toBe(true);
    expect(sleeps.some((s) => s.startMin === 0 && s.endMin === hm(7))).toBe(true);
  });
});

describe("sleepPlan — Nachtschicht erste vs. Folgenacht", () => {
  it("erste Nacht: freier Vormittag mit Lauf, Vorschlaf am Nachmittag", () => {
    const plan = sleepPlan("night", { firstNight: true });
    expect(plan.segments.some((s) => s.kind === "training")).toBe(true);
    expect(plan.segments.some((s) => s.kind === "nap")).toBe(true);
    // kein Vormittags-Work
    expect(
      plan.segments.some((s) => s.kind === "work" && s.startMin < hm(12)),
    ).toBe(false);
  });

  it("Folgenacht: Vormittag ist Tagschlaf, kein Training", () => {
    const plan = sleepPlan("night", { firstNight: false });
    expect(plan.segments.some((s) => s.kind === "training")).toBe(false);
    expect(
      plan.segments.some(
        (s) => s.kind === "sleep" && s.startMin === hm(8) && s.endMin === hm(14),
      ),
    ).toBe(true);
  });
});
