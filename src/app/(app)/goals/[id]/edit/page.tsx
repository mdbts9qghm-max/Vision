import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateGoal } from "@/server/actions/goals";
import { getGoalWithMilestones } from "@/server/queries/goals";
import { GoalForm } from "@/components/goals/goal-form";

export const metadata: Metadata = { title: "Ziel bearbeiten — Vision" };

export default async function EditGoalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getGoalWithMilestones(id);
  if (!item) notFound();
  const { goal } = item;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Ziel bearbeiten</h1>
      <GoalForm
        submitLabel="Speichern"
        initial={{
          title: goal.title,
          why: goal.why ?? undefined,
          deadline: goal.deadline ?? "",
          priority: goal.priority,
        }}
        onSubmit={updateGoal.bind(null, goal.id)}
      />
    </div>
  );
}
