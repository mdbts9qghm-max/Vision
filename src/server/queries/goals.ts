import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { goals, milestones } from "@/server/db/schema";

export type Goal = typeof goals.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;

export interface GoalWithMilestones {
  goal: Goal;
  milestones: Milestone[];
}

/** Gruppiert vorgeladene Zeilen — kein zusätzlicher DB-Roundtrip. */
export function assembleGoals(
  goalRows: Goal[],
  milestoneRows: Milestone[],
): GoalWithMilestones[] {
  const byGoal = new Map<string, Milestone[]>();
  for (const m of milestoneRows) {
    const list = byGoal.get(m.goalId);
    if (list) list.push(m);
    else byGoal.set(m.goalId, [m]);
  }
  return goalRows.map((goal) => ({
    goal,
    milestones: (byGoal.get(goal.id) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    ),
  }));
}

export async function getGoalsWithMilestones(): Promise<GoalWithMilestones[]> {
  const [goalRows, milestoneRows] = await db.batch([
    db.select().from(goals).orderBy(asc(goals.createdAt)),
    db.select().from(milestones).orderBy(asc(milestones.sortOrder)),
  ]);
  return assembleGoals(goalRows, milestoneRows);
}

export async function getGoalWithMilestones(
  id: string,
): Promise<GoalWithMilestones | undefined> {
  const rows = await db.select().from(goals).where(eq(goals.id, id));
  if (!rows[0]) return undefined;
  const ms = await db
    .select()
    .from(milestones)
    .where(eq(milestones.goalId, id))
    .orderBy(asc(milestones.sortOrder));
  return { goal: rows[0], milestones: ms };
}
