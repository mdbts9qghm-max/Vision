import { describe, expect, it } from "vitest";
import {
  FAST_TARGET_MIN,
  SHIFT_ROTATION,
  WINDOW_MAX_MIN,
  effectiveShift,
  fastBetween,
  fastingPlan,
  fastingStatus,
  formatDuration,
  formatMin,
  rotationShiftFor,
  windowForShift,
} from "./fasting";
import { hm } from "./sleep";
import type { ShiftType } from "./coach";

describe("formatMin / formatDuration", () => {
  it("formatiert Uhrzeiten zweistellig", () => {
    expect(formatMin(hm(9))).toBe("09:00");
    expect(formatMin(hm(17, 30))).toBe("17:30");
    expect(formatMin(hm(0))).toBe("00:00");
  });
  it("formatiert Dauern lesbar", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(120)).toBe("2 h");
    expect(formatDuration(135)).toBe("2 h 15 min");
  });
});

describe("windowForShift", () => {
  it("liefert die konfigurierten Fenster je Schicht", () => {
    expect(windowForShift("day")).toMatchObject({
      startMin: hm(9),
      endMin: hm(17),
      hours: 8,
    });
    // Nachtschicht: früh öffnen (Vorschlaf 15–17 liegt im Fenster), spät
    // schließen, damit danach nicht mehr als 16 h Fasten anfallen.
    expect(windowForShift("night")).toMatchObject({
      startMin: hm(9),
      endMin: hm(22),
    });
    expect(windowForShift("sleep")).toMatchObject({
      startMin: hm(14),
      endMin: hm(20),
    });
    expect(windowForShift("v")).toMatchObject({
      startMin: hm(9),
      endMin: hm(17),
    });
    // Urlaub wie frei
    expect(windowForShift("vacation")).toMatchObject(
      windowForShift("free") as object,
    );
  });

  it("krank und unbekannt haben kein Fastenfenster", () => {
    expect(windowForShift("sick")).toBeNull();
    expect(windowForShift(undefined)).toBeNull();
  });
});

describe("rotationShiftFor", () => {
  // Rotation: Tag -> Nacht -> Schlaf -> Frei -> Frei (5 Tage)
  const start = "2026-07-13"; // Montag

  it("läuft den Zyklus durch und wiederholt ihn", () => {
    const expected: ShiftType[] = ["day", "night", "sleep", "free", "free"];
    expected.forEach((shift, i) => {
      const date = `2026-07-${String(13 + i).padStart(2, "0")}`;
      expect(rotationShiftFor(date, start)).toBe(shift);
    });
    // Tag 6 startet den Zyklus erneut
    expect(rotationShiftFor("2026-07-18", start)).toBe("day");
  });

  it("funktioniert auch vor dem Startdatum (negativer Abstand)", () => {
    expect(rotationShiftFor("2026-07-12", start)).toBe("free"); // letzter Eintrag
    // genau ein voller Zyklus zurück -> wieder der erste Eintrag
    expect(rotationShiftFor("2026-07-08", start)).toBe("day");
  });

  it("ohne Startdatum kein Ergebnis", () => {
    expect(rotationShiftFor("2026-07-13", null)).toBeUndefined();
  });
});

describe("effectiveShift", () => {
  const start = "2026-07-13";

  it("manuell eingetragene Schicht gewinnt über die Rotation", () => {
    const res = effectiveShift("2026-07-14", { "2026-07-14": "v" }, start);
    expect(res).toEqual({ shift: "v", source: "manual" });
  });

  it("ohne manuellen Eintrag greift die Rotation", () => {
    expect(effectiveShift("2026-07-14", {}, start)).toEqual({
      shift: "night",
      source: "rotation",
    });
  });

  it("ohne beides bleibt der Tag offen", () => {
    expect(effectiveShift("2026-07-14", {}, null)).toEqual({
      shift: undefined,
      source: "none",
    });
  });
});

describe("fastingStatus", () => {
  const day = windowForShift("day"); // 09:00–17:00

  it("vor dem Fenster: Fastenzeit mit Countdown bis zur Öffnung", () => {
    const s = fastingStatus(day, hm(7, 30));
    expect(s.state).toBe("fasting");
    expect(s.minutesUntilChange).toBe(90);
    expect(s.changeAt).toBe("09:00");
    expect(s.label).toContain("1 h 30 min");
  });

  it("im Fenster: Essen erlaubt mit Restzeit", () => {
    const s = fastingStatus(day, hm(15));
    expect(s.state).toBe("eating");
    expect(s.minutesUntilChange).toBe(120);
    expect(s.changeAt).toBe("17:00");
    expect(s.label).toContain("Essen erlaubt");
  });

  it("nach dem Fenster: Fasten bis zur Öffnung am Folgetag", () => {
    const s = fastingStatus(day, hm(20), hm(9));
    expect(s.state).toBe("fasting");
    // 4 h bis Mitternacht + 9 h = 13 h
    expect(s.minutesUntilChange).toBe(13 * 60);
    expect(s.label).toContain("morgen um 09:00");
  });

  it("Grenzen: Fensterstart zählt als Essen, Fensterende als Fasten", () => {
    expect(fastingStatus(day, hm(9)).state).toBe("eating");
    expect(fastingStatus(day, hm(17)).state).toBe("fasting");
  });

  it("ohne Fenster (z. B. krank) gibt es keinen Fastenstatus", () => {
    const s = fastingStatus(null, hm(12));
    expect(s.state).toBe("none");
    expect(s.minutesUntilChange).toBeNull();
  });
});

describe("16/8 — Fensterlänge und Fastenlänge", () => {
  const ALL_SHIFTS = ["day", "night", "sleep", "free", "v", "vacation"] as const;

  it("jedes Fenster ist gültig und außer der Nachtschicht höchstens 8 h", () => {
    for (const shift of ALL_SHIFTS) {
      const w = windowForShift(shift);
      expect(w).not.toBeNull();
      expect(w!.endMin).toBeGreaterThan(w!.startMin);
      if (shift !== "night") {
        expect(w!.endMin - w!.startMin).toBeLessThanOrEqual(WINDOW_MAX_MIN);
      }
    }
  });

  it("Nachtschicht öffnet früh und schließt spät genug für 16 h danach", () => {
    const w = windowForShift("night")!;
    // Früh geöffnet — der Vorschlaf ab 15:00 liegt im Fenster, nicht dahinter.
    expect(w.startMin).toBe(hm(9));
    // Schluss um 22:00: bis zur Öffnung am Schlaftag (14:00) sind es genau 16 h.
    expect(w.endMin).toBe(hm(22));
  });

  it("Schlaftag schließt ~2 h vor dem Schlafen", () => {
    const w = windowForShift("sleep")!;
    expect(w.startMin).toBe(hm(14));
    expect(w.endMin).toBe(hm(20));
  });

  it("fastBetween rechnet über Mitternacht korrekt", () => {
    // Fenster heute bis 17:00, morgen ab 09:00 -> 7 h + 9 h = 16 h
    const f = fastBetween(windowForShift("day"), windowForShift("free"))!;
    expect(f.minutes).toBe(FAST_TARGET_MIN);
    expect(f.short).toBe(false);
    expect(f.long).toBe(false);
    expect(f.deltaMin).toBe(0);
  });

  it("markiert einen zu langen Übergang als long", () => {
    // Nur noch manuell herstellbar: Tagschicht direkt vor einen Schlaftag.
    const f = fastBetween(windowForShift("day"), windowForShift("sleep"))!;
    expect(f.minutes).toBe(21 * 60);
    expect(f.long).toBe(true);
    expect(f.short).toBe(false);
  });

  it("weist den kürzeren Übergang Schlaftag -> Frei aus", () => {
    // Unkritisch: kürzer als 16 h, nicht länger.
    const f = fastBetween(windowForShift("sleep"), windowForShift("free"))!;
    expect(f.short).toBe(true);
    expect(f.long).toBe(false);
    expect(f.minutes).toBe(13 * 60);
    expect(f.deltaMin).toBe(-3 * 60);
  });

  it("Standard-Rotation: KEIN Übergang über 16 h", () => {
    const rot = SHIFT_ROTATION;
    const fasts = rot.map((shift, i) =>
      fastBetween(
        windowForShift(shift),
        windowForShift(rot[(i + 1) % rot.length]),
      )!,
    );
    // Das ist die Zusage der Konfiguration — sie darf nie brechen.
    for (const f of fasts) {
      expect(f.minutes).toBeLessThanOrEqual(FAST_TARGET_MIN);
      expect(f.long).toBe(false);
    }
    // Genau ein Übergang ist kürzer (Schlaftag -> Frei).
    expect(fasts.filter((f) => f.short)).toHaveLength(1);

    // Über den Zyklus gilt exakt: Fasten + Fenster = 24 h pro Tag.
    const totalFast = fasts.reduce((a, f) => a + f.minutes, 0);
    const totalWindow = rot.reduce(
      (a, s) => a + (windowForShift(s)!.endMin - windowForShift(s)!.startMin),
      0,
    );
    expect(totalFast + totalWindow).toBe(rot.length * 1440);
  });

  it("auch ein eingeschobener V-Tag sprengt die 16 h nicht", () => {
    // V kann laut UI jeden Tag der Rotation überschreiben.
    for (const neighbour of ["day", "night", "free"] as const) {
      expect(
        fastBetween(windowForShift(neighbour), windowForShift("v"))!.long,
      ).toBe(false);
      expect(
        fastBetween(windowForShift("v"), windowForShift(neighbour))!.long,
      ).toBe(false);
    }
  });
});

describe("fastingPlan", () => {
  it("baut die Tagesliste aus Rotation + manuellen Überschreibungen", () => {
    const plan = fastingPlan(
      "2026-07-13",
      5,
      { "2026-07-15": "v" }, // V-Schicht einschieben
      "2026-07-13",
    );
    expect(plan).toHaveLength(5);
    expect(plan.map((d) => d.shift)).toEqual([
      "day",
      "night",
      "v", // manuell statt "sleep"
      "free",
      "free",
    ]);
    expect(plan[2].source).toBe("manual");
    expect(plan[2].window).toMatchObject({ startMin: hm(9), endMin: hm(17) });
    expect(plan[0].window?.hours).toBe(8);
  });
});
