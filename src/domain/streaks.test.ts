import { describe, expect, it } from "vitest";
import { computeStreak } from "./streaks";
import type { Completion, Recurrence } from "./recurrence";

// 2026-07-12 ist ein Sonntag; Woche Mo 2026-07-06 … So 2026-07-12.
const TODAY = "2026-07-12";
const daily: Recurrence = { type: "daily" };
const moMiFr: Recurrence = { type: "weekdays", weekdays: [1, 3, 5] };
const x3: Recurrence = { type: "timesPerWeek", times: 3 };

const done = (...dates: string[]): Completion[] =>
  dates.map((date) => ({ date, status: "done" }));
const skip = (...dates: string[]): Completion[] =>
  dates.map((date) => ({ date, status: "skipped" }));

describe("computeStreak — daily", () => {
  it("zählt aufeinanderfolgende Tage inklusive heute", () => {
    const s = computeStreak(daily, done("2026-07-10", "2026-07-11", "2026-07-12"), TODAY);
    expect(s).toEqual({ value: 3, unit: "days" });
  });

  it("heute noch offen bricht die Streak nicht, zählt aber nicht mit", () => {
    const s = computeStreak(daily, done("2026-07-10", "2026-07-11"), TODAY);
    expect(s).toEqual({ value: 2, unit: "days" });
  });

  it("eine Lücke vor gestern beendet die Streak", () => {
    const s = computeStreak(daily, done("2026-07-09", "2026-07-11", "2026-07-12"), TODAY);
    expect(s.value).toBe(2);
  });

  it("ein bewusster Skip bricht die Streak nicht (neutral)", () => {
    // 11.07. übersprungen, davor + danach erledigt.
    const s = computeStreak(
      daily,
      [...done("2026-07-10", "2026-07-12"), ...skip("2026-07-11")],
      TODAY,
    );
    expect(s.value).toBe(2);
  });

  it("keine Completions → 0", () => {
    expect(computeStreak(daily, [], TODAY).value).toBe(0);
  });
});

describe("computeStreak — weekdays (Mo/Mi/Fr)", () => {
  it("überspringt nicht-fällige Tage", () => {
    const s = computeStreak(moMiFr, done("2026-07-06", "2026-07-08", "2026-07-10"), TODAY);
    expect(s).toEqual({ value: 3, unit: "days" });
  });

  it("verpasster fälliger Tag beendet die Streak", () => {
    const s = computeStreak(moMiFr, done("2026-07-06", "2026-07-10"), TODAY);
    expect(s.value).toBe(1);
  });

  it("heute fällig und offen bricht nicht (Mo als heute)", () => {
    const s = computeStreak(moMiFr, done("2026-07-10"), "2026-07-13");
    expect(s.value).toBe(1);
  });

  it("leere Wochentagsliste → 0 (kein Endlos-Lauf)", () => {
    const empty: Recurrence = { type: "weekdays", weekdays: [] };
    expect(computeStreak(empty, done("2026-07-10"), TODAY).value).toBe(0);
  });
});

describe("computeStreak — timesPerWeek (3x)", () => {
  it("zählt erfüllte Wochen; laufende erfüllte Woche zählt mit", () => {
    const s = computeStreak(
      x3,
      done(
        "2026-06-29", "2026-07-01", "2026-07-03",
        "2026-07-06", "2026-07-08", "2026-07-10",
      ),
      TODAY,
    );
    expect(s).toEqual({ value: 2, unit: "weeks" });
  });

  it("laufende unerfüllte Woche bricht die Streak nicht", () => {
    const s = computeStreak(
      x3,
      done("2026-06-29", "2026-07-01", "2026-07-03", "2026-07-06"),
      TODAY,
    );
    expect(s).toEqual({ value: 1, unit: "weeks" });
  });

  it("Skip senkt das Wochensoll — 2×+1 Skip erfüllt die Woche", () => {
    const s = computeStreak(
      x3,
      [
        ...done("2026-06-29", "2026-07-01", "2026-07-03"), // Vorwoche voll
        ...done("2026-07-06", "2026-07-08"), // laufende: 2 erledigt
        ...skip("2026-07-10"), // + 1 Skip → Soll 2 erreicht
      ],
      TODAY,
    );
    expect(s.value).toBe(2);
  });

  it("keine Completions → 0", () => {
    expect(computeStreak(x3, [], TODAY).value).toBe(0);
  });
});
