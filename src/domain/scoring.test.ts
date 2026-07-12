import { describe, expect, it } from "vitest";
import { successRate, weeklyProgress } from "./scoring";
import type { Recurrence } from "./recurrence";

// 2026-07-12 ist ein Sonntag; Woche Mo 2026-07-06 … So 2026-07-12.
const TODAY = "2026-07-12";
const daily: Recurrence = { type: "daily" };
const moMiFr: Recurrence = { type: "weekdays", weekdays: [1, 3, 5] };
const x3: Recurrence = { type: "timesPerWeek", times: 3 };

describe("weeklyProgress", () => {
  it("daily: Soll 7, zählt Tage der laufenden Woche", () => {
    expect(
      weeklyProgress(daily, ["2026-07-06", "2026-07-08", "2026-07-05"], TODAY),
    ).toEqual({ done: 2, target: 7 });
  });

  it("weekdays: nur fällige Tage zählen aufs Soll", () => {
    expect(
      weeklyProgress(moMiFr, ["2026-07-06", "2026-07-07"], TODAY),
    ).toEqual({ done: 1, target: 3 });
  });

  it("timesPerWeek: jeder Erledigungstag zählt, gedeckelt aufs Soll", () => {
    expect(
      weeklyProgress(
        x3,
        ["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09"],
        TODAY,
      ),
    ).toEqual({ done: 3, target: 3 });
  });
});

describe("successRate — daily/weekdays", () => {
  it("daily: erledigte / fällige Tage im Fenster", () => {
    // Fenster auf 3 Tage begrenzt: 10.–12.07., davon 2 erledigt.
    const rate = successRate(
      daily,
      ["2026-07-10", "2026-07-12"],
      TODAY,
      "2026-01-01",
      3,
    );
    expect(rate).toBeCloseTo(2 / 3);
  });

  it("zählt erst ab Anlegedatum (since)", () => {
    // Angelegt am 11.07. → nur 11.+12. fällig, beide erledigt.
    const rate = successRate(
      daily,
      ["2026-07-11", "2026-07-12"],
      TODAY,
      "2026-07-11",
      30,
    );
    expect(rate).toBe(1);
  });

  it("weekdays: nicht-fällige Tage zählen nicht", () => {
    // Fenster 06.–12.07.: fällig Mo/Mi/Fr = 3 Tage, 2 erledigt.
    const rate = successRate(
      moMiFr,
      ["2026-07-06", "2026-07-10", "2026-07-11"], // Sa 11.07. zählt nicht
      TODAY,
      "2026-07-06",
      7,
    );
    expect(rate).toBeCloseTo(2 / 3);
  });

  it("null, wenn im Fenster nichts fällig war", () => {
    // Nur-Montags-Habit, Fenster Di–So.
    const onlyMonday: Recurrence = { type: "weekdays", weekdays: [1] };
    const rate = successRate(onlyMonday, [], TODAY, "2026-07-07", 6);
    expect(rate).toBeNull();
  });

  it("null, wenn since in der Zukunft liegt", () => {
    expect(successRate(daily, [], TODAY, "2026-07-13", 30)).toBeNull();
  });

  it("heute offen zählt noch nicht als fällig", () => {
    // Gestern erledigt, heute noch offen → 100 %, nicht 50 %.
    expect(
      successRate(daily, ["2026-07-11"], TODAY, "2026-07-11", 30),
    ).toBe(1);
    // Heute angelegt, noch nichts erledigt → noch keine Quote.
    expect(successRate(daily, [], TODAY, TODAY, 30)).toBeNull();
  });
});

describe("successRate — timesPerWeek", () => {
  it("volle Wochen: erreicht / Soll", () => {
    // Heute Mo 13.07. (offen) → gewertet wird bis So 12.07.:
    // zwei volle Wochen à Soll 3, nur die erste erfüllt.
    const rate = successRate(
      x3,
      ["2026-06-29", "2026-07-01", "2026-07-03"],
      "2026-07-13",
      "2026-06-29",
      15,
    );
    expect(rate).toBeCloseTo(0.5);
  });

  it("volle laufende Woche inkl. erledigtem Heute", () => {
    // Woche Mo–So komplett im Fenster, Soll 3, erledigt Di + So (heute).
    const rate = successRate(
      x3,
      ["2026-07-07", "2026-07-12"],
      TODAY,
      "2026-07-06",
      7,
    );
    expect(rate).toBeCloseTo(2 / 3);
  });

  it("angebrochene Woche zählt anteilig (heute offen)", () => {
    // Heute So offen → gewertet Mo–Sa (6/7 der Woche): erwartet 3·6/7,
    // erledigt 2.
    const rate = successRate(
      x3,
      ["2026-07-07", "2026-07-09"],
      TODAY,
      "2026-07-06",
      7,
    );
    expect(rate).toBeCloseTo(2 / ((3 * 6) / 7));
  });

  it("Mehrleistung wird aufs Soll gedeckelt (keine Quote > 1)", () => {
    const rate = successRate(
      x3,
      ["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10"],
      TODAY,
      "2026-07-06",
      7,
    );
    expect(rate).toBe(1);
  });
});
