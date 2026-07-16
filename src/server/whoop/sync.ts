/**
 * Holt die jüngste Recovery + den jüngsten Schlaf von WHOOP und schreibt sie
 * als Tages-Metriken (recovery, hrv, rhr, sleep). Ein Wert pro Tag (Upsert).
 */

import { db } from "@/server/db";
import { metrics } from "@/server/db/schema";
import { mapSyncData, type WhoopRecovery, type WhoopSleep } from "@/domain/whoop";
import { METRIC_UNITS } from "@/domain/metric-units";
import { markSynced, whoopGet } from "./client";

interface Collection<T> {
  records: T[];
  next_token?: string;
}

export interface SyncSummary {
  date: string | null;
  saved: string[]; // Typen, die geschrieben wurden
}

export async function syncWhoop(): Promise<SyncSummary> {
  // Jeweils den neuesten Datensatz holen (Sortierung: start desc).
  const [recovery, sleep] = await Promise.all([
    whoopGet<Collection<WhoopRecovery>>("/v2/recovery?limit=1"),
    whoopGet<Collection<WhoopSleep>>("/v2/activity/sleep?limit=1"),
  ]);

  const mapped = mapSyncData(recovery.records?.[0], sleep.records?.[0]);
  if (!mapped || mapped.entries.length === 0) {
    await markSynced();
    return { date: mapped?.date ?? null, saved: [] };
  }

  for (const entry of mapped.entries) {
    await db
      .insert(metrics)
      .values({
        type: entry.type,
        date: mapped.date,
        value: entry.value,
        unit: METRIC_UNITS[entry.type],
      })
      .onConflictDoUpdate({
        target: [metrics.type, metrics.date],
        set: { value: entry.value },
      });
  }

  await markSynced();
  return { date: mapped.date, saved: mapped.entries.map((e) => e.type) };
}
