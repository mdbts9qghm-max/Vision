"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/server/auth";
import { db } from "@/server/db";
import { goals, milestones } from "@/server/db/schema";
import { isValidISODate } from "@/domain/dates";

const goalInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Bitte einen Titel eingeben.")
    .max(120, "Titel ist zu lang (max. 120 Zeichen)."),
  why: z.string().trim().max(500).optional(),
  deadline: z
    .string()
    .refine((v) => v === "" || isValidISODate(v), "Ungültiges Datum.")
    .optional(),
  priority: z.enum(["low", "medium", "high"]),
});

export type GoalInput = z.infer<typeof goalInputSchema>;
export type ActionState = { error?: string };

const idSchema = z.uuid();

export async function createGoal(input: GoalInput): Promise<ActionState> {
  await requireAuth();
  const parsed = goalInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [created] = await db
    .insert(goals)
    .values({
      title: parsed.data.title,
      why: parsed.data.why || null,
      deadline: parsed.data.deadline || null,
      priority: parsed.data.priority,
    })
    .returning({ id: goals.id });
  revalidateGoalViews();
  redirect(`/goals/${created.id}`);
}

export async function updateGoal(
  rawId: string,
  input: GoalInput,
): Promise<ActionState> {
  await requireAuth();
  const id = idSchema.safeParse(rawId);
  const parsed = goalInputSchema.safeParse(input);
  if (!id.success) return { error: "Ungültiges Ziel." };
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db
    .update(goals)
    .set({
      title: parsed.data.title,
      why: parsed.data.why || null,
      deadline: parsed.data.deadline || null,
      priority: parsed.data.priority,
    })
    .where(eq(goals.id, id.data));
  revalidateGoalViews(id.data);
  redirect(`/goals/${id.data}`);
}

export async function setGoalStatus(
  rawId: string,
  status: "active" | "completed" | "archived",
): Promise<ActionState> {
  await requireAuth();
  const id = idSchema.safeParse(rawId);
  const parsedStatus = z
    .enum(["active", "completed", "archived"])
    .safeParse(status);
  if (!id.success || !parsedStatus.success) {
    return { error: "Ungültiges Ziel." };
  }

  await db
    .update(goals)
    .set({ status: parsedStatus.data })
    .where(eq(goals.id, id.data));
  revalidateGoalViews(id.data);
  redirect("/goals");
}

export async function deleteGoal(rawId: string): Promise<ActionState> {
  await requireAuth();
  const id = idSchema.safeParse(rawId);
  if (!id.success) return { error: "Ungültiges Ziel." };

  // Cascade löscht die Meilensteine mit.
  await db.delete(goals).where(eq(goals.id, id.data));
  revalidateGoalViews();
  redirect("/goals");
}

const milestoneTitleSchema = z
  .string()
  .trim()
  .min(1, "Bitte einen Titel eingeben.")
  .max(120, "Titel ist zu lang (max. 120 Zeichen).");

export async function addMilestone(input: {
  goalId: string;
  title: string;
}): Promise<ActionState> {
  await requireAuth();
  const goalId = idSchema.safeParse(input.goalId);
  const title = milestoneTitleSchema.safeParse(input.title);
  if (!goalId.success) return { error: "Ungültiges Ziel." };
  if (!title.success) return { error: title.error.issues[0].message };

  // Ans Ende sortieren.
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${milestones.sortOrder}), -1)` })
    .from(milestones)
    .where(eq(milestones.goalId, goalId.data));

  await db.insert(milestones).values({
    goalId: goalId.data,
    title: title.data,
    sortOrder: max + 1,
  });
  revalidateGoalViews(goalId.data);
  return {};
}

export async function toggleMilestone(rawId: string): Promise<ActionState> {
  await requireAuth();
  const id = idSchema.safeParse(rawId);
  if (!id.success) return { error: "Ungültiger Meilenstein." };

  const rows = await db
    .select({ goalId: milestones.goalId, completedAt: milestones.completedAt })
    .from(milestones)
    .where(eq(milestones.id, id.data));
  if (!rows[0]) return { error: "Meilenstein nicht gefunden." };

  await db
    .update(milestones)
    .set({
      completedAt: rows[0].completedAt ? null : new Date().toISOString(),
    })
    .where(eq(milestones.id, id.data));
  revalidateGoalViews(rows[0].goalId);
  return {};
}

export async function deleteMilestone(rawId: string): Promise<ActionState> {
  await requireAuth();
  const id = idSchema.safeParse(rawId);
  if (!id.success) return { error: "Ungültiger Meilenstein." };

  const rows = await db
    .select({ goalId: milestones.goalId })
    .from(milestones)
    .where(eq(milestones.id, id.data));
  if (!rows[0]) return {};

  await db.delete(milestones).where(eq(milestones.id, id.data));
  revalidateGoalViews(rows[0].goalId);
  return {};
}

function revalidateGoalViews(goalId?: string) {
  revalidatePath("/goals");
  if (goalId) revalidatePath(`/goals/${goalId}`);
}
