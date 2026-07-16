"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/server/auth";
import { db } from "@/server/db";
import { checkins } from "@/server/db/schema";
import { todayISO } from "@/domain/dates";

const level = z.number().int().min(1).max(5).nullable();

const checkinSchema = z.object({
  mood: level.optional(),
  energy: level.optional(),
  stress: level.optional(),
  note: z.string().trim().max(1000, "Maximal 1000 Zeichen.").optional(),
});

export type CheckinInput = z.infer<typeof checkinSchema>;
export type ActionState = { error?: string };

/**
 * Speichert den heutigen Check-in (Upsert je Tag). Der Client hält den
 * vollständigen Stand und schickt ihn bei jeder Änderung — race-frei genug
 * für einen Einzelnutzer.
 */
export async function setTodayCheckin(
  input: CheckinInput,
): Promise<ActionState> {
  await requireAuth();
  const parsed = checkinSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const today = todayISO();
  const note = parsed.data.note?.trim() ? parsed.data.note.trim() : null;
  const row = {
    mood: parsed.data.mood ?? null,
    energy: parsed.data.energy ?? null,
    stress: parsed.data.stress ?? null,
    note,
    updatedAt: new Date().toISOString(),
  };

  // Nichts erfasst → bestehenden Eintrag löschen statt leere Zeile halten.
  if (
    row.mood == null &&
    row.energy == null &&
    row.stress == null &&
    row.note == null
  ) {
    await db.delete(checkins).where(eq(checkins.date, today));
  } else {
    await db
      .insert(checkins)
      .values({ date: today, ...row })
      .onConflictDoUpdate({ target: checkins.date, set: row });
  }

  revalidatePath("/dashboard");
  revalidatePath("/review");
  return {};
}
