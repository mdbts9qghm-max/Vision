import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateHabit } from "@/server/actions/habits";
import { getHabitById } from "@/server/queries/habits";
import { HabitForm } from "@/components/habits/habit-form";
import { HabitDangerZone } from "@/components/habits/habit-danger-zone";

export const metadata: Metadata = { title: "Gewohnheit bearbeiten — Vision" };

export default async function EditHabitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const habit = await getHabitById(id);
  if (!habit) notFound();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">
        Gewohnheit bearbeiten
      </h1>
      <HabitForm
        submitLabel="Speichern"
        initial={{
          name: habit.name,
          description: habit.description ?? undefined,
          recurrence: habit.recurrence,
        }}
        onSubmit={updateHabit.bind(null, habit.id)}
      />
      <HabitDangerZone habitId={habit.id} archived={habit.archivedAt !== null} />
    </div>
  );
}
