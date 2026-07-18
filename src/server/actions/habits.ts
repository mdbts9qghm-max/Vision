"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/server/auth";
import { db } from "@/server/db";
import { habitCompletions, habits } from "@/server/db/schema";
import { addDaysISO, isValidISODate, todayISO } from "@/domain/dates";
import type { IsoWeekday } from "@/domain/recurrence";

const isoWeekdaySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]) satisfies z.ZodType<IsoWeekday>;

const shiftTypeSchema = z.enum([
  "day",
  "night",
  "sleep",
  "free",
  "v",
  "sick",
  "vacation",
]);

const recurrenceSchema = z
  .discriminatedUnion("type", [
    z.object({ type: z.literal("daily") }),
    z.object({
      type: z.literal("timesPerWeek"),
      times: z.number().int().min(1).max(7),
    }),
    z.object({
      type: z.literal("weekdays"),
      weekdays: z
        .array(isoWeekdaySchema)
        .min(1, "Mindestens einen Wochentag wählen.")
        .max(7)
        .refine((w) => new Set(w).size === w.length, "Wochentage doppelt."),
    }),
  ])
  .and(
    z.object({
      shiftTypes: z.array(shiftTypeSchema).max(5).optional(),
    }),
  );

const reminderSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("time"),
      time: z.string().regex(/^\d{2}:\d{2}$/, "Ungültige Zeit."),
    }),
    z.object({
      type: z.literal("shiftRelative"),
      event: z.enum(["beforeStart", "afterEnd"]),
      minutes: z.number().int().min(0).max(720),
    }),
  ])
  .optional();

const habitInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Bitte einen Namen eingeben.")
      .max(100, "Name ist zu lang (max. 100 Zeichen)."),
    cue: z
      .string()
      .trim()
      .min(1, "Bitte einen Auslöser angeben, z. B. nach dem Aufwachen.")
      .max(160, "Auslöser ist zu lang (max. 160 Zeichen)."),
    stackedOn: z.string().trim().max(120).optional(),
    description: z.string().trim().max(500).optional(),
    recurrence: recurrenceSchema,
    category: z
      .enum(["sleep", "nutrition", "movement", "recovery", "mind"])
      .optional(),
    minValue: z.number().positive().max(100000).optional(),
    targetValue: z.number().positive().max(100000).optional(),
    unit: z.string().trim().max(20).optional(),
    reminder: reminderSchema,
  })
  .refine(
    (d) =>
      d.minValue === undefined ||
      d.targetValue === undefined ||
      d.minValue <= d.targetValue,
    { message: "Minimum darf nicht über dem Ziel liegen.", path: ["minValue"] },
  );

export type HabitInput = z.infer<typeof habitInputSchema>;
export type ActionState = { error?: string };

const idSchema = z.object({ id: z.uuid() });

function toRow(data: HabitInput) {
  return {
    name: data.name,
    cue: data.cue,
    stackedOn: data.stackedOn || null,
    description: data.description || null,
    recurrence: data.recurrence,
    category: data.category ?? null,
    minValue: data.minValue ?? null,
    targetValue: data.targetValue ?? null,
    unit: data.unit || null,
    reminder: data.reminder ?? null,
  };
}

export async function createHabit(input: HabitInput): Promise<ActionState> {
  await requireAuth();
  const parsed = habitInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.insert(habits).values(toRow(parsed.data));
  revalidateHabitViews();
  redirect("/habits");
}

export async function updateHabit(
  rawId: string,
  input: HabitInput,
): Promise<ActionState> {
  await requireAuth();
  const id = idSchema.safeParse({ id: rawId });
  const parsed = habitInputSchema.safeParse(input);
  if (!id.success) return { error: "Ungültige Gewohnheit." };
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.update(habits).set(toRow(parsed.data)).where(eq(habits.id, id.data.id));
  revalidateHabitViews();
  redirect("/habits");
}

export async function setHabitArchived(
  rawId: string,
  archived: boolean,
): Promise<ActionState> {
  await requireAuth();
  const id = idSchema.safeParse({ id: rawId });
  if (!id.success) return { error: "Ungültige Gewohnheit." };

  await db
    .update(habits)
    .set({ archivedAt: archived ? new Date().toISOString() : null })
    .where(eq(habits.id, id.data.id));
  revalidateHabitViews();
  redirect("/habits");
}

export async function deleteHabit(rawId: string): Promise<ActionState> {
  await requireAuth();
  const id = idSchema.safeParse({ id: rawId });
  if (!id.success) return { error: "Ungültige Gewohnheit." };

  await db.delete(habits).where(eq(habits.id, id.data.id));
  revalidateHabitViews();
  redirect("/habits");
}

/** Nachträge erlaubt, aber begrenzt: heute bis 6 Tage zurück, keine Zukunft. */
const BACKFILL_DAYS = 6;

const completionSchema = z.object({
  habitId: z.uuid(),
  date: z.string().refine(isValidISODate, "Ungültiges Datum."),
  value: z.number().min(0).max(100000).optional(),
  reason: z.string().trim().max(120).optional(),
});

function withinBackfill(date: string): boolean {
  const today = todayISO();
  return date <= today && date >= addDaysISO(today, -BACKFILL_DAYS);
}

async function existingCompletion(habitId: string, date: string) {
  const rows = await db
    .select({ id: habitCompletions.id, status: habitCompletions.status })
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.habitId, habitId),
        eq(habitCompletions.date, date),
      ),
    );
  return rows[0];
}

/** Ein-Tap-Check: erledigt ↔ verpasst (bzw. Skip → erledigt). */
export async function toggleCompletion(input: {
  habitId: string;
  date: string;
  value?: number;
}): Promise<ActionState> {
  await requireAuth();
  const parsed = completionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { habitId, date, value } = parsed.data;
  if (!withinBackfill(date)) {
    return { error: "Nachträge nur bis 6 Tage zurück möglich." };
  }

  const existing = await existingCompletion(habitId, date);
  if (existing?.status === "done") {
    await db.delete(habitCompletions).where(eq(habitCompletions.id, existing.id));
  } else if (existing) {
    await db
      .update(habitCompletions)
      .set({ status: "done", value: value ?? null, skipReason: null })
      .where(eq(habitCompletions.id, existing.id));
  } else {
    await db
      .insert(habitCompletions)
      .values({ habitId, date, status: "done", value: value ?? null });
  }
  revalidateHabitViews();
  return {};
}

/** Bewusster Skip: skipped ↔ verpasst. Zählt nicht als Fehlschlag. */
export async function skipCompletion(input: {
  habitId: string;
  date: string;
  reason?: string;
}): Promise<ActionState> {
  await requireAuth();
  const parsed = completionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { habitId, date, reason } = parsed.data;
  if (!withinBackfill(date)) {
    return { error: "Nachträge nur bis 6 Tage zurück möglich." };
  }

  const existing = await existingCompletion(habitId, date);
  if (existing?.status === "skipped") {
    await db.delete(habitCompletions).where(eq(habitCompletions.id, existing.id));
  } else if (existing) {
    await db
      .update(habitCompletions)
      .set({ status: "skipped", value: null, skipReason: reason || null })
      .where(eq(habitCompletions.id, existing.id));
  } else {
    await db
      .insert(habitCompletions)
      .values({ habitId, date, status: "skipped", skipReason: reason || null });
  }
  revalidateHabitViews();
  return {};
}

const valueSchema = z.object({
  habitId: z.uuid(),
  date: z.string().refine(isValidISODate, "Ungültiges Datum."),
  value: z.number().min(0).max(100000),
});

/**
 * Wert einer Mess-/Zähl-Gewohnheit für den Tag loggen (Zwei-Level-Ziel).
 * Minimum erreicht → erledigt; darunter (>0) → partial; 0 → Eintrag entfernt.
 */
export async function logHabitValue(input: {
  habitId: string;
  date: string;
  value: number;
}): Promise<ActionState> {
  await requireAuth();
  const parsed = valueSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { habitId, date, value } = parsed.data;
  if (!withinBackfill(date)) {
    return { error: "Nachträge nur bis 6 Tage zurück möglich." };
  }

  const [habit] = await db
    .select({ minValue: habits.minValue, targetValue: habits.targetValue })
    .from(habits)
    .where(eq(habits.id, habitId));
  if (!habit) return { error: "Gewohnheit nicht gefunden." };

  const existing = await existingCompletion(habitId, date);
  if (value <= 0) {
    if (existing) {
      await db.delete(habitCompletions).where(eq(habitCompletions.id, existing.id));
    }
    revalidateHabitViews();
    return {};
  }

  // Schwelle für „erledigt": Minimum, sonst Ziel.
  const threshold = habit.minValue ?? habit.targetValue ?? 0;
  const status = threshold > 0 && value < threshold ? "partial" : "done";

  if (existing) {
    await db
      .update(habitCompletions)
      .set({ status, value, skipReason: null })
      .where(eq(habitCompletions.id, existing.id));
  } else {
    await db.insert(habitCompletions).values({ habitId, date, status, value });
  }
  revalidateHabitViews();
  return {};
}

function revalidateHabitViews() {
  revalidatePath("/habits");
  revalidatePath("/dashboard");
}
