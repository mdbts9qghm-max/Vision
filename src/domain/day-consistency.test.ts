/**
 * Gegencheck über die drei Bausteine eines Tages: Schlafplan (Schlaf, Arbeit,
 * Training, Mahlzeiten), Fastenfenster und Trainingsplatzierung.
 *
 * Diese Tests halten fest, dass die Zeiten zusammenpassen — sie schlagen an,
 * sobald irgendwo eine Uhrzeit verschoben wird, ohne die anderen Stellen
 * nachzuziehen.
 */

import { describe, expect, it } from "vitest";
import { hm, sleepPlan } from "./sleep";
import {
  FAST_TARGET_MIN,
  SHIFT_ROTATION,
  fastBetween,
  formatMin,
  windowForShift,
} from "./fasting";
import type { ShiftType } from "./coach";

interface Case {
  label: string;
  shift: ShiftType;
  firstNight: boolean;
}

const CASES: Case[] = [
  { label: "Tagschicht", shift: "day", firstNight: false },
  { label: "Nachtschicht (erste)", shift: "night", firstNight: true },
  { label: "Nachtschicht (Folge)", shift: "night", firstNight: false },
  { label: "Schlaftag", shift: "sleep", firstNight: false },
  { label: "Freischicht", shift: "free", firstNight: false },
  { label: "Urlaub", shift: "vacation", firstNight: false },
  { label: "V-Schicht", shift: "v", firstNight: false },
];

/** Fenster passend zum Fall — Folgenächte haben ein eigenes. */
function windowFor(c: Case) {
  return windowForShift(c.shift, {
    followNight: c.shift === "night" && !c.firstNight,
  });
}

describe("Mahlzeiten liegen im Essensfenster", () => {
  for (const c of CASES) {
    it(c.label, () => {
      const w = windowFor(c);
      if (!w) return; // krank: kein Fasten
      const plan = sleepPlan(c.shift, { firstNight: c.firstNight });
      const meals = plan.markers.filter((m) => m.kind === "meal");
      expect(meals.length).toBeGreaterThan(0);
      for (const m of meals) {
        expect(
          m.atMin,
          `${c.label}: "${m.label}" um ${formatMin(m.atMin)} liegt außerhalb von ${formatMin(w.startMin)}–${formatMin(w.endMin)}`,
        ).toBeGreaterThanOrEqual(w.startMin);
        expect(m.atMin).toBeLessThanOrEqual(w.endMin);
      }
    });
  }
});

describe("Fenster kollidiert nicht mit Schlaf", () => {
  for (const c of CASES) {
    it(c.label, () => {
      const w = windowFor(c);
      if (!w) return;
      const plan = sleepPlan(c.shift, { firstNight: c.firstNight });
      // Haupt- und Tagschlaf; der kurze Nap darf im Fenster liegen (Vorschlaf).
      const sleeps = plan.segments.filter((s) => s.kind === "sleep");
      for (const s of sleeps) {
        const overlap =
          Math.min(w.endMin, s.endMin) - Math.max(w.startMin, s.startMin);
        expect(
          overlap,
          `${c.label}: Fenster ${formatMin(w.startMin)}–${formatMin(w.endMin)} überschneidet ${s.label} ${formatMin(s.startMin)}–${formatMin(s.endMin)}`,
        ).toBeLessThanOrEqual(0);
      }
    });
  }
});

describe("Trainingseinheiten sind versorgt", () => {
  // Mobility und kurze Abendrunden dürfen nüchtern laufen — alles, was
  // Kilometer bringt, muss im Fenster liegen.
  const FASTED_OK = new Set(["Mobility (optional)", "Locker (optional)"]);

  for (const c of CASES) {
    it(c.label, () => {
      const w = windowFor(c);
      const plan = sleepPlan(c.shift, { firstNight: c.firstNight });
      for (const s of plan.segments.filter((x) => x.kind === "training")) {
        if (FASTED_OK.has(s.label) || !w) continue;
        expect(
          s.startMin,
          `${c.label}: "${s.label}" startet ${formatMin(s.startMin)}, Fenster öffnet erst ${formatMin(w.startMin)}`,
        ).toBeGreaterThanOrEqual(w.startMin);
        expect(s.endMin).toBeLessThanOrEqual(w.endMin);
      }
    });
  }
});

describe("Koffein hält 6 h Abstand zum nächsten Schlaf", () => {
  for (const c of CASES) {
    it(c.label, () => {
      const plan = sleepPlan(c.shift, { firstNight: c.firstNight });
      for (const caf of plan.markers.filter((m) => m.kind === "caffeine")) {
        // Nächster Schlafbeginn nach der Koffein-Dosis (ggf. am Folgetag).
        const starts = plan.segments
          .filter((s) => s.kind === "sleep" && s.startMin > 0)
          .map((s) => s.startMin);
        const next = starts.find((s) => s > caf.atMin);
        const gap =
          next !== undefined
            ? next - caf.atMin
            : 1440 - caf.atMin + Math.min(...starts, 1440);
        expect(
          gap,
          `${c.label}: Koffein ${formatMin(caf.atMin)} liegt nur ${Math.round(gap / 60)} h vor dem Schlaf`,
        ).toBeGreaterThanOrEqual(6 * 60);
      }
    });
  }
});

describe("Fasten über die Rotation", () => {
  it("kein Übergang länger als 16 h", () => {
    for (let i = 0; i < SHIFT_ROTATION.length; i++) {
      const heute = windowForShift(SHIFT_ROTATION[i]);
      const morgen = windowForShift(
        SHIFT_ROTATION[(i + 1) % SHIFT_ROTATION.length],
      );
      const f = fastBetween(heute, morgen)!;
      expect(f.minutes).toBeLessThanOrEqual(FAST_TARGET_MIN);
    }
  });

  it("auch ein Nachtschicht-Block hält die 16 h", () => {
    const erste = windowForShift("night");
    const folge = windowForShift("night", { followNight: true });
    // erste Nacht -> Folgenacht
    expect(fastBetween(erste, folge)!.minutes).toBe(FAST_TARGET_MIN);
    // Folgenacht -> Folgenacht
    expect(fastBetween(folge, folge)!.minutes).toBe(FAST_TARGET_MIN);
    // Folgenacht -> Schlaftag
    expect(fastBetween(folge, windowForShift("sleep"))!.minutes).toBe(
      FAST_TARGET_MIN,
    );
  });

  it("Folgenacht öffnet erst nach dem Tagschlaf", () => {
    const folge = windowForShift("night", { followNight: true })!;
    expect(folge.startMin).toBe(hm(14));
    expect(folge.endMin).toBe(hm(22));
  });
});
