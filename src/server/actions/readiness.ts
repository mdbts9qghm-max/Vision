"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/server/auth";
import { db } from "@/server/db";
import { readinessChecks } from "@/server/db/schema";
import { todayISO } from "@/domain/dates";

export type ActionState = { error?: string };

const scoreSchema = z.enum(["good", "ok", "low"]);

/** Erholungs-Check für heute setzen (Upsert). */
export async function setTodayReadiness(input: {
  score: "good" | "ok" | "low";
}): Promise<ActionState> {
  await requireAuth();
  const parsed = scoreSchema.safeParse(input.score);
  if (!parsed.success) return { error: "Ungültiger Wert." };

  await db
    .insert(readinessChecks)
    .values({ date: todayISO(), score: parsed.data })
    .onConflictDoUpdate({
      target: readinessChecks.date,
      set: { score: parsed.data },
    });
  revalidatePath("/dashboard");
  revalidatePath("/coach");
  return {};
}
