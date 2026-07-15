import { describe, expect, it } from "vitest";
import { evaluateLevel } from "./habit-goal";

describe("evaluateLevel", () => {
  it("Check-Gewohnheit ohne Werte: erledigt = Ziel", () => {
    expect(evaluateLevel({}, 1)).toBe("target");
    expect(evaluateLevel({}, null)).toBe("none");
  });

  it("Minimum + Ziel: stuft korrekt ein", () => {
    const g = { minValue: 2, targetValue: 3 };
    expect(evaluateLevel(g, 3.2)).toBe("target");
    expect(evaluateLevel(g, 2.5)).toBe("minimum");
    expect(evaluateLevel(g, 1.5)).toBe("none");
    expect(evaluateLevel(g, null)).toBe("none");
  });

  it("nur Ziel gesetzt: darunter zählt nicht", () => {
    const g = { targetValue: 3 };
    expect(evaluateLevel(g, 3)).toBe("target");
    expect(evaluateLevel(g, 2.9)).toBe("none");
  });

  it("nur Minimum gesetzt: ab Minimum voller Erfolg", () => {
    const g = { minValue: 2 };
    expect(evaluateLevel(g, 2)).toBe("minimum");
    expect(evaluateLevel(g, 1)).toBe("none");
  });
});
