import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/server/actions/auth";
import { getHabitsWithCompletions } from "@/server/queries/habits";
import { getFocusForDate } from "@/server/queries/focus";
import {
  getOrCreateCoachSettings,
  getPlanRange,
  getShiftMap,
  getWeekActuals,
  getWeekPlannedKm,
} from "@/server/queries/coach";
import { getGoalsWithMilestones } from "@/server/queries/goals";
import { getMetricSeries } from "@/server/queries/fitness";
import { getDaySignals } from "@/server/queries/readiness";
import { adjustSession } from "@/domain/readiness";
import { diffDaysISO, formatLongDate, todayISO, weekStartISO } from "@/domain/dates";
import { phaseForWeek } from "@/domain/coach";
import { isDueOn } from "@/domain/recurrence";
import { overallWeeklyProgress, weeklyProgress } from "@/domain/scoring";
import { recurrenceLabel } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { CheckButton } from "@/components/habits/check-button";
import { FocusCard } from "@/components/dashboard/focus-card";
import { ShiftContext } from "@/components/dashboard/shift-context";
import { TodayTrainingCard } from "@/components/dashboard/today-training";
import { ReadinessCheck } from "@/components/dashboard/readiness-check";
import { WeekCard } from "@/components/dashboard/week-card";
import { ActiveGoalCard } from "@/components/dashboard/active-goal";
import { QuickLog } from "@/components/dashboard/quick-log";

export const metadata: Metadata = { title: "Heute — Vision" };

export default async function DashboardPage() {
  const today = todayISO();
  const currentWeek = weekStartISO(today);
  const [
    all,
    focus,
    todayPlan,
    signals,
    shiftMap,
    settings,
    weekPlannedKm,
    weekActuals,
    goals,
    weightSeries,
    sleepSeries,
  ] = await Promise.all([
    getHabitsWithCompletions(),
    getFocusForDate(today),
    getPlanRange(today, today),
    getDaySignals(today),
    getShiftMap(today, today),
    getOrCreateCoachSettings(),
    getWeekPlannedKm(currentWeek),
    getWeekActuals(currentWeek),
    getGoalsWithMilestones(),
    getMetricSeries("weight", today),
    getMetricSeries("sleep", today),
  ]);

  // 2.1 Schicht-Kontext
  const shiftToday = shiftMap[today];

  // 2.3 Heute fällige Habits
  const active = all.filter(({ habit }) => !habit.archivedAt);
  const dueToday = active.filter(({ habit, completedDates }) => {
    if (!isDueOn(habit.recurrence, today)) return false;
    if (habit.recurrence.type !== "timesPerWeek") return true;
    const week = weeklyProgress(habit.recurrence, completedDates, today);
    return week.done < week.target || completedDates.includes(today);
  });
  const sortedDue = [...dueToday].sort(
    (a, b) =>
      Number(a.completedDates.includes(today)) -
      Number(b.completedDates.includes(today)),
  );
  const openCount = dueToday.filter(
    ({ completedDates }) => !completedDates.includes(today),
  ).length;

  // 2.4 Trainingseinheit (nur mit bekannter Schicht — nichts raten)
  const todaySession = shiftToday ? todayPlan[0] : undefined;
  const adjusted = todaySession
    ? adjustSession(todaySession, signals)
    : undefined;

  // 2.6 Wochenfortschritt
  const weekIndex = Math.max(
    Math.round(diffDaysISO(settings.startWeek, currentWeek) / 7),
    0,
  );
  const isStartblock = phaseForWeek(weekIndex) === "startblock";
  const habitsWeek = overallWeeklyProgress(
    active.map(({ habit, completedDates }) => ({
      recurrence: habit.recurrence,
      completedDates,
    })),
    today,
  );

  // 2.7 Ein Hauptziel: höchste Priorität, dann nächste Deadline
  const order = { high: 0, medium: 1, low: 2 } as const;
  const mainGoal = goals
    .filter((g) => g.goal.status === "active")
    .sort(
      (a, b) =>
        order[a.goal.priority] - order[b.goal.priority] ||
        (a.goal.deadline ?? "9999").localeCompare(b.goal.deadline ?? "9999"),
    )[0];

  return (
    <div className="space-y-5">
      <header className="space-y-1.5">
        <div className="flex items-start justify-between">
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
        </div>
        <ShiftContext shift={shiftToday} />
      </header>

      <FocusCard key={focus ?? "none"} initialFocus={focus} />

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
      ) : dueToday.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            {openCount === 0
              ? "Alles erledigt — stark."
              : `Heute fällig (${openCount} offen)`}
          </h2>
          {sortedDue.map(({ habit, completedDates }) => {
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
      ) : null}

      {todaySession && adjusted ? (
        <TodayTrainingCard session={todaySession} adjusted={adjusted} />
      ) : null}

      <ReadinessCheck value={signals.readiness} />

      <WeekCard
        isStartblock={isStartblock}
        runCount={weekActuals.runCount}
        runTarget={3}
        kmActual={weekActuals.km}
        kmPlanned={weekPlannedKm}
        habits={habitsWeek}
      />

      {mainGoal ? <ActiveGoalCard item={mainGoal} today={today} /> : null}

      <QuickLog
        weightToday={weightSeries.find((p) => p.date === today)?.value}
        sleepToday={sleepSeries.find((p) => p.date === today)?.value}
      />
    </div>
  );
}
