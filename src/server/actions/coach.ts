"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/server/auth";
import { db } from "@/server/db";
import { coachSettings, plannedSessions, shifts, workouts } from "@/server/db/schema";
import { addDaysISO, diffDaysISO, isValidISODate, todayISO, weekStartISO } from "@/domain/dates";
import {
  baseTargetKm,
  effectiveTargetKm,
  phaseForWeek,
  planStartblockWeek,
  planWeek,
  type CoachParams,
  type ShiftType,
} from "@/domain/coach";
import { plannedSessionToWorkout } from "@/domain/session-workout";
import {
  getOrCreateCoachSettings,
  getShiftMap,
  getWeekActuals,
  getWeekPlannedKm,
} from "@/server/queries/coach";

export type ActionState = { error?: string };

const logSchema = z.object({
  date: z.string().refine(isValidISODate, "Ungültiges Datum."),
});

/** Ein-Tap: die geplante Einheit des Tages als Workout ins Logbuch schreiben. */
export async function logPlannedSession(input: {
  date: string;
}): Promise<ActionState> {
  await requireAuth();
  const parsed = logSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { date } = parsed.data;
  const today = todayISO();
  if (date > today || date < addDaysISO(today, -6)) {
    return { error: "Nur heute oder bis 6 Tage zurück loggbar." };
  }

  const [session] = await db
    .select()
    .from(plannedSessions)
    .where(eq(plannedSessions.date, date));
  if (!session) return { error: "Für diesen Tag ist nichts geplant." };

  const draft = plannedSessionToWorkout(
    session.kind,
    session.targetKm,
    session.targetMin,
  );
  if (!draft) return { error: "Ruhetage werden nicht geloggt." };

  await db.insert(workouts).values({
    date,
    type: draft.type,
    durationMin: draft.durationMin,
    distanceKm: draft.distanceKm ?? null,
    note: draft.note,
  });
  revalidateCoachViews();
  return {};
}

const shiftSchema = z.object({
  date: z.string().refine(isValidISODate, "Ungültiges Datum."),
  type: z
    .enum(["day", "night", "sleep", "free", "v", "sick", "vacation"])
    .nullable(),
});

/** Schicht setzen/entfernen und den Plan ab heute neu berechnen. */
export async function setShift(input: {
  date: string;
  type: ShiftType | null;
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

/**
 * Programm (neu) starten: Die aktuelle Woche wird zu Woche 1 (Startblock).
 * Setzt den Startzeitpunkt auf diesen Montag und rechnet den Plan neu.
 */
export async function restartProgram(): Promise<ActionState> {
  await requireAuth();
  await getOrCreateCoachSettings(); // stellt sicher, dass die Zeile existiert
  const thisWeek = weekStartISO(todayISO());
  await db
    .update(coachSettings)
    .set({ startWeek: thisWeek })
    .where(eq(coachSettings.id, "singleton"));
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
  // Einen Tag vor Wochenstart mitladen: die Erste-Nacht-Erkennung braucht
  // den Vortag (Folge-Nacht über die Wochengrenze).
  const shiftMap = await getShiftMap(
    addDaysISO(currentWeek, -1),
    addDaysISO(currentWeek, 20),
  );

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
    const phase = phaseForWeek(idx);
    let plan;
    if (phase === "startblock") {
      plan = planStartblockWeek(weekStart, shiftMap, idx);
    } else {
      let target = baseTargetKm(params, idx);
      if (weekStart === currentWeek) {
        target = effectiveTargetKm(
          target,
          prevWeekPlannedKm,
          prevPlanned > 0 ? prevActuals.km : null,
        );
      }
      plan = planWeek(params, weekStart, shiftMap, target, phase);
    }
    for (const day of plan.days) {
      if (day.date < today || day.date > horizon) continue;
      rows.push({
        date: day.date,
        kind: day.kind,
        targetKm: day.targetKm ?? null,
        targetMin: day.targetMin ?? null,
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
