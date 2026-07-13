import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Flame, Pencil } from "lucide-react";
import { getHabitsWithCompletions } from "@/server/queries/habits";
import { toISODate, todayISO } from "@/domain/dates";
import { isDueOn } from "@/domain/recurrence";
import { successRate, weeklyProgress } from "@/domain/scoring";
import { computeStreak } from "@/domain/streaks";
import { weeklyHistory } from "@/domain/history";
import { percentLabel, recurrenceLabel, streakLabel } from "@/lib/labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckButton } from "@/components/habits/check-button";
import { HabitWeeksChart } from "@/components/habits/habit-weeks-chart";

export const metadata: Metadata = { title: "Gewohnheit — Vision" };

export default async function HabitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const all = await getHabitsWithCompletions();
  const item = all.find((h) => h.habit.id === id);
  if (!item) notFound();
  const { habit, completedDates } = item;

  const today = todayISO();
  const doneToday = completedDates.includes(today);
  const streak = computeStreak(habit.recurrence, completedDates, today);
  const week = weeklyProgress(habit.recurrence, completedDates, today);
  const rate30 = successRate(
    habit.recurrence,
    completedDates,
    today,
    toISODate(new Date(habit.createdAt)),
  );
  const history = weeklyHistory(habit.recurrence, completedDates, today, 12);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{habit.name}</h1>
          <p className="text-sm text-muted-foreground">
            {recurrenceLabel(habit.recurrence)}
            {habit.description ? ` · ${habit.description}` : ""}
          </p>
        </div>
        <Link
          href={`/habits/${habit.id}/edit`}
          aria-label="Gewohnheit bearbeiten"
          className="mt-1 shrink-0 p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Pencil className="size-4" aria-hidden />
        </Link>
      </header>

      {isDueOn(habit.recurrence, today) && !habit.archivedAt ? (
        <div className="flex items-center gap-4 rounded-xl border border-border px-4 py-3">
          <CheckButton
            habitId={habit.id}
            date={today}
            done={doneToday}
            label={habit.name}
          />
          <p className="text-sm text-muted-foreground">
            {doneToday ? "Heute erledigt" : "Heute noch offen"} · {week.done}/
            {week.target} diese Woche
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="flex items-center justify-center gap-1 text-lg font-semibold">
              <Flame className="size-4 text-primary" aria-hidden />
              {streakLabel(streak)}
            </p>
            <p className="text-xs text-muted-foreground">Streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-lg font-semibold">{percentLabel(rate30)}</p>
            <p className="text-xs text-muted-foreground">
              Erfolgsquote (30 Tage)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Letzte 12 Wochen</CardTitle>
        </CardHeader>
        <CardContent>
          <HabitWeeksChart history={history} />
          <p className="mt-2 text-xs text-muted-foreground">
            Balken = erledigte Einheiten pro Woche · gestrichelte Linie =
            Wochensoll · laufende Woche heller
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
