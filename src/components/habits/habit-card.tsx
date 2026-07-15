import Link from "next/link";
import { ChevronRight, Flame } from "lucide-react";
import type { HabitWithCompletions } from "@/server/queries/habits";
import type { ShiftLookup } from "@/domain/recurrence";
import { toISODate, todayISO } from "@/domain/dates";
import { isDueOn, shiftOn } from "@/domain/recurrence";
import { successRate, weeklyProgress } from "@/domain/scoring";
import { computeStreak } from "@/domain/streaks";
import { percentLabel, recurrenceLabel, streakLabel } from "@/lib/labels";
import { Card, CardContent } from "@/components/ui/card";
import { CheckButton } from "./check-button";
import { SkipButton } from "./skip-button";

export function HabitCard({
  item,
  shifts,
}: {
  item: HabitWithCompletions;
  shifts?: ShiftLookup;
}) {
  const { habit, completions } = item;
  const today = todayISO();
  const todayEntry = completions.find((c) => c.date === today);
  const doneToday = todayEntry?.status === "done";
  const skippedToday = todayEntry?.status === "skipped";

  const streak = computeStreak(habit.recurrence, completions, today, shifts);
  const week = weeklyProgress(habit.recurrence, completions, today, shifts);
  // Erfolgsquote ist die Hauptmetrik (Spec 2.6).
  const rate7 = successRate(
    habit.recurrence,
    completions,
    today,
    toISODate(new Date(habit.createdAt)),
    7,
    shifts,
  );
  const rate30 = successRate(
    habit.recurrence,
    completions,
    today,
    toISODate(new Date(habit.createdAt)),
    30,
    shifts,
  );
  const checkable = isDueOn(habit.recurrence, today, shiftOn(shifts, today));

  return (
    <Card>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-4">
          {checkable ? (
            <CheckButton
              habitId={habit.id}
              date={today}
              done={doneToday}
              label={habit.name}
            />
          ) : (
            <div className="size-11 shrink-0" aria-hidden />
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{habit.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {habit.cue}
            </p>
          </div>

          <Link
            href={`/habits/${habit.id}`}
            aria-label={`${habit.name} — Details und Verlauf`}
            className="p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {/* Hauptmetrik: Erfolgsquote */}
          <span className="font-medium text-foreground">
            {percentLabel(rate7)} · 7T
          </span>
          <span>{percentLabel(rate30)} · 30T</span>
          <span>
            {recurrenceLabel(habit.recurrence)} — {week.done}/{week.target} Woche
          </span>
          {/* Sekundär: Streak, klein */}
          {streak.value > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Flame className="size-3 text-primary/70" aria-hidden />
              {streakLabel(streak)}
            </span>
          ) : null}
          {checkable ? (
            <SkipButton
              habitId={habit.id}
              date={today}
              skipped={skippedToday}
              label={habit.name}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
