"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/server/auth";
import { db } from "@/server/db";
import { plannedSessions, shifts } from "@/server/db/schema";
import { addDaysISO, diffDaysISO, isValidISODate, todayISO, weekStartISO } from "@/domain/dates";
import {
  baseTargetKm,
  effectiveTargetKm,
  planWeek,
  type CoachParams,
} from "@/domain/coach";
import {
  getOrCreateCoachSettings,
  getShiftMap,
  getWeekActuals,
  getWeekPlannedKm,
} from "@/server/queries/coach";

export type ActionState = { error?: string };

const shiftSchema = z.object({
  date: z.string().refine(isValidISODate, "Ungültiges Datum."),
  type: z.enum(["day", "night", "sleep", "free", "v"]).nullable(),
});

/** Schicht setzen/entfernen und den Plan ab heute neu berechnen. */
export async function setShift(input: {
  date: string;
  type: "day" | "night" | "sleep" | "free" | "v" | null;
}): Promise<ActionState> {
  await requireAuth();
  const parsed = shiftSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { date, type } = parsed.data;
  if (type === null) {
    await db.delete(shifts).where(eq(shifts.date, date));
  } else {
    await db
      .insert(shifts)
      .values({ date, type })
      .onConflictDoUpdate({ target: shifts.date, set: { type } });
  }
  await regenerate();
  revalidateCoachViews();
  return {};
}

/** Plan für heute + 13 Tage neu berechnen (überschreibt nur Zukunft). */
export async function regeneratePlan(): Promise<ActionState> {
  await requireAuth();
  await regenerate();
  revalidateCoachViews();
  return {};
}

async function regenerate(): Promise<void> {
  const settings = await getOrCreateCoachSettings();
  const params: CoachParams = {
    weeklyKmBase: settings.weeklyKmBase,
    progressionPct: settings.progressionPct,
    deloadEveryWeeks: settings.deloadEveryWeeks,
    weeklyGymTarget: settings.weeklyGymTarget,
  };

  const today = todayISO();
  const currentWeek = weekStartISO(today);
  const horizon = addDaysISO(today, 13);
  const shiftMap = await getShiftMap(currentWeek, addDaysISO(currentWeek, 20));

  // Vorwoche als Progressions-Basis.
  const prevWeek = addDaysISO(currentWeek, -7);
  const [prevPlanned, prevActuals] = await Promise.all([
    getWeekPlannedKm(prevWeek),
    getWeekActuals(prevWeek),
  ]);

  const weekIndexOf = (weekStart: string) =>
    Math.max(Math.round(diffDaysISO(settings.startWeek, weekStart) / 7), 0);

  const rows: (typeof plannedSessions.$inferInsert)[] = [];
  const prevWeekPlannedKm = prevPlanned > 0 ? prevPlanned : null;
  for (
    let weekStart = currentWeek;
    weekStart <= horizon;
    weekStart = addDaysISO(weekStart, 7)
  ) {
    const idx = weekIndexOf(weekStart);
    let target = baseTargetKm(params, idx);
    if (weekStart === currentWeek) {
      target = effectiveTargetKm(
        target,
        prevWeekPlannedKm,
        prevPlanned > 0 ? prevActuals.km : null,
      );
    }
    const plan = planWeek(params, weekStart, shiftMap, target);
    for (const day of plan.days) {
      if (day.date < today || day.date > horizon) continue;
      rows.push({
        date: day.date,
        kind: day.kind,
        targetKm: day.targetKm ?? null,
        optional: day.optional,
        reason: day.reason,
      });
    }
  }

  await db
    .delete(plannedSessions)
    .where(and(gte(plannedSessions.date, today), lte(plannedSessions.date, horizon)));
  if (rows.length > 0) await db.insert(plannedSessions).values(rows);
}

function revalidateCoachViews() {
  revalidatePath("/coach");
  revalidatePath("/dashboard");
}
