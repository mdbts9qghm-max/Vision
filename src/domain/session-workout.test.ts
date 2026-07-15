import { describe, expect, it } from "vitest";
import { plannedSessionToWorkout } from "./session-workout";

describe("plannedSessionToWorkout", () => {
  it("Lauf mit km: schätzt Dauer aus dem Tempo", () => {
    const w = plannedSessionToWorkout("easy", 6);
    expect(w).toMatchObject({ type: "Laufen", distanceKm: 6, durationMin: 42 });
  });

  it("Startblock-Lauf mit Minuten: nimmt die geplante Dauer", () => {
    const w = plannedSessionToWorkout("longrun", null, 40);
    expect(w).toMatchObject({ type: "Laufen", durationMin: 40 });
    expect(w?.distanceKm).toBeUndefined();
  });

  it("Kraft und Mobility bekommen Standarddauern", () => {
    expect(plannedSessionToWorkout("gym")).toMatchObject({
      type: "Kraft",
      durationMin: 40,
    });
    expect(plannedSessionToWorkout("mobility")).toMatchObject({
      type: "Mobility",
      durationMin: 12,
    });
  });

  it("Ruhe ist nicht loggbar", () => {
    expect(plannedSessionToWorkout("rest")).toBeNull();
  });
});
