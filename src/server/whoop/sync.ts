/**
 * Holt die jüngste Recovery + den jüngsten Schlaf von WHOOP und schreibt sie
 * als Tages-Metriken (recovery, hrv, rhr, sleep). Ein Wert pro Tag (Upsert).
 */

import { db } from "@/server/db";
import { metrics } from "@/server/db/schema";
import { mapSyncData, type WhoopRecovery, type WhoopSleep } from "@/domain/whoop";
import { METRIC_UNITS } from "@/domain/metric-units";
import {
  getAccessToken,
  markSynced,
  refreshAccessToken,
  whoopGet,
  WhoopHttpError,
} from "./client";

interface Collection<T> {
  records: T[];
  next_token?: string;
}

export interface SyncSummary {
  date: string | null;
  saved: string[]; // Typen, die geschrieben wurden
}

/** Recovery + Schlaf nacheinander (kein Refresh-Race) mit einem Token holen. */
async function pull(token: string) {
  const recovery = await whoopGet<Collection<WhoopRecovery>>(
    "/v2/recovery?limit=1",
    token,
  );
  const sleep = await whoopGet<Collection<WhoopSleep>>(
    "/v2/activity/sleep?limit=1",
    token,
  );
  return { recovery, sleep };
}

export async function syncWhoop(): Promise<SyncSummary> {
  let token = await getAccessToken();
  let data: { recovery: Collection<WhoopRecovery>; sleep: Collection<WhoopSleep> };
  try {
    data = await pull(token);
  } catch (e) {
    // Weist die API das Token ab (401), einmal frisch erneuern und wiederholen.
    if (e instanceof WhoopHttpError && e.status === 401) {
      token = await refreshAccessToken();
      data = await pull(token);
    } else {
      throw e;
    }
  }

  const mapped = mapSyncData(data.recovery.records?.[0], data.sleep.records?.[0]);
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
