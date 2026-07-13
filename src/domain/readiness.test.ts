import { describe, expect, it } from "vitest";
import { adjustSession, warningSignals } from "./readiness";

describe("warningSignals", () => {
  it("zählt Schlafmangel und schlechten Check-in", () => {
    expect(warningSignals({ sleepHours: 5.5, readiness: "low" })).toBe(2);
    expect(warningSignals({ sleepHours: 7, readiness: "low" })).toBe(1);
    expect(warningSignals({ sleepHours: 5, readiness: "good" })).toBe(1);
    expect(warningSignals({ sleepHours: 8, readiness: "good" })).toBe(0);
  });

  it("fehlende Daten sind keine Warnsignale", () => {
    expect(warningSignals({ sleepHours: null, readiness: null })).toBe(0);
  });
});

describe("adjustSession", () => {
  const longrun = { kind: "longrun" as const, targetKm: 6 };

  it("≥2 Signale → Ruhe", () => {
    const a = adjustSession(longrun, { sleepHours: 5, readiness: "low" });
    expect(a.kind).toBe("rest");
    expect(a.note).toContain("Erholung");
  });

  it("1 Signal → Long Run wird moderater Lauf mit reduziertem Umfang", () => {
    const a = adjustSession(longrun, { sleepHours: 5, readiness: "good" });
    expect(a.kind).toBe("run");
    expect(a.targetKm).toBe(3.6);
    expect(a.note).toContain("unter 6 h Schlaf");
  });

  it("1 Signal bei Kraft → bleibt, nur leichter", () => {
    const a = adjustSession(
      { kind: "gym" },
      { sleepHours: 7, readiness: "low" },
    );
    expect(a.kind).toBe("gym");
    expect(a.note).toContain("leicht");
  });

  it("keine Signale → Plan unverändert", () => {
    const a = adjustSession(longrun, { sleepHours: 8, readiness: "good" });
    expect(a).toEqual({ kind: "longrun", targetKm: 6, note: null });
  });

  it("Ruhe bleibt Ruhe", () => {
    const a = adjustSession(
      { kind: "rest" },
      { sleepHours: 4, readiness: "low" },
    );
    expect(a.kind).toBe("rest");
    expect(a.note).toBeNull();
  });

  it("Mindestumfang 2 km bei Reduktion", () => {
    const a = adjustSession(
      { kind: "easy", targetKm: 2.5 },
      { sleepHours: 5, readiness: "good" },
    );
    expect(a.targetKm).toBe(2);
  });
});
