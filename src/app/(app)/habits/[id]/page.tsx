import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Flame, Pencil } from "lucide-react";
import { getHabitsWithCompletions } from "@/server/queries/habits";
import { getShiftMap } from "@/server/queries/coach";
import { addDaysISO, toISODate, todayISO } from "@/domain/dates";
import { isDueOn, shiftOn } from "@/domain/recurrence";
import { successRate, weeklyProgress } from "@/domain/scoring";
import { computeStreak } from "@/domain/streaks";
import { weeklyHistory } from "@/domain/history";
import {
  HABIT_CATEGORY_LABEL,
  percentLabel,
  recurrenceLabel,
  streakLabel,
} from "@/lib/labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckButton } from "@/components/habits/check-button";
import { SkipButton } from "@/components/habits/skip-button";
import { HabitWeeksChart } from "@/components/habits/habit-weeks-chart";

export const metadata: Metadata = { title: "Gewohnheit — Vision" };

export default async function HabitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const today = todayISO();
  const [all, shifts] = await Promise.all([
    getHabitsWithCompletions(),
    getShiftMap(addDaysISO(today, -90), today),
  ]);
  const item = all.find((h) => h.habit.id === id);
  if (!item) notFound();
  const { habit, completions } = item;

  const todayEntry = completions.find((c) => c.date === today);
  const doneToday = todayEntry?.status === "done";
  const skippedToday = todayEntry?.status === "skipped";
  const streak = computeStreak(habit.recurrence, completions, today, shifts);
  const week = weeklyProgress(habit.recurrence, completions, today, shifts);
  const since = toISODate(new Date(habit.createdAt));
  const rate7 = successRate(habit.recurrence, completions, today, since, 7, shifts);
  const rate30 = successRate(habit.recurrence, completions, today, since, 30, shifts);
  const history = weeklyHistory(habit.recurrence, completions, today, 12, shifts);
  const dueToday = isDueOn(habit.recurrence, today, shiftOn(shifts, today));

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{habit.name}</h1>
          <p className="text-sm text-muted-foreground">{habit.cue}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {recurrenceLabel(habit.recurrence)}
            {habit.category ? ` · ${HABIT_CATEGORY_LABEL[habit.category]}` : ""}
            {habit.stackedOn ? ` · ${habit.stackedOn}` : ""}
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

      {dueToday && !habit.archivedAt ? (
        <div className="flex items-center gap-4 rounded-xl border border-border px-4 py-3">
          <CheckButton
            habitId={habit.id}
            date={today}
            done={doneToday}
            label={habit.name}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">
              {doneToday
                ? "Heute erledigt"
                : skippedToday
                  ? "Heute bewusst übersprungen"
                  : "Heute noch offen"}{" "}
              · {week.done}/{week.target} diese Woche
            </p>
          </div>
          <SkipButton
            habitId={habit.id}
            date={today}
            skipped={skippedToday}
            label={habit.name}
          />
        </div>
      ) : null}

      {/* Erfolgsquote ist die Hauptmetrik; Streak sekundär. */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-lg font-semibold">{percentLabel(rate7)}</p>
            <p className="text-xs text-muted-foreground">Quote 7 Tage</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-lg font-semibold">{percentLabel(rate30)}</p>
            <p className="text-xs text-muted-foreground">Quote 30 Tage</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="flex items-center justify-center gap-1 text-lg font-semibold">
              <Flame className="size-4 text-primary/70" aria-hidden />
              {streak.value}
            </p>
            <p className="text-xs text-muted-foreground">
              {streakLabel(streak).split(" ")[1]}-Streak
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
