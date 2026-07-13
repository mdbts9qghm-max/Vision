"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/server/auth";
import { db } from "@/server/db";
import { metrics } from "@/server/db/schema";
import { isValidISODate, todayISO } from "@/domain/dates";

const METRIC_CONFIG = {
  weight: { unit: "kg", min: 20, max: 400 },
  steps: { unit: "Schritte", min: 0, max: 200_000 },
  sleep: { unit: "h", min: 0, max: 24 },
} as const;

export type MetricType = keyof typeof METRIC_CONFIG;

const inputSchema = z.object({
  type: z.enum(["weight", "steps", "sleep"]),
  value: z.number().finite(),
  date: z.string().refine(isValidISODate, "Ungültiges Datum.").optional(),
});

export type ActionState = { error?: string };

/** Legt den Messwert für den Tag an oder überschreibt ihn (ein Wert pro Tag). */
export async function upsertMetric(input: {
  type: MetricType;
  value: number;
  date?: string;
}): Promise<ActionState> {
  await requireAuth();
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { type, value } = parsed.data;
  const config = METRIC_CONFIG[type];
  if (value < config.min || value > config.max) {
    return {
      error: `Wert muss zwischen ${config.min} und ${config.max} ${config.unit} liegen.`,
    };
  }

  const today = todayISO();
  const date = parsed.data.date ?? today;
  if (date > today) return { error: "Kein Datum in der Zukunft." };

  await db
    .insert(metrics)
    .values({ type, date, value, unit: config.unit })
    .onConflictDoUpdate({
      target: [metrics.type, metrics.date],
      set: { value },
    });
  revalidatePath("/fitness");
  return {};
}
