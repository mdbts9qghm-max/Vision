import { describe, expect, it } from "vitest";
import {
  baseTargetKm,
  effectiveTargetKm,
  phaseForWeek,
  planStartblockWeek,
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

describe("phaseForWeek", () => {
  it("Startblock W1–6, Basis bis M3, Ausbau M4–6, Ultra ab M7", () => {
    expect(phaseForWeek(0)).toBe("startblock");
    expect(phaseForWeek(5)).toBe("startblock");
    expect(phaseForWeek(6)).toBe("basis");
    expect(phaseForWeek(13)).toBe("ausbau");
    expect(phaseForWeek(26)).toBe("ultra");
  });
});

describe("baseTargetKm — Progression + Deload ab Ende Startblock", () => {
  it("steigert ×1,07 pro km-Woche, jede 4. Entlastung ×0,7", () => {
    expect(baseTargetKm(params, 6)).toBe(15); // erste km-Woche
    expect(baseTargetKm(params, 7)).toBe(16.1); // 15·1,07
    expect(baseTargetKm(params, 8)).toBe(17.2); // 15·1,07²
    expect(baseTargetKm(params, 9)).toBe(12); // Deload: 17,2·0,7
    expect(baseTargetKm(params, 10)).toBe(18.4); // weiter von 17,2·1,07
  });

  it("deckelt auf den Phasen-Umfang (Basis: 38 km)", () => {
    // Sehr hohe Basis → sofort am Deckel der Basisphase.
    const big = { ...params, weeklyKmBase: 60 };
    expect(baseTargetKm(big, 7)).toBe(38);
  });
});

describe("planStartblockWeek — Run-Walk nach Minuten", () => {
  // Mo Tag, Di Frei, Mi Tag, Do Frei, Fr Nacht, Sa Nacht, So Schlaf
  const shifts = week(["day", "free", "day", "free", "night", "night", "sleep"]);

  it("Woche 1: 3× 20 Min. mit 2/2-Struktur und Ruhetag dazwischen", () => {
    const plan = planStartblockWeek(WEEK, shifts, 0);
    const runs = plan.days.filter((d) => d.targetMin !== undefined);
    expect(runs).toHaveLength(3);
    expect(runs.every((r) => r.targetMin === 20)).toBe(true);
    expect(runs[0].reason).toContain("2 Min. laufen / 2 Min. gehen");
    // kein Lauf an aufeinanderfolgenden Tagen
    const dates = runs.map((r) => r.date).sort();
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] > dates[i - 1]).toBe(true);
      expect(dates[i]).not.toBe(addDay(dates[i - 1]));
    }
  });

  it("Woche 5: längste Einheit (40 Min.) liegt auf der Freischicht", () => {
    const plan = planStartblockWeek(WEEK, shifts, 4);
    const long = plan.days.find((d) => d.kind === "longrun");
    expect(long?.targetMin).toBe(40);
    expect(long?.date).toBe("2026-07-14"); // erste Freischicht
  });

  it("Kraft max. 2×, Tagschicht nur Mobility, Nacht bleibt frei", () => {
    const plan = planStartblockWeek(WEEK, shifts, 2);
    expect(
      plan.days.filter((d) => d.kind === "gym").length,
    ).toBeLessThanOrEqual(2);
    expect(plan.days[0].kind).toBe("mobility"); // Tagschicht Mo
    expect(plan.days[2].kind).toBe("mobility"); // Tagschicht Mi
    expect(plan.days[4].kind).toBe("rest"); // Nachtschicht
  });
});

function addDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

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
  it("Long Run auf Freischicht, Tagschicht = nur Mobility, Nacht = Ruhe", () => {
    // Mo Tag, Di Tag, Mi Frei, Do Tag, Fr Nacht, Sa Nacht, So Schlaf
    const plan = planWeek(
      params,
      WEEK,
      week(["day", "day", "free", "day", "night", "night", "sleep"]),
      15,
    );
    const byKind = Object.fromEntries(plan.days.map((d) => [d.date, d.kind]));
    expect(byKind["2026-07-15"]).toBe("longrun"); // Freischicht
    expect(byKind["2026-07-13"]).toBe("mobility"); // Tagschicht
    expect(byKind["2026-07-14"]).toBe("mobility");
    expect(byKind["2026-07-16"]).toBe("mobility");
    expect(byKind["2026-07-17"]).toBe("rest"); // Nacht
    expect(byKind["2026-07-18"]).toBe("rest"); // Nacht
    expect(byKind["2026-07-19"]).toBe("gym"); // Schlaftag als einziger Kraft-Slot
    // Kein Lauf auf einer Tagschicht
    expect(
      plan.days.filter(
        (d) => d.targetKm !== undefined && byKind[d.date] === "mobility",
      ),
    ).toHaveLength(0);
  });

  it("bei knappen Slots wird das Wochenziel nicht erzwungen", () => {
    const plan = planWeek(
      params,
      WEEK,
      week(["day", "day", "free", "day", "night", "night", "sleep"]),
      15,
    );
    const km = plan.days.reduce((s, d) => s + (d.targetKm ?? 0), 0);
    // Nur die Freischicht ist lauffähig → nur der Long Run (35 %).
    expect(km).toBeCloseTo(5.3);
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

  it("V-Schicht: Laufen erlaubt (während der Schicht), aber nie Kraft", () => {
    // Mo V, Di V, Mi Frei, Do V, Fr Nacht, Sa Nacht, So Schlaf
    const plan = planWeek(
      params,
      WEEK,
      week(["v", "v", "free", "v", "night", "night", "sleep"]),
      15,
    );
    const byDate = Object.fromEntries(plan.days.map((d) => [d.date, d]));
    // Kein Gym auf V-Tagen; Kraft weicht auf den Schlaftag aus.
    for (const d of ["2026-07-13", "2026-07-14", "2026-07-16"]) {
      expect(byDate[d].kind).not.toBe("gym");
    }
    expect(byDate["2026-07-19"].kind).toBe("gym");
    // Läufe auf V-Tagen sind erlaubt und sagen das auch.
    const vRun = plan.days.find(
      (d) => d.kind === "easy" && d.reason.includes("während der Schicht"),
    );
    expect(vRun).toBeDefined();
  });

  it("Startblock: Kraft nie auf V-Schicht", () => {
    const plan = planStartblockWeek(
      WEEK,
      week(["v", "v", "free", "v", "night", "night", "sleep"]),
      0,
    );
    for (const d of plan.days) {
      if (d.kind === "gym") {
        expect(["2026-07-13", "2026-07-14", "2026-07-16"]).not.toContain(
          d.date,
        );
      }
    }
  });

  it("unbekannte Schichten werden nicht verplant", () => {
    const plan = planWeek(params, WEEK, {}, 15);
    expect(plan.days.every((d) => d.kind === "rest")).toBe(true);
    expect(plan.days[0].reason).toContain("Schicht unbekannt");
  });
});
