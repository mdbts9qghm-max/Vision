import { describe, expect, it } from "vitest";
import { weeklyHistory } from "./history";
import type { Recurrence } from "./recurrence";

// 2026-07-13 ist ein Montag (Woche 13.–19.07.).
const TODAY = "2026-07-13";
const daily: Recurrence = { type: "daily" };
const x3: Recurrence = { type: "timesPerWeek", times: 3 };

describe("weeklyHistory", () => {
  it("liefert die Wochen älteste-zuerst, laufende Woche zuletzt", () => {
    const h = weeklyHistory(daily, [], TODAY, 4);
    expect(h.map((w) => w.weekStart)).toEqual([
      "2026-06-22",
      "2026-06-29",
      "2026-07-06",
      "2026-07-13",
    ]);
    expect(h.at(-1)?.isCurrent).toBe(true);
    expect(h.slice(0, -1).every((w) => !w.isCurrent)).toBe(true);
  });

  it("zählt Erledigungen je Woche gegen das Soll", () => {
    const h = weeklyHistory(
      x3,
      ["2026-06-30", "2026-07-02", "2026-07-04", "2026-07-13"],
      TODAY,
      3,
    );
    expect(h.map((w) => [w.done, w.target])).toEqual([
      [3, 3], // Woche 29.06.
      [0, 3], // Woche 06.07.
      [1, 3], // laufende Woche
    ]);
  });

  it("deckelt Mehrleistung aufs Soll", () => {
    const h = weeklyHistory(
      x3,
      ["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10"],
      TODAY,
      2,
    );
    expect(h[0]).toMatchObject({ done: 3, target: 3 });
  });
});
