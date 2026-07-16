import { describe, expect, it } from "vitest";
import {
  expiryFromNow,
  mapSyncData,
  needsRefresh,
  sleepHoursFromSummary,
} from "./whoop";

describe("needsRefresh", () => {
  const now = new Date("2026-07-16T12:00:00Z");
  it("true, wenn abgelaufen oder innerhalb des Puffers", () => {
    expect(needsRefresh("2026-07-16T11:59:00Z", now)).toBe(true);
    expect(needsRefresh("2026-07-16T12:00:30Z", now)).toBe(true); // < 60s Puffer
    expect(needsRefresh("bad-date", now)).toBe(true);
  });
  it("false, wenn noch lange gültig", () => {
    expect(needsRefresh("2026-07-16T13:00:00Z", now)).toBe(false);
  });
});

describe("expiryFromNow", () => {
  it("addiert Sekunden auf jetzt", () => {
    const now = new Date("2026-07-16T12:00:00Z");
    expect(expiryFromNow(3600, now)).toBe("2026-07-16T13:00:00.000Z");
  });
});

describe("sleepHoursFromSummary", () => {
  it("summiert leicht + Tiefschlaf + REM (ms → h)", () => {
    // 4h light + 2h sws + 1.5h rem = 7.5h
    const h = sleepHoursFromSummary({
      total_light_sleep_time_milli: 4 * 3_600_000,
      total_slow_wave_sleep_time_milli: 2 * 3_600_000,
      total_rem_sleep_time_milli: 1.5 * 3_600_000,
    });
    expect(h).toBe(7.5);
  });
  it("null bei fehlenden/leeren Daten", () => {
    expect(sleepHoursFromSummary(undefined)).toBeNull();
    expect(sleepHoursFromSummary({})).toBeNull();
  });
});

describe("mapSyncData", () => {
  const recovery = {
    score_state: "SCORED",
    score: {
      recovery_score: 72.4,
      resting_heart_rate: 61.6,
      hrv_rmssd_milli: 48.2,
    },
    updated_at: "2026-07-16T05:30:00Z",
  };
  const sleep = {
    score_state: "SCORED",
    end: "2026-07-16T05:00:00Z",
    score: {
      stage_summary: {
        total_light_sleep_time_milli: 4 * 3_600_000,
        total_slow_wave_sleep_time_milli: 2 * 3_600_000,
        total_rem_sleep_time_milli: 1.5 * 3_600_000,
      },
    },
  };

  it("mappt Recovery + Schlaf auf den Aufwach-Tag, gerundet", () => {
    const r = mapSyncData(recovery, sleep);
    expect(r?.date).toBe("2026-07-16");
    const byType = Object.fromEntries(r!.entries.map((e) => [e.type, e.value]));
    expect(byType).toEqual({ recovery: 72, rhr: 62, hrv: 48, sleep: 7.5 });
  });

  it("überspringt nicht bewertete (score_state != SCORED) Werte", () => {
    const r = mapSyncData(
      { score_state: "PENDING_SCORE", updated_at: "2026-07-16T05:30:00Z" },
      { ...sleep, score_state: "PENDING_SCORE" },
    );
    expect(r?.date).toBe("2026-07-16");
    expect(r?.entries).toEqual([]);
  });

  it("null, wenn kein Datum bestimmbar", () => {
    expect(mapSyncData(undefined, undefined)).toBeNull();
    expect(mapSyncData({ score_state: "SCORED", score: {} }, undefined)).toBeNull();
  });

  it("nutzt updated_at der Recovery, wenn kein Schlaf vorliegt", () => {
    const r = mapSyncData(recovery, undefined);
    expect(r?.date).toBe("2026-07-16");
    expect(r?.entries.find((e) => e.type === "sleep")).toBeUndefined();
  });
});
