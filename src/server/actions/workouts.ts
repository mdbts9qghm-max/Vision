"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/server/auth";
import { db } from "@/server/db";
import { workouts } from "@/server/db/schema";
import { isValidISODate, todayISO } from "@/domain/dates";

const workoutSchema = z.object({
  date: z.string().refine(isValidISODate, "Ungültiges Datum."),
  type: z
    .string()
    .trim()
    .min(1, "Bitte eine Trainingsart wählen.")
    .max(40, "Trainingsart ist zu lang."),
  durationMin: z
    .number()
    .int("Nur ganze Minuten.")
    .min(1, "Mindestens 1 Minute.")
    .max(1440, "Maximal 24 Stunden."),
  note: z.string().trim().max(500).optional(),
});

export type WorkoutInput = z.infer<typeof workoutSchema>;
export type ActionState = { error?: string };

export async function createWorkout(
  input: WorkoutInput,
): Promise<ActionState> {
  await requireAuth();
  const parsed = workoutSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.date > todayISO()) {
    return { error: "Kein Datum in der Zukunft." };
  }

  await db.insert(workouts).values({
    date: parsed.data.date,
    type: parsed.data.type,
    durationMin: parsed.data.durationMin,
    note: parsed.data.note || null,
  });
  revalidatePath("/fitness");
  return {};
}

export async function deleteWorkout(rawId: string): Promise<ActionState> {
  await requireAuth();
  const id = z.uuid().safeParse(rawId);
  if (!id.success) return { error: "Ungültiges Training." };

  await db.delete(workouts).where(eq(workouts.id, id.data));
  revalidatePath("/fitness");
  return {};
}
