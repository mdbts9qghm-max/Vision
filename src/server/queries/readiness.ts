import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { metrics, readinessChecks } from "@/server/db/schema";
import type { DaySignals } from "@/domain/readiness";

/** Tagessignale für die Autoregulation: Schlaf, WHOOP-Recovery, Check-in. */
export async function getDaySignals(date: string): Promise<DaySignals> {
  const [sleepRows, recoveryRows, checkRows] = await Promise.all([
    db
      .select({ value: metrics.value })
      .from(metrics)
      .where(and(eq(metrics.type, "sleep"), eq(metrics.date, date))),
    db
      .select({ value: metrics.value })
      .from(metrics)
      .where(and(eq(metrics.type, "recovery"), eq(metrics.date, date))),
    db
      .select({ score: readinessChecks.score })
      .from(readinessChecks)
      .where(eq(readinessChecks.date, date)),
  ]);
  return {
    sleepHours: sleepRows[0]?.value ?? null,
    recoveryPct: recoveryRows[0]?.value ?? null,
    readiness: checkRows[0]?.score ?? null,
  };
}
