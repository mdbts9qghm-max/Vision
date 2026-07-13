"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/server/auth";
import { db } from "@/server/db";
import { dayFocus } from "@/server/db/schema";
import { todayISO } from "@/domain/dates";

const focusSchema = z.object({
  text: z.string().trim().max(200, "Maximal 200 Zeichen."),
});

export type ActionState = { error?: string };

/** Setzt den Fokus für heute; leerer Text löscht ihn. */
export async function setTodayFocus(input: {
  text: string;
}): Promise<ActionState> {
  await requireAuth();
  const parsed = focusSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const today = todayISO();
  const text = parsed.data.text;

  if (text === "") {
    await db.delete(dayFocus).where(eq(dayFocus.date, today));
  } else {
    await db
      .insert(dayFocus)
      .values({ date: today, text })
      .onConflictDoUpdate({ target: dayFocus.date, set: { text } });
  }
  revalidatePath("/dashboard");
  return {};
}
