import Link from "next/link";
import { ChevronRight, Flame } from "lucide-react";
import type { HabitWithCompletions } from "@/server/queries/habits";
import { toISODate, todayISO } from "@/domain/dates";
import { isDueOn } from "@/domain/recurrence";
import { successRate, weeklyProgress } from "@/domain/scoring";
import { computeStreak } from "@/domain/streaks";
import { percentLabel, recurrenceLabel, streakLabel } from "@/lib/labels";
import { Card, CardContent } from "@/components/ui/card";
import { CheckButton } from "./check-button";

export function HabitCard({ item }: { item: HabitWithCompletions }) {
  const { habit, completedDates } = item;
  const today = todayISO();
  const doneToday = completedDates.includes(today);
  const streak = computeStreak(habit.recurrence, completedDates, today);
  const week = weeklyProgress(habit.recurrence, completedDates, today);
  const rate = successRate(
    habit.recurrence,
    completedDates,
    today,
    // createdAt ist ein UTC-Zeitstempel — erst in den Berlin-Kalendertag
    // umrechnen, sonst zählt um Mitternacht ein nie fälliger Tag mit.
    toISODate(new Date(habit.createdAt)),
  );
  const checkable = isDueOn(habit.recurrence, today);

  return (
    <Card>
      <CardContent className="flex items-center gap-4">
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
          <p className="text-xs text-muted-foreground">
            {recurrenceLabel(habit.recurrence)} · {week.done}/{week.target}{" "}
            diese Woche
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Flame className="size-3.5 text-primary" aria-hidden />
              {streakLabel(streak)}
            </span>
            <span>{percentLabel(rate)} in 30 Tagen</span>
          </div>
        </div>

        <Link
          href={`/habits/${habit.id}`}
          aria-label={`${habit.name} — Details und Verlauf`}
          className="p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}
