import type { HabitWithCompletions } from "@/server/queries/habits";
import type { ShiftLookup } from "@/domain/recurrence";
import { weeklyProgress } from "@/domain/scoring";
import { habitStep, isMeasureHabit } from "@/lib/habit-ui";
import { Card, CardContent } from "@/components/ui/card";
import { CheckButton } from "@/components/habits/check-button";
import { SkipButton } from "@/components/habits/skip-button";
import { ValueStepper } from "@/components/habits/value-stepper";

/** Kompakte Liste der heute fälligen Gewohnheiten — eine Karte, Zeilen. */
export function TodayHabits({
  items,
  today,
  shifts,
}: {
  items: HabitWithCompletions[];
  today: string;
  shifts?: ShiftLookup;
}) {
  return (
    <Card>
      <CardContent className="divide-y divide-border p-0">
        {items.map(({ habit, completions }) => {
          const entry = completions.find((c) => c.date === today);
          const status = entry?.status;
          const week = weeklyProgress(habit.recurrence, completions, today, shifts);
          const measure = isMeasureHabit(habit);
          return (
            <div key={habit.id} className="px-4 py-2.5">
              <div className="flex items-center gap-3">
                {measure ? (
                  <span
                    className="size-2 shrink-0 rounded-full bg-primary/70"
                    aria-hidden
                  />
                ) : (
                  <CheckButton
                    habitId={habit.id}
                    date={today}
                    done={status === "done"}
                    label={habit.name}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{habit.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {status === "skipped"
                      ? "Übersprungen"
                      : `${week.done}/${week.target} diese Woche`}
                  </p>
                </div>
                <SkipButton
                  habitId={habit.id}
                  date={today}
                  skipped={status === "skipped"}
                  label={habit.name}
                />
              </div>
              {measure ? (
                <div className="mt-2 pl-5">
                  <ValueStepper
                    habitId={habit.id}
                    date={today}
                    value={entry?.value ?? 0}
                    target={habit.targetValue ?? 0}
                    min={habit.minValue}
                    unit={habit.unit}
                    step={habitStep(habit.targetValue ?? 1, habit.unit)}
                    label={habit.name}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
