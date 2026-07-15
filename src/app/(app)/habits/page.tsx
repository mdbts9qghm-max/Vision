import type { Metadata } from "next";
import Link from "next/link";
import { Plus, TriangleAlert } from "lucide-react";
import { getHabitsWithCompletions } from "@/server/queries/habits";
import { getShiftMap } from "@/server/queries/coach";
import { addDaysISO, todayISO } from "@/domain/dates";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { HabitCard } from "@/components/habits/habit-card";

export const metadata: Metadata = { title: "Gewohnheiten — Vision" };

const ACTIVE_LIMIT = 5;

export default async function HabitsPage() {
  const today = todayISO();
  const [all, shifts] = await Promise.all([
    getHabitsWithCompletions(),
    getShiftMap(addDaysISO(today, -34), today),
  ]);
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

      {active.length > ACTIVE_LIMIT ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0 text-amber-500"
            aria-hidden
          />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">
              {active.length} aktive Gewohnheiten.
            </span>{" "}
            Eine Gewohnheit braucht im Schnitt ~66 Tage bis zur Routine — mehr
            als 5 parallel drücken die Erfolgsquote. Erwäge, ein paar zu
            archivieren, bis sie sitzen.
          </p>
        </div>
      ) : null}

      {active.length === 0 ? (
        <EmptyState
          title="Noch keine Gewohnheiten"
          description="Beginne mit 3–5 Gewohnheiten, jede mit einem konkreten Auslöser. Abhaken dauert danach genau einen Tap."
          action={
            <Button asChild>
              <Link href="/habits/new">Erste Gewohnheit anlegen</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {active.map((item) => (
            <HabitCard key={item.habit.id} item={item} shifts={shifts} />
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
