import type { Metadata } from "next";
import { createHabit } from "@/server/actions/habits";
import { HabitForm } from "@/components/habits/habit-form";

export const metadata: Metadata = { title: "Neue Gewohnheit — Vision" };

export default function NewHabitPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Neue Gewohnheit</h1>
      <HabitForm submitLabel="Anlegen" onSubmit={createHabit} />
    </div>
  );
}
