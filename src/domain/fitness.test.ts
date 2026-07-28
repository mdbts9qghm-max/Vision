import { describe, expect, it } from "vitest";
import {
  averageOverDays,
  lastDays,
  trailingAverage,
  weeklyVolume,
} from "./fitness";

describe("trailingAverage", () => {
  it("mittelt über das Fenster und sortiert nach Datum", () => {
    const result = trailingAverage(
      [
        { date: "2026-07-03", value: 82 },
        { date: "2026-07-01", value: 84 },
        { date: "2026-07-02", value: 83 },
      ],
      7,
    );
    expect(result.map((p) => p.date)).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
    ]);
    expect(result[0].value).toBe(84);
    expect(result[1].value).toBe(83.5);
    expect(result[2].value).toBe(83);
  });

  it("Werte außerhalb des Fensters fallen heraus", () => {
    const result = trailingAverage(
      [
        { date: "2026-07-01", value: 100 },
        { date: "2026-07-10", value: 80 },
      ],
      7,
    );
    // Am 10.07. liegt der 01.07. außerhalb der letzten 7 Tage.
    expect(result[1].value).toBe(80);
  });

  it("Lücken in der Messreihe sind erlaubt", () => {
    const result = trailingAverage(
      [
        { date: "2026-07-06", value: 84 },
        { date: "2026-07-09", value: 82 },
      ],
      7,
    );
    expect(result[1].value).toBe(83);
  });

  it("leere Reihe bleibt leer", () => {
    expect(trailingAverage([], 7)).toEqual([]);
  });
});

describe("averageOverDays", () => {
  const points = [
    { date: "2026-07-07", value: 7000 },
    { date: "2026-07-12", value: 9000 },
    { date: "2026-07-13", value: 11000 },
    { date: "2026-06-01", value: 99999 }, // weit außerhalb
  ];

  it("mittelt nur Werte im Zeitraum", () => {
    expect(averageOverDays(points, "2026-07-13", 7)).toBe(9000);
  });

  it("null ohne Werte im Zeitraum", () => {
    expect(averageOverDays(points, "2026-08-30", 7)).toBeNull();
  });
});

describe("weeklyVolume", () => {
  // Woche Mo 2026-07-13 … So 2026-07-19, heute Mi 2026-07-15.
  const today = "2026-07-15";

  it("bucketiert Läufe auf Wochen, Kraft zählt nicht", () => {
    const v = weeklyVolume(
      [
        { date: "2026-07-13", distanceKm: 5, type: "Laufen" },
        { date: "2026-07-15", distanceKm: 8.5, type: "Laufen" },
        { date: "2026-07-15", distanceKm: null, type: "Kraft" },
        { date: "2026-07-06", distanceKm: 4, type: "Laufen" }, // Vorwoche
      ],
      today,
      3,
    );
    expect(v).toHaveLength(3);
    expect(v.at(-1)).toMatchObject({
      weekStart: "2026-07-13",
      km: 13.5,
      runs: 2,
      isCurrent: true,
    });
    expect(v.at(-2)).toMatchObject({ weekStart: "2026-07-06", km: 4, runs: 1 });
    expect(v[0]).toMatchObject({ km: 0, runs: 0, isCurrent: false });
  });

  it("ignoriert Einträge außerhalb des Fensters", () => {
    const v = weeklyVolume(
      [{ date: "2020-01-01", distanceKm: 99, type: "Laufen" }],
      today,
      2,
    );
    expect(v.every((w) => w.km === 0)).toBe(true);
  });
});

describe("lastDays", () => {
  it("schneidet auf das Fenster zu und sortiert", () => {
    const pts = [
      { date: "2026-07-15", value: 3 },
      { date: "2026-07-10", value: 1 },
      { date: "2026-07-14", value: 2 },
    ];
    const r = lastDays(pts, "2026-07-15", 3);
    expect(r.map((p) => p.date)).toEqual(["2026-07-14", "2026-07-15"]);
  });
});
