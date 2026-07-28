"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/server/auth";
import { db } from "@/server/db";
import { fastingSettings, shifts } from "@/server/db/schema";
import { addDaysISO, isValidISODate, todayISO } from "@/domain/dates";
import { rotationShiftFor } from "@/domain/fasting";
import { regeneratePlan } from "./coach";

export type ActionState = { error?: string; applied?: number };

const startSchema = z.object({
  date: z
    .string()
    .refine(isValidISODate, "Ungültiges Datum.")
    .nullable(),
});

/**
 * Startdatum der Schicht-Rotation setzen (oder mit `null` entfernen).
 * Ab diesem Tag läuft die Rotation mit ihrem ersten Eintrag los.
 */
export async function setRotationStart(input: {
  date: string | null;
}): Promise<ActionState> {
  await requireAuth();
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const row = {
    rotationStart: parsed.data.date,
    updatedAt: new Date().toISOString(),
  };
  await db
    .insert(fastingSettings)
    .values({ id: "singleton", ...row })
    .onConflictDoUpdate({ target: fastingSettings.id, set: row });

  revalidatePath("/sleep");
  revalidatePath("/dashboard");
  return {};
}

/**
 * Überträgt die Rotation als echte Schichten in den Schichtplan — aber nur für
 * Tage, die noch keinen Eintrag haben (manuelle Tage bleiben unangetastet).
 * Damit plant auch der Coach diese Tage. Standard: die nächsten 28 Tage.
 */
export async function applyRotationToShifts(
  days = 28,
): Promise<ActionState> {
  await requireAuth();

  const rows = await db
    .select({ rotationStart: fastingSettings.rotationStart })
    .from(fastingSettings)
    .where(eq(fastingSettings.id, "singleton"));
  const rotationStart = rows[0]?.rotationStart;
  if (!rotationStart) {
    return { error: "Erst ein Startdatum für die Rotation setzen." };
  }

  const today = todayISO();
  const values = Array.from({ length: days }, (_, i) => {
    const date = addDaysISO(today, i);
    const type = rotationShiftFor(date, rotationStart);
    return type ? { date, type } : null;
  }).filter((v): v is { date: string; type: NonNullable<typeof v>["type"] } => v !== null);

  if (values.length === 0) return { applied: 0 };

  // Bestehende (manuell gesetzte) Tage nicht überschreiben.
  const inserted = await db
    .insert(shifts)
    .values(values)
    .onConflictDoNothing({ target: shifts.date })
    .returning({ date: shifts.date });

  // Der Coach plant nur Tage mit bekannter Schicht — jetzt neu rechnen.
  await regeneratePlan();

  revalidatePath("/sleep");
  return { applied: inserted.length };
}
