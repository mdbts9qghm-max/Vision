import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/server/actions/auth";
import { getHabitsWithCompletions } from "@/server/queries/habits";
import { formatLongDate, todayISO } from "@/domain/dates";
import { isDueOn } from "@/domain/recurrence";
import { weeklyProgress } from "@/domain/scoring";
import { recurrenceLabel } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { CheckButton } from "@/components/habits/check-button";

export const metadata: Metadata = { title: "Heute — Vision" };

export default async function DashboardPage() {
  const today = todayISO();
  const all = await getHabitsWithCompletions();

  const dueToday = all
    .filter(({ habit }) => !habit.archivedAt)
    .filter(({ habit, completedDates }) => {
      if (!isDueOn(habit.recurrence, today)) return false;
      if (habit.recurrence.type !== "timesPerWeek") return true;
      // Flexible Habits verschwinden, sobald das Wochensoll steht —
      // außer die heutige Erledigung selbst soll zurücknehmbar bleiben.
      const week = weeklyProgress(habit.recurrence, completedDates, today);
      return week.done < week.target || completedDates.includes(today);
    });
  const openCount = dueToday.filter(
    ({ completedDates }) => !completedDates.includes(today),
  ).length;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Heute</h1>
          <p className="text-sm text-muted-foreground">
            {formatLongDate(today)}
          </p>
        </div>
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            aria-label="Abmelden"
          >
            <LogOut />
          </Button>
        </form>
      </header>

      {all.filter(({ habit }) => !habit.archivedAt).length === 0 ? (
        <EmptyState
          title="Noch keine Gewohnheiten"
          description="Sobald du Gewohnheiten angelegt hast, hakst du sie hier mit einem Tap ab."
          action={
            <Button asChild>
              <Link href="/habits/new">Erste Gewohnheit anlegen</Link>
            </Button>
          }
        />
      ) : dueToday.length === 0 ? (
        <EmptyState
          title="Heute ist nichts fällig"
          description="Alle Wochenziele sind erreicht oder heute steht nichts an. Gute Gelegenheit für Erholung."
        />
      ) : (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            {openCount === 0
              ? "Alles erledigt — stark."
              : `Heute fällig (${openCount} offen)`}
          </h2>
          {dueToday.map(({ habit, completedDates }) => {
            const week = weeklyProgress(habit.recurrence, completedDates, today);
            return (
              <Card key={habit.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  <CheckButton
                    habitId={habit.id}
                    date={today}
                    done={completedDates.includes(today)}
                    label={habit.name}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{habit.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {recurrenceLabel(habit.recurrence)} · {week.done}/
                      {week.target} diese Woche
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}
