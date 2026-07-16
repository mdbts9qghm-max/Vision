import { describe, expect, it } from "vitest";
import {
  averageFacet,
  facetLevelLabel,
  hasCheckin,
  summarizeCheckins,
  wellbeingScore,
  type Checkin,
} from "./checkin";

describe("facetLevelLabel", () => {
  it("mappt Stufen auf Labels und klemmt außerhalb 1..5", () => {
    expect(facetLevelLabel("mood", 1)).toBe("sehr schlecht");
    expect(facetLevelLabel("mood", 5)).toBe("sehr gut");
    expect(facetLevelLabel("stress", 5)).toBe("überlastet");
    expect(facetLevelLabel("energy", 0)).toBe("leer"); // geklemmt auf 1
    expect(facetLevelLabel("energy", 9)).toBe("voll"); // geklemmt auf 5
  });
});

describe("hasCheckin", () => {
  it("erkennt leere und befüllte Check-ins", () => {
    expect(hasCheckin(undefined)).toBe(false);
    expect(hasCheckin({ date: "2026-07-16" })).toBe(false);
    expect(hasCheckin({ date: "2026-07-16", note: "  " })).toBe(false);
    expect(hasCheckin({ date: "2026-07-16", mood: 3 })).toBe(true);
    expect(hasCheckin({ date: "2026-07-16", note: "gut" })).toBe(true);
  });
});

describe("averageFacet", () => {
  it("mittelt und ignoriert null", () => {
    const cs: Checkin[] = [
      { date: "a", mood: 4 },
      { date: "b", mood: 2 },
      { date: "c", mood: null },
    ];
    expect(averageFacet(cs, "mood")).toBe(3);
    expect(averageFacet(cs, "energy")).toBeNull();
  });
});

describe("wellbeingScore", () => {
  it("invertiert Stress und normalisiert auf 0..100", () => {
    // alles Bestwert: mood5, energy5, stress1 -> (5+5+5)/3=5 -> 100
    expect(wellbeingScore({ date: "a", mood: 5, energy: 5, stress: 1 })).toBe(
      100,
    );
    // alles Schlechtwert: mood1, energy1, stress5 -> (1+1+1)/3=1 -> 0
    expect(wellbeingScore({ date: "a", mood: 1, energy: 1, stress: 5 })).toBe(0);
    // Mitte
    expect(wellbeingScore({ date: "a", mood: 3, energy: 3, stress: 3 })).toBe(
      50,
    );
    expect(wellbeingScore({ date: "a" })).toBeNull();
  });

  it("funktioniert auch mit nur einer Facette", () => {
    expect(wellbeingScore({ date: "a", stress: 1 })).toBe(100);
  });
});

describe("summarizeCheckins", () => {
  it("liefert Facettenmittel, Wohlbefinden und Tagesanzahl", () => {
    const s = summarizeCheckins([
      { date: "a", mood: 4, energy: 3, stress: 2 },
      { date: "b", mood: 2, energy: 3, stress: 4 },
      { date: "c" }, // leer -> zählt nicht
    ]);
    expect(s.count).toBe(2);
    expect(s.mood).toBe(3);
    expect(s.stress).toBe(3);
    expect(s.wellbeing).not.toBeNull();
  });
});
