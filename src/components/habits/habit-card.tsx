import Link from "next/link";
import { ChevronRight, Flame } from "lucide-react";
import type { HabitWithCompletions } from "@/server/queries/habits";
import type { ShiftLookup } from "@/domain/recurrence";
import { toISODate, todayISO } from "@/domain/dates";
import { isDueOn, shiftOn } from "@/domain/recurrence";
import { successRate, weeklyProgress } from "@/domain/scoring";
import { computeStreak } from "@/domain/streaks";
import { percentLabel, recurrenceLabel, streakLabel } from "@/lib/labels";
import { habitStep, isMeasureHabit } from "@/lib/habit-ui";
import { Card, CardContent } from "@/components/ui/card";
import { Ring } from "@/components/ui/ring";
import { CheckButton } from "./check-button";
import { SkipButton } from "./skip-button";
import { ValueStepper } from "./value-stepper";

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
  const measure = isMeasureHabit(habit);

  const streak = computeStreak(habit.recurrence, completions, today, shifts);
  const week = weeklyProgress(habit.recurrence, completions, today, shifts);
  const since = toISODate(new Date(habit.createdAt));
  const rate7 = successRate(habit.recurrence, completions, today, since, 7, shifts);
  const rate30 = successRate(habit.recurrence, completions, today, since, 30, shifts);
  const checkable = isDueOn(habit.recurrence, today, shiftOn(shifts, today));

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          {checkable && !measure ? (
            <CheckButton
              habitId={habit.id}
              date={today}
              done={doneToday}
              label={habit.name}
            />
          ) : (
            <span
              className="size-2.5 shrink-0 rounded-full bg-primary/70"
              aria-hidden
            />
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{habit.name}</p>
            <p className="truncate text-xs text-muted-foreground">{habit.cue}</p>
          </div>

          {/* Wochen-Tage immer sichtbar als Ring */}
          <Ring
            value={week.done}
            max={Math.max(week.target, 1)}
            size={44}
            stroke={5}
            ariaLabel={`${week.done} von ${week.target} diese Woche`}
          >
            <span className="text-[11px] font-semibold leading-none">
              {week.done}/{week.target}
            </span>
          </Ring>

          <Link
            href={`/habits/${habit.id}`}
            aria-label={`${habit.name} — Details und Verlauf`}
            className="-mr-1 p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>

        {measure && checkable ? (
          <ValueStepper
            habitId={habit.id}
            date={today}
            value={todayEntry?.value ?? 0}
            target={habit.targetValue ?? 0}
            min={habit.minValue}
            unit={habit.unit}
            step={habitStep(habit.targetValue ?? 1, habit.unit)}
            label={habit.name}
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {percentLabel(rate7)} · 7T
          </span>
          <span>{percentLabel(rate30)} · 30T</span>
          {streak.value > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Flame className="size-3 text-primary/70" aria-hidden />
              {streakLabel(streak)}
            </span>
          ) : null}
          <span className="ml-auto">{recurrenceLabel(habit.recurrence)}</span>
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
