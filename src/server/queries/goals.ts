import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { goals, milestones } from "@/server/db/schema";

export type Goal = typeof goals.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;

export interface GoalWithMilestones {
  goal: Goal;
  milestones: Milestone[];
}

export async function getGoalsWithMilestones(): Promise<GoalWithMilestones[]> {
  const rows = await db.select().from(goals).orderBy(asc(goals.createdAt));
  if (rows.length === 0) return [];

  const ms = await db
    .select()
    .from(milestones)
    .where(
      inArray(
        milestones.goalId,
        rows.map((g) => g.id),
      ),
    )
    .orderBy(asc(milestones.sortOrder));

  const byGoal = new Map<string, Milestone[]>();
  for (const m of ms) {
    const list = byGoal.get(m.goalId);
    if (list) list.push(m);
    else byGoal.set(m.goalId, [m]);
  }

  return rows.map((goal) => ({
    goal,
    milestones: byGoal.get(goal.id) ?? [],
  }));
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
