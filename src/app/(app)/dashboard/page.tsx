import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/server/actions/auth";
import { loadDashboard } from "@/server/queries/dashboard";
import { adjustSession } from "@/domain/readiness";
import {
  USER_TIME_ZONE,
  diffDaysISO,
  formatLongDate,
  todayISO,
  weekStartISO,
} from "@/domain/dates";
import { phaseForWeek } from "@/domain/coach";
import { isDueOn, shiftOn } from "@/domain/recurrence";
import { overallWeeklyProgress, weeklyProgress } from "@/domain/scoring";
import { greetingFor } from "@/lib/greeting";
import { recurrenceLabel } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { CheckButton } from "@/components/habits/check-button";
import { SkipButton } from "@/components/habits/skip-button";
import { FocusCard } from "@/components/dashboard/focus-card";
import { ShiftContext } from "@/components/dashboard/shift-context";
import { TodayTrainingCard } from "@/components/dashboard/today-training";
import { RecoveryCard } from "@/components/dashboard/recovery-card";
import { WeekCard } from "@/components/dashboard/week-card";
import { ActiveGoalCard } from "@/components/dashboard/active-goal";
import { QuickLog } from "@/components/dashboard/quick-log";

export const metadata: Metadata = { title: "Heute — Vision" };

export default async function DashboardPage() {
  const today = todayISO();
  const currentWeek = weekStartISO(today);
  const {
    habits: all,
    goals,
    focus,
    todaySession: planToday,
    signals,
    shifts,
    settings,
    weekPlannedKm,
    weekActuals,
    metricsToday,
  } = await loadDashboard(today, currentWeek);

  // 2.1 Schicht-Kontext
  const shiftToday = shiftOn(shifts, today);
  const statusToday = (completions: { date: string; status: string }[]) =>
    completions.find((c) => c.date === today)?.status;

  // 2.3 Heute fällige Habits
  const active = all.filter(({ habit }) => !habit.archivedAt);
  const dueToday = active.filter(({ habit, completions }) => {
    if (!isDueOn(habit.recurrence, today, shiftToday)) return false;
    if (habit.recurrence.type !== "timesPerWeek") return true;
    const week = weeklyProgress(habit.recurrence, completions, today, shifts);
    return week.done < week.target || statusToday(completions) !== undefined;
  });
  const sortedDue = [...dueToday].sort(
    (a, b) =>
      Number(statusToday(a.completions) !== undefined) -
      Number(statusToday(b.completions) !== undefined),
  );
  const openCount = dueToday.filter(
    ({ completions }) => statusToday(completions) === undefined,
  ).length;

  // 2.4 Trainingseinheit (nur mit bekannter Schicht — nichts raten)
  const todaySession = shiftToday ? planToday : undefined;
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
    active.map(({ habit, completions }) => ({
      recurrence: habit.recurrence,
      completions,
    })),
    today,
    shifts,
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

  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: USER_TIME_ZONE,
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );

  return (
    <div className="space-y-5">
      <header className="space-y-2 rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card px-4 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {greetingFor(hour)}
            </h1>
            <p className="text-sm capitalize text-muted-foreground">
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
          {sortedDue.map(({ habit, completions }) => {
            const status = statusToday(completions);
            const week = weeklyProgress(
              habit.recurrence,
              completions,
              today,
              shifts,
            );
            return (
              <Card key={habit.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  <CheckButton
                    habitId={habit.id}
                    date={today}
                    done={status === "done"}
                    label={habit.name}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{habit.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {status === "skipped"
                        ? "Übersprungen"
                        : `${recurrenceLabel(habit.recurrence)} · ${week.done}/${week.target} Woche`}
                    </p>
                  </div>
                  <SkipButton
                    habitId={habit.id}
                    date={today}
                    skipped={status === "skipped"}
                    label={habit.name}
                  />
                </CardContent>
              </Card>
            );
          })}
        </section>
      ) : null}

      {todaySession && adjusted ? (
        <TodayTrainingCard session={todaySession} adjusted={adjusted} />
      ) : null}

      <RecoveryCard
        recoveryPct={metricsToday.recovery}
        sleepHours={metricsToday.sleep}
        readiness={signals.readiness}
      />

      <WeekCard
        isStartblock={isStartblock}
        runCount={weekActuals.runCount}
        runTarget={3}
        kmActual={weekActuals.km}
        kmPlanned={weekPlannedKm}
        habits={habitsWeek}
      />

      <div className="space-y-1">
        {mainGoal ? <ActiveGoalCard item={mainGoal} today={today} /> : null}
        <div className="text-right">
          <Link
            href="/goals"
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {mainGoal ? "Alle Ziele" : "Ziele verwalten"}
          </Link>
        </div>
      </div>

      <QuickLog
        weightToday={metricsToday.weight}
        sleepToday={metricsToday.sleep}
        recoveryToday={metricsToday.recovery}
        hrvToday={metricsToday.hrv}
        rhrToday={metricsToday.rhr}
        stepsToday={metricsToday.steps}
      />
    </div>
  );
}
