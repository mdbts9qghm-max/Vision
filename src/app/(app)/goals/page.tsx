import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getGoalsWithMilestones } from "@/server/queries/goals";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { GoalCard } from "@/components/goals/goal-card";

export const metadata: Metadata = { title: "Ziele — Vision" };

export default async function GoalsPage() {
  const all = await getGoalsWithMilestones();
  // Aktive nach Priorität (hoch zuerst), dann nach Deadline.
  const order = { high: 0, medium: 1, low: 2 } as const;
  const active = all
    .filter((g) => g.goal.status === "active")
    .sort(
      (a, b) =>
        order[a.goal.priority] - order[b.goal.priority] ||
        (a.goal.deadline ?? "9999").localeCompare(b.goal.deadline ?? "9999"),
    );
  const completed = all.filter((g) => g.goal.status === "completed");
  const archived = all.filter((g) => g.goal.status === "archived");

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Ziele</h1>
        <Button asChild size="sm">
          <Link href="/goals/new">
            <Plus aria-hidden /> Neu
          </Link>
        </Button>
      </header>

      {active.length === 0 && completed.length === 0 ? (
        <EmptyState
          title="Noch keine Ziele"
          description="Definiere, worauf du hinarbeitest — mit deinem Warum, einer Deadline und Meilensteinen, die den Fortschritt sichtbar machen."
          action={
            <Button asChild>
              <Link href="/goals/new">Erstes Ziel anlegen</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {active.map((item) => (
              <GoalCard key={item.goal.id} item={item} />
            ))}
          </div>

          {completed.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Erreicht ({completed.length})
              </h2>
              {completed.map((item) => (
                <GoalCard key={item.goal.id} item={item} />
              ))}
            </section>
          ) : null}
        </>
      )}

      {archived.length > 0 ? (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer select-none py-2">
            Archiv ({archived.length})
          </summary>
          <ul className="space-y-2 pt-2">
            {archived.map(({ goal }) => (
              <li key={goal.id} className="flex items-center justify-between">
                <span className="truncate">{goal.title}</span>
                <Link
                  href={`/goals/${goal.id}`}
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
