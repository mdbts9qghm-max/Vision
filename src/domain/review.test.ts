import { describe, expect, it } from "vitest";
import {
  checkinsInWeek,
  facetDelta,
  weeklyCheckinTrend,
  weekSummary,
} from "./review";
import type { Checkin } from "./checkin";

// Referenzwoche: Mo 2026-07-13 .. So 2026-07-19.
const week: Checkin[] = [
  { date: "2026-07-13", mood: 4, energy: 4, stress: 2 },
  { date: "2026-07-16", mood: 2, energy: 3, stress: 4 },
  { date: "2026-07-20", mood: 5, energy: 5, stress: 1 }, // nächste Woche
];

describe("checkinsInWeek", () => {
  it("filtert auf Mo–So der Woche", () => {
    const inWeek = checkinsInWeek(week, "2026-07-13");
    expect(inWeek.map((c) => c.date)).toEqual(["2026-07-13", "2026-07-16"]);
  });
});

describe("weekSummary", () => {
  it("aggregiert nur die Tage der Woche", () => {
    const s = weekSummary(week, "2026-07-13");
    expect(s.count).toBe(2);
    expect(s.mood).toBe(3); // (4+2)/2
  });
});

describe("weeklyCheckinTrend", () => {
  it("liefert die letzten n Wochen inkl. laufender, älteste zuerst", () => {
    const trend = weeklyCheckinTrend(week, "2026-07-16", 3);
    expect(trend).toHaveLength(3);
    expect(trend.map((t) => t.weekStart)).toEqual([
      "2026-06-29",
      "2026-07-06",
      "2026-07-13",
    ]);
    expect(trend.at(-1)?.isCurrent).toBe(true);
    expect(trend.at(-1)?.mood).toBe(3);
    expect(trend[0].count).toBe(0);
  });
});

describe("facetDelta", () => {
  it("berechnet die Differenz zur Vorwoche", () => {
    expect(facetDelta(3.5, 3).delta).toBe(0.5);
    expect(facetDelta(2, 4).delta).toBe(-2);
  });
  it("gibt null, wenn ein Wert fehlt", () => {
    expect(facetDelta(3, null).delta).toBeNull();
    expect(facetDelta(null, 3).delta).toBeNull();
  });
});
