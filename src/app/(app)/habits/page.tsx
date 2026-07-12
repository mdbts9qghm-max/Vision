import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getHabitsWithCompletions } from "@/server/queries/habits";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { HabitCard } from "@/components/habits/habit-card";

export const metadata: Metadata = { title: "Gewohnheiten — Vision" };

export default async function HabitsPage() {
  const all = await getHabitsWithCompletions();
  const active = all.filter((h) => !h.habit.archivedAt);
  const archived = all.filter((h) => h.habit.archivedAt);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Gewohnheiten</h1>
        <Button asChild size="sm">
          <Link href="/habits/new">
            <Plus aria-hidden /> Neu
          </Link>
        </Button>
      </header>

      {active.length === 0 ? (
        <EmptyState
          title="Noch keine Gewohnheiten"
          description="Lege deine erste Gewohnheit an — täglich, x-mal pro Woche oder an festen Wochentagen. Abhaken dauert danach genau einen Tap."
          action={
            <Button asChild>
              <Link href="/habits/new">Erste Gewohnheit anlegen</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {active.map((item) => (
            <HabitCard key={item.habit.id} item={item} />
          ))}
        </div>
      )}

      {archived.length > 0 ? (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer select-none py-2">
            Archiv ({archived.length})
          </summary>
          <ul className="space-y-2 pt-2">
            {archived.map(({ habit }) => (
              <li key={habit.id} className="flex items-center justify-between">
                <span className="truncate">{habit.name}</span>
                <Link
                  href={`/habits/${habit.id}/edit`}
                  className="shrink-0 underline underline-offset-4 hover:text-foreground"
                >
                  Öffnen
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
