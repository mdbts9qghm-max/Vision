import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/server/actions/auth";
import { getHabitsWithCompletions } from "@/server/queries/habits";
import { getFocusForDate } from "@/server/queries/focus";
import { getPlanRange } from "@/server/queries/coach";
import { formatLongDate, todayISO } from "@/domain/dates";
import { isDueOn } from "@/domain/recurrence";
import { overallWeeklyProgress, weeklyProgress } from "@/domain/scoring";
import { recurrenceLabel } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { CheckButton } from "@/components/habits/check-button";
import { FocusCard } from "@/components/dashboard/focus-card";
import { WeekProgressCard } from "@/components/dashboard/week-progress";
import { TodayTrainingCard } from "@/components/dashboard/today-training";

export const metadata: Metadata = { title: "Heute — Vision" };

export default async function DashboardPage() {
  const today = todayISO();
  const [all, focus, todayPlan] = await Promise.all([
    getHabitsWithCompletions(),
    getFocusForDate(today),
    getPlanRange(today, today),
  ]);
  const todaySession = todayPlan[0];

  const active = all.filter(({ habit }) => !habit.archivedAt);
  const weekTotal = overallWeeklyProgress(
    active.map(({ habit, completedDates }) => ({
      recurrence: habit.recurrence,
      completedDates,
    })),
    today,
  );

  const dueToday = active.filter(({ habit, completedDates }) => {
    if (!isDueOn(habit.recurrence, today)) return false;
    if (habit.recurrence.type !== "timesPerWeek") return true;
    // Flexible Habits verschwinden, sobald das Wochensoll steht —
    // außer die heutige Erledigung selbst soll zurücknehmbar bleiben.
    const week = weeklyProgress(habit.recurrence, completedDates, today);
    return week.done < week.target || completedDates.includes(today);
  });
  // Offene zuerst, erledigte darunter — Reihenfolge innerhalb stabil.
  const sorted = [...dueToday].sort(
    (a, b) =>
      Number(a.completedDates.includes(today)) -
      Number(b.completedDates.includes(today)),
  );
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

      {active.length === 0 ? (
        <EmptyState
          title="Noch keine Gewohnheiten"
          description="Sobald du Gewohnheiten angelegt hast, hakst du sie hier mit einem Tap ab."
          action={
            <Button asChild>
              <Link href="/habits/new">Erste Gewohnheit anlegen</Link>
            </Button>
          }
        />
      ) : (
        <>
          <FocusCard key={focus ?? "none"} initialFocus={focus} />
          {todaySession ? <TodayTrainingCard session={todaySession} /> : null}
          <WeekProgressCard progress={weekTotal} />

          {dueToday.length === 0 ? (
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
              {sorted.map(({ habit, completedDates }) => {
                const week = weeklyProgress(
                  habit.recurrence,
                  completedDates,
                  today,
                );
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
        </>
      )}
    </div>
  );
}
