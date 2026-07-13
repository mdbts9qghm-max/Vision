import type { Metadata } from "next";
import { createGoal } from "@/server/actions/goals";
import { GoalForm } from "@/components/goals/goal-form";

export const metadata: Metadata = { title: "Neues Ziel — Vision" };

export default function NewGoalPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Neues Ziel</h1>
      <GoalForm submitLabel="Anlegen" onSubmit={createGoal} />
    </div>
  );
}
