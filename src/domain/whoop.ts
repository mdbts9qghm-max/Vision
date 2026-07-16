/**
 * Reine Abbildungslogik für die WHOOP-Anbindung (kein HTTP, keine Secrets).
 * Wandelt WHOOP-API-Antworten in unsere Tages-Metriken und entscheidet, wann
 * das Access-Token erneuert werden muss. Voll unit-testbar.
 */

import { toISODate } from "./dates";
import type { MetricType } from "./metric-units";

// ---- Minimal-Typen der WHOOP v2-Antworten (nur die genutzten Felder) ----

export interface WhoopRecoveryScore {
  recovery_score?: number;
  resting_heart_rate?: number;
  hrv_rmssd_milli?: number;
}
export interface WhoopRecovery {
  score_state?: string;
  score?: WhoopRecoveryScore;
  updated_at?: string;
  sleep_id?: string;
}
export interface WhoopStageSummary {
  total_light_sleep_time_milli?: number;
  total_slow_wave_sleep_time_milli?: number;
  total_rem_sleep_time_milli?: number;
}
export interface WhoopSleep {
  id?: string;
  start?: string;
  end?: string;
  nap?: boolean;
  score_state?: string;
  score?: { stage_summary?: WhoopStageSummary };
}

export interface SyncEntry {
  type: MetricType;
  value: number;
}
export interface SyncResult {
  date: string; // YYYY-MM-DD (Europe/Berlin)
  entries: SyncEntry[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Access-Token bald abgelaufen? `skewSeconds` Puffer, damit nicht mitten im
 * Request abläuft.
 */
export function needsRefresh(
  expiresAtISO: string,
  now: Date = new Date(),
  skewSeconds = 60,
): boolean {
  const expiry = Date.parse(expiresAtISO);
  if (Number.isNaN(expiry)) return true;
  return expiry - now.getTime() <= skewSeconds * 1000;
}

/** Ablaufzeitpunkt aus `expires_in` (Sekunden) berechnen. */
export function expiryFromNow(expiresInSeconds: number, now: Date = new Date()): string {
  return new Date(now.getTime() + expiresInSeconds * 1000).toISOString();
}

/** Schlafstunden = leicht + Tiefschlaf + REM (ms → h). `null`, wenn nichts da. */
export function sleepHoursFromSummary(
  s: WhoopStageSummary | undefined,
): number | null {
  if (!s) return null;
  const ms =
    (s.total_light_sleep_time_milli ?? 0) +
    (s.total_slow_wave_sleep_time_milli ?? 0) +
    (s.total_rem_sleep_time_milli ?? 0);
  if (ms <= 0) return null;
  return round1(ms / 3_600_000);
}

/**
 * Baut aus der jüngsten Recovery + dem jüngsten Schlaf die Tages-Metriken.
 * Das Datum ist der Aufwach-Tag (Ende des Schlafs) in Europe/Berlin — so
 * landet die Erholung auf dem Tag, für den sie gilt. `null`, wenn sich kein
 * Datum bestimmen lässt.
 */
export function mapSyncData(
  recovery: WhoopRecovery | undefined,
  sleep: WhoopSleep | undefined,
): SyncResult | null {
  const dateSource = sleep?.end ?? recovery?.updated_at;
  if (!dateSource) return null;
  const parsed = Date.parse(dateSource);
  if (Number.isNaN(parsed)) return null;
  const date = toISODate(new Date(parsed));

  const entries: SyncEntry[] = [];
  const push = (type: MetricType, v: number | undefined | null) => {
    if (v != null && Number.isFinite(v)) entries.push({ type, value: v });
  };

  if (recovery?.score_state === "SCORED" && recovery.score) {
    const s = recovery.score;
    if (s.recovery_score != null) push("recovery", Math.round(s.recovery_score));
    if (s.resting_heart_rate != null)
      push("rhr", Math.round(s.resting_heart_rate));
    if (s.hrv_rmssd_milli != null) push("hrv", Math.round(s.hrv_rmssd_milli));
  }

  if (sleep?.score_state === "SCORED") {
    const hours = sleepHoursFromSummary(sleep.score?.stage_summary);
    if (hours != null) push("sleep", hours);
  }

  return { date, entries };
}
