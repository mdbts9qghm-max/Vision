"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/server/auth";
import { db } from "@/server/db";
import { weeklyReviews } from "@/server/db/schema";
import { isValidISODate, todayISO, weekStartISO } from "@/domain/dates";

const text = z.string().trim().max(2000, "Maximal 2000 Zeichen.").optional();

const reviewSchema = z.object({
  weekStart: z.string().refine(isValidISODate, "Ungültiges Datum."),
  wentWell: text,
  toImprove: text,
  focusNext: text,
});

export type ReviewInput = z.infer<typeof reviewSchema>;
export type ActionState = { error?: string };

/** Speichert den Wochenrückblick (Upsert je ISO-Woche). */
export async function saveWeeklyReview(
  input: ReviewInput,
): Promise<ActionState> {
  await requireAuth();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Nur Wochen bis einschließlich der laufenden zulassen.
  const weekStart = weekStartISO(parsed.data.weekStart);
  if (weekStart > weekStartISO(todayISO())) {
    return { error: "Diese Woche liegt in der Zukunft." };
  }

  const clean = (s?: string) => (s && s.trim() ? s.trim() : null);
  const row = {
    wentWell: clean(parsed.data.wentWell),
    toImprove: clean(parsed.data.toImprove),
    focusNext: clean(parsed.data.focusNext),
    updatedAt: new Date().toISOString(),
  };

  await db
    .insert(weeklyReviews)
    .values({ weekStart, ...row })
    .onConflictDoUpdate({ target: weeklyReviews.weekStart, set: row });

  revalidatePath("/review");
  revalidatePath("/dashboard");
  return {};
}
