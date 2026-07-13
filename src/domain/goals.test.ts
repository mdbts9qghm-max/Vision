import { describe, expect, it } from "vitest";
import { milestoneProgress } from "./goals";
import { diffDaysISO } from "./dates";

describe("milestoneProgress", () => {
  it("zählt erledigte gegen alle Meilensteine", () => {
    const p = milestoneProgress([
      { completedAt: "2026-07-01T10:00:00.000Z" },
      { completedAt: null },
      { completedAt: null },
    ]);
    expect(p).toEqual({ done: 1, total: 3, ratio: 1 / 3 });
  });

  it("ohne Meilensteine gibt es keine Quote", () => {
    expect(milestoneProgress([])).toEqual({ done: 0, total: 0, ratio: null });
  });
});

describe("diffDaysISO", () => {
  it("zählt ganze Tage, vorwärts und rückwärts", () => {
    expect(diffDaysISO("2026-07-13", "2026-07-20")).toBe(7);
    expect(diffDaysISO("2026-07-13", "2026-07-13")).toBe(0);
    expect(diffDaysISO("2026-07-13", "2026-07-10")).toBe(-3);
  });

  it("über Monats- und Jahresgrenzen", () => {
    expect(diffDaysISO("2026-12-31", "2027-01-01")).toBe(1);
    expect(diffDaysISO("2026-02-28", "2026-03-01")).toBe(1); // kein Schaltjahr
  });
});
