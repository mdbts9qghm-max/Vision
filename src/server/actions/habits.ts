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

const recurrenceSchema = z.discriminatedUnion("type", [
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
]);

const habitInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Bitte einen Namen eingeben.")
    .max(100, "Name ist zu lang (max. 100 Zeichen)."),
  description: z.string().trim().max(500).optional(),
  recurrence: recurrenceSchema,
});

export type HabitInput = z.infer<typeof habitInputSchema>;
export type ActionState = { error?: string };

const idSchema = z.object({ id: z.uuid() });

export async function createHabit(input: HabitInput): Promise<ActionState> {
  await requireAuth();
  const parsed = habitInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.insert(habits).values({
    name: parsed.data.name,
    description: parsed.data.description || null,
    recurrence: parsed.data.recurrence,
  });
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

  await db
    .update(habits)
    .set({
      name: parsed.data.name,
      description: parsed.data.description || null,
      recurrence: parsed.data.recurrence,
    })
    .where(eq(habits.id, id.data.id));
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

  // Cascade löscht die Completions mit.
  await db.delete(habits).where(eq(habits.id, id.data.id));
  revalidateHabitViews();
  redirect("/habits");
}

/** Nachträge erlaubt, aber begrenzt: heute bis 6 Tage zurück, keine Zukunft. */
const BACKFILL_DAYS = 6;

const toggleSchema = z.object({
  habitId: z.uuid(),
  date: z.string().refine(isValidISODate, "Ungültiges Datum."),
});

export async function toggleCompletion(input: {
  habitId: string;
  date: string;
}): Promise<ActionState> {
  await requireAuth();
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const today = todayISO();
  const { habitId, date } = parsed.data;
  if (date > today || date < addDaysISO(today, -BACKFILL_DAYS)) {
    return { error: "Nachträge nur bis 6 Tage zurück möglich." };
  }

  const existing = await db
    .select({ id: habitCompletions.id })
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.habitId, habitId),
        eq(habitCompletions.date, date),
      ),
    );

  if (existing.length > 0) {
    await db
      .delete(habitCompletions)
      .where(eq(habitCompletions.id, existing[0].id));
  } else {
    await db.insert(habitCompletions).values({ habitId, date });
  }
  revalidateHabitViews();
  return {};
}

function revalidateHabitViews() {
  revalidatePath("/habits");
  revalidatePath("/dashboard");
}
