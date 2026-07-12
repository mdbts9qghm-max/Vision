import { describe, expect, it } from "vitest";
import { computeStreak } from "./streaks";
import type { Recurrence } from "./recurrence";

// 2026-07-12 ist ein Sonntag; Woche Mo 2026-07-06 … So 2026-07-12.
const TODAY = "2026-07-12";
const daily: Recurrence = { type: "daily" };
const moMiFr: Recurrence = { type: "weekdays", weekdays: [1, 3, 5] };
const x3: Recurrence = { type: "timesPerWeek", times: 3 };

describe("computeStreak — daily", () => {
  it("zählt aufeinanderfolgende Tage inklusive heute", () => {
    const s = computeStreak(daily, ["2026-07-10", "2026-07-11", "2026-07-12"], TODAY);
    expect(s).toEqual({ value: 3, unit: "days" });
  });

  it("heute noch offen bricht die Streak nicht, zählt aber nicht mit", () => {
    const s = computeStreak(daily, ["2026-07-10", "2026-07-11"], TODAY);
    expect(s).toEqual({ value: 2, unit: "days" });
  });

  it("eine Lücke vor gestern beendet die Streak", () => {
    const s = computeStreak(daily, ["2026-07-09", "2026-07-11", "2026-07-12"], TODAY);
    expect(s.value).toBe(2);
  });

  it("keine Completions → 0", () => {
    expect(computeStreak(daily, [], TODAY).value).toBe(0);
  });
});

describe("computeStreak — weekdays (Mo/Mi/Fr)", () => {
  it("überspringt nicht-fällige Tage", () => {
    // Fr 10.07. + Mi 08.07. + Mo 06.07. erledigt; heute (So) ist nicht fällig.
    const s = computeStreak(moMiFr, ["2026-07-06", "2026-07-08", "2026-07-10"], TODAY);
    expect(s).toEqual({ value: 3, unit: "days" });
  });

  it("verpasster fälliger Tag beendet die Streak", () => {
    // Mi 08.07. fehlt → nur Fr 10.07. zählt.
    const s = computeStreak(moMiFr, ["2026-07-06", "2026-07-10"], TODAY);
    expect(s.value).toBe(1);
  });

  it("heute fällig und offen bricht nicht (Mo als heute)", () => {
    // Heute Mo 13.07., noch offen; Fr 10.07. erledigt.
    const s = computeStreak(moMiFr, ["2026-07-10"], "2026-07-13");
    expect(s.value).toBe(1);
  });

  it("leere Wochentagsliste → 0 (kein Endlos-Lauf)", () => {
    const empty: Recurrence = { type: "weekdays", weekdays: [] };
    expect(computeStreak(empty, ["2026-07-10"], TODAY).value).toBe(0);
  });
});

describe("computeStreak — timesPerWeek (3x)", () => {
  it("zählt erfüllte Wochen; laufende erfüllte Woche zählt mit", () => {
    const s = computeStreak(
      x3,
      [
        // Vorwoche (29.06.–05.07.): 3 Erledigungen
        "2026-06-29", "2026-07-01", "2026-07-03",
        // Laufende Woche: 3 Erledigungen
        "2026-07-06", "2026-07-08", "2026-07-10",
      ],
      TODAY,
    );
    expect(s).toEqual({ value: 2, unit: "weeks" });
  });

  it("laufende unerfüllte Woche bricht die Streak nicht", () => {
    const s = computeStreak(
      x3,
      ["2026-06-29", "2026-07-01", "2026-07-03", "2026-07-06"],
      TODAY,
    );
    expect(s).toEqual({ value: 1, unit: "weeks" });
  });

  it("unerfüllte Vorwoche beendet die Streak", () => {
    const s = computeStreak(
      x3,
      [
        // Vorvorwoche erfüllt, Vorwoche nur 2x, laufende erfüllt
        "2026-06-22", "2026-06-24", "2026-06-26",
        "2026-06-29", "2026-07-01",
        "2026-07-06", "2026-07-08", "2026-07-10",
      ],
      TODAY,
    );
    expect(s.value).toBe(1);
  });

  it("keine Completions → 0", () => {
    expect(computeStreak(x3, [], TODAY).value).toBe(0);
  });
});
