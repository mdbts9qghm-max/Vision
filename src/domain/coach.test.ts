import { describe, expect, it } from "vitest";
import {
  baseTargetKm,
  effectiveTargetKm,
  planWeek,
  type CoachParams,
  type ShiftType,
} from "./coach";

const params: CoachParams = {
  weeklyKmBase: 15,
  progressionPct: 7,
  deloadEveryWeeks: 4,
  weeklyGymTarget: 3,
};

// Woche Mo 2026-07-13 … So 2026-07-19.
const WEEK = "2026-07-13";
const week = (types: (ShiftType | undefined)[]) => {
  const map: Record<string, ShiftType | undefined> = {};
  types.forEach((t, i) => {
    const d = new Date(Date.UTC(2026, 6, 13 + i)).toISOString().slice(0, 10);
    map[d] = t;
  });
  return map;
};

describe("baseTargetKm — Progression + Deload", () => {
  it("steigert ×1,07 pro Woche, jede 4. Woche Entlastung ×0,7", () => {
    expect(baseTargetKm(params, 0)).toBe(15);
    expect(baseTargetKm(params, 1)).toBe(16.1); // 15·1,07
    expect(baseTargetKm(params, 2)).toBe(17.2); // 15·1,07²
    expect(baseTargetKm(params, 3)).toBe(12); // Deload: 17,2·0,7
    expect(baseTargetKm(params, 4)).toBe(18.4); // weiter von 17,2·1,07
  });
});

describe("effectiveTargetKm — Steigerung nur bei Umsetzung", () => {
  it("wiederholt die Vorwoche, wenn <60 % umgesetzt", () => {
    expect(effectiveTargetKm(17.2, 16.1, 5)).toBe(16.1);
  });
  it("steigert normal bei ausreichender Umsetzung", () => {
    expect(effectiveTargetKm(17.2, 16.1, 14)).toBe(17.2);
  });
  it("greift nicht ohne Historie", () => {
    expect(effectiveTargetKm(15, null, null)).toBe(15);
  });
});

describe("planWeek — Regelzuordnung", () => {
  it("Long Run auf die Freischicht, Kraft auf Tagschichten, Nacht = Ruhe", () => {
    // Mo Tag, Di Tag, Mi Frei, Do Tag, Fr Nacht, Sa Nacht, So Schlaf
    const plan = planWeek(
      params,
      WEEK,
      week(["day", "day", "free", "day", "night", "night", "sleep"]),
      15,
    );
    const byKind = Object.fromEntries(plan.days.map((d) => [d.date, d.kind]));
    expect(byKind["2026-07-15"]).toBe("longrun"); // Freischicht
    expect(plan.days.filter((d) => d.kind === "gym")).toHaveLength(2); // Mo+Do (Di grenzt an nichts? -> nicht 2 nebeneinander)
    expect(byKind["2026-07-17"]).toBe("rest"); // Nacht
    expect(byKind["2026-07-18"]).toBe("rest"); // Nacht
    // km-Summe ≈ Wochenziel
    const km = plan.days.reduce((s, d) => s + (d.targetKm ?? 0), 0);
    expect(km).toBeGreaterThanOrEqual(14);
    expect(km).toBeLessThanOrEqual(16);
  });

  it("ohne Freischicht: moderater Long Run auf dem Schlaftag, gedeckelt", () => {
    const plan = planWeek(
      params,
      WEEK,
      week(["day", "day", "day", "night", "night", "sleep", "day"]),
      20,
    );
    const lr = plan.days.find((d) => d.kind === "longrun");
    expect(lr?.date).toBe("2026-07-18"); // Schlaftag
    expect(lr?.targetKm).toBeLessThanOrEqual(20 * 0.3);
  });

  it("≥3 Nachtschichten → Teil-Deload (km ×0,75, Gym ≤2)", () => {
    const plan = planWeek(
      params,
      WEEK,
      week(["night", "night", "night", "sleep", "free", "day", "day"]),
      20,
    );
    expect(plan.nightDeload).toBe(true);
    expect(plan.targetKm).toBe(15);
    expect(plan.days.filter((d) => d.kind === "gym").length).toBeLessThanOrEqual(2);
  });

  it("kein Gym am Long-Run-Tag oder direkt danach", () => {
    const plan = planWeek(
      params,
      WEEK,
      week(["free", "free", "free", "free", "free", "free", "free"]),
      20,
    );
    const lrIndex = plan.days.findIndex((d) => d.kind === "longrun");
    expect(plan.days[lrIndex].kind).toBe("longrun");
    expect(plan.days[lrIndex + 1]?.kind ?? "rest").not.toBe("gym");
  });

  it("Back-to-Back-Long-Run ab 40 km, wenn auf den Long Run ein freier Tag folgt", () => {
    const shifts = week(["day", "free", "free", "day", "day", "night", "sleep"]);
    const big = planWeek(params, WEEK, shifts, 44);
    const lr = big.days.find((d) => d.kind === "longrun");
    const b2b = big.days.find(
      (d) => d.kind === "run" && d.reason.includes("Back-to-Back"),
    );
    expect(lr?.date).toBe("2026-07-14");
    expect(b2b?.date).toBe("2026-07-15");
    expect(b2b?.targetKm).toBe(11); // 25 % von 44

    // Unter 40 km: kein Back-to-Back.
    const small = planWeek(params, WEEK, shifts, 20);
    expect(
      small.days.some((d) => d.reason.includes("Back-to-Back")),
    ).toBe(false);
  });

  it("unbekannte Schichten werden nicht verplant", () => {
    const plan = planWeek(params, WEEK, {}, 15);
    expect(plan.days.every((d) => d.kind === "rest")).toBe(true);
    expect(plan.days[0].reason).toContain("Schicht unbekannt");
  });
});
