import { describe, expect, it } from "vitest";
import {
  formatLongDate,
  isValidISODate,
  toISODate,
  todayISO,
} from "./dates";

describe("toISODate (Europe/Berlin)", () => {
  it("kippt kurz vor UTC-Mitternacht bereits auf den Folgetag (CET, +1)", () => {
    expect(toISODate(new Date("2026-01-05T23:30:00Z"))).toBe("2026-01-06");
    expect(toISODate(new Date("2026-01-05T22:30:00Z"))).toBe("2026-01-05");
  });

  it("berücksichtigt Sommerzeit (CEST, +2)", () => {
    expect(toISODate(new Date("2026-07-01T22:30:00Z"))).toBe("2026-07-02");
    expect(toISODate(new Date("2026-07-01T21:59:00Z"))).toBe("2026-07-01");
  });

  it("todayISO liefert das Format YYYY-MM-DD", () => {
    expect(todayISO(new Date("2026-07-12T10:00:00Z"))).toBe("2026-07-12");
  });
});

describe("isValidISODate", () => {
  it("akzeptiert echte Kalendertage", () => {
    expect(isValidISODate("2026-07-12")).toBe(true);
    expect(isValidISODate("2024-02-29")).toBe(true); // Schaltjahr
  });

  it("lehnt falsche Formate und unmögliche Tage ab", () => {
    expect(isValidISODate("12.07.2026")).toBe(false);
    expect(isValidISODate("2026-7-12")).toBe(false);
    expect(isValidISODate("2026-02-30")).toBe(false);
    expect(isValidISODate("2025-02-29")).toBe(false); // kein Schaltjahr
  });
});

describe("formatLongDate", () => {
  it("formatiert lesbar deutsch", () => {
    expect(formatLongDate("2026-07-12")).toBe("Sonntag, 12. Juli");
  });
});
