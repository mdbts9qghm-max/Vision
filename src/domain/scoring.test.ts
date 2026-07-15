import { describe, expect, it } from "vitest";
import { overallWeeklyProgress, successRate, weeklyProgress } from "./scoring";
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

describe("weeklyProgress", () => {
  it("daily: Soll 7, zählt Tage der laufenden Woche", () => {
    expect(
      weeklyProgress(daily, done("2026-07-06", "2026-07-08", "2026-07-05"), TODAY),
    ).toEqual({ done: 2, target: 7 });
  });

  it("weekdays: nur fällige Tage zählen aufs Soll", () => {
    expect(
      weeklyProgress(moMiFr, done("2026-07-06", "2026-07-07"), TODAY),
    ).toEqual({ done: 1, target: 3 });
  });

  it("timesPerWeek: jeder Erledigungstag zählt, gedeckelt aufs Soll", () => {
    expect(
      weeklyProgress(
        x3,
        done("2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09"),
        TODAY,
      ),
    ).toEqual({ done: 3, target: 3 });
  });

  it("partial (Minimum nicht erreicht) zählt als fällig, nicht erledigt", () => {
    const p = weeklyProgress(
      daily,
      [{ date: "2026-07-06", status: "partial", value: 1 }],
      TODAY,
    );
    // Tag ist fällig, aber nicht erledigt → 0/7 (Soll bleibt 7).
    expect(p).toEqual({ done: 0, target: 7 });
  });

  it("Skip senkt das Wochensoll", () => {
    expect(
      weeklyProgress(
        x3,
        [...done("2026-07-06"), ...skip("2026-07-07")],
        TODAY,
      ),
    ).toEqual({ done: 1, target: 2 });
  });
});

describe("weeklyProgress — Schicht-Fälligkeit", () => {
  const onlyFree: Recurrence = { type: "daily", shiftTypes: ["free"] };
  it("zählt nur Tage mit passender (oder unbekannter) Schicht", () => {
    // Mo frei, Di Nacht, Mi frei — nur Mo+Mi sind fällig.
    const shifts = {
      "2026-07-06": "free" as const,
      "2026-07-07": "night" as const,
      "2026-07-08": "free" as const,
    };
    const p = weeklyProgress(onlyFree, done("2026-07-06"), TODAY, shifts);
    // 2 bekannte freie Tage + 4 unbekannte (zählen als fällig) = 6, davon 1 erledigt
    expect(p.done).toBe(1);
    expect(p.target).toBe(6);
  });
});

describe("overallWeeklyProgress", () => {
  it("summiert Erledigungen und Solls über alle Gewohnheiten", () => {
    const result = overallWeeklyProgress(
      [
        { recurrence: daily, completions: done("2026-07-06", "2026-07-07") },
        { recurrence: x3, completions: done("2026-07-08") },
        { recurrence: moMiFr, completions: [] },
      ],
      TODAY,
    );
    expect(result).toEqual({ done: 3, target: 13 });
  });

  it("leere Liste → 0/0", () => {
    expect(overallWeeklyProgress([], TODAY)).toEqual({ done: 0, target: 0 });
  });
});

describe("successRate — daily/weekdays", () => {
  it("daily: erledigte / fällige Tage im Fenster", () => {
    const rate = successRate(daily, done("2026-07-10", "2026-07-12"), TODAY, "2026-01-01", 3);
    expect(rate).toBeCloseTo(2 / 3);
  });

  it("zählt erst ab Anlegedatum (since)", () => {
    const rate = successRate(daily, done("2026-07-11", "2026-07-12"), TODAY, "2026-07-11", 30);
    expect(rate).toBe(1);
  });

  it("weekdays: nicht-fällige Tage zählen nicht", () => {
    const rate = successRate(
      moMiFr,
      done("2026-07-06", "2026-07-10", "2026-07-11"),
      TODAY,
      "2026-07-06",
      7,
    );
    expect(rate).toBeCloseTo(2 / 3);
  });

  it("Skip wird aus dem Nenner genommen (kein Fehlschlag)", () => {
    // Fenster 10.–12.07.: 10. erledigt, 11. übersprungen, 12. erledigt.
    // Ohne Skip-Ausschluss wäre es 2/3; mit Ausschluss 2/2 = 100 %.
    const rate = successRate(
      daily,
      [...done("2026-07-10", "2026-07-12"), ...skip("2026-07-11")],
      TODAY,
      "2026-01-01",
      3,
    );
    expect(rate).toBe(1);
  });

  it("null, wenn im Fenster nichts fällig war", () => {
    const onlyMonday: Recurrence = { type: "weekdays", weekdays: [1] };
    expect(successRate(onlyMonday, [], TODAY, "2026-07-07", 6)).toBeNull();
  });

  it("null, wenn since in der Zukunft liegt", () => {
    expect(successRate(daily, [], TODAY, "2026-07-13", 30)).toBeNull();
  });

  it("heute offen zählt noch nicht als fällig", () => {
    expect(successRate(daily, done("2026-07-11"), TODAY, "2026-07-11", 30)).toBe(1);
    expect(successRate(daily, [], TODAY, TODAY, 30)).toBeNull();
  });

  it("Schicht-Restriktion: nur passende Schichttage im Nenner", () => {
    const onlyFree: Recurrence = { type: "daily", shiftTypes: ["free"] };
    // 10. frei/erledigt, 11. Nacht (nicht fällig), 12. frei/erledigt.
    const shifts = {
      "2026-07-10": "free" as const,
      "2026-07-11": "night" as const,
      "2026-07-12": "free" as const,
    };
    const rate = successRate(onlyFree, done("2026-07-10", "2026-07-12"), TODAY, "2026-07-10", 3, shifts);
    expect(rate).toBe(1); // 2/2, der Nacht-Tag fällt raus
  });
});

describe("successRate — timesPerWeek", () => {
  it("volle Wochen: erreicht / Soll", () => {
    const rate = successRate(x3, done("2026-06-29", "2026-07-01", "2026-07-03"), "2026-07-13", "2026-06-29", 15);
    expect(rate).toBeCloseTo(0.5);
  });

  it("Mehrleistung wird aufs Soll gedeckelt (keine Quote > 1)", () => {
    const rate = successRate(
      x3,
      done("2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10"),
      TODAY,
      "2026-07-06",
      7,
    );
    expect(rate).toBe(1);
  });
});
