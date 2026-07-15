import { describe, expect, it } from "vitest";
import { isDueOn, type Recurrence } from "./recurrence";

// 2026-07-13 = Montag.
describe("isDueOn — Basis", () => {
  it("daily immer fällig, timesPerWeek immer möglich", () => {
    expect(isDueOn({ type: "daily" }, "2026-07-13")).toBe(true);
    expect(isDueOn({ type: "timesPerWeek", times: 3 }, "2026-07-13")).toBe(true);
  });

  it("weekdays nur an den gewählten Tagen", () => {
    const r: Recurrence = { type: "weekdays", weekdays: [1, 3] };
    expect(isDueOn(r, "2026-07-13")).toBe(true); // Mo
    expect(isDueOn(r, "2026-07-14")).toBe(false); // Di
  });
});

describe("isDueOn — Schicht-Abhängigkeit", () => {
  const onlyFree: Recurrence = { type: "daily", shiftTypes: ["free"] };

  it("bekannte, nicht passende Schicht → nicht fällig", () => {
    expect(isDueOn(onlyFree, "2026-07-13", "night")).toBe(false);
  });

  it("passende Schicht → fällig", () => {
    expect(isDueOn(onlyFree, "2026-07-13", "free")).toBe(true);
  });

  it("unbekannte Schicht schränkt nicht ein (im Zweifel zeigen)", () => {
    expect(isDueOn(onlyFree, "2026-07-13", undefined)).toBe(true);
  });

  it("kombiniert mit weekdays: beide Bedingungen müssen gelten", () => {
    const r: Recurrence = {
      type: "weekdays",
      weekdays: [1],
      shiftTypes: ["free"],
    };
    expect(isDueOn(r, "2026-07-13", "free")).toBe(true); // Mo + frei
    expect(isDueOn(r, "2026-07-14", "free")).toBe(false); // Di
    expect(isDueOn(r, "2026-07-13", "night")).toBe(false); // Mo, aber Nacht
  });
});
