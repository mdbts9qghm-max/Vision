import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  LogOut,
  PlusCircle,
  Smile,
  Sun,
  TrendingUp,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { FocusCard } from "@/components/dashboard/focus-card";
import { SectionLabel } from "@/components/dashboard/section-label";
import { ShiftContext } from "@/components/dashboard/shift-context";
import { TodayHabits } from "@/components/dashboard/today-habits";
import { TodayTrainingCard } from "@/components/dashboard/today-training";
import { RecoveryCard } from "@/components/dashboard/recovery-card";
import { WeekCard } from "@/components/dashboard/week-card";
import { ActiveGoalCard } from "@/components/dashboard/active-goal";
import { QuickLog } from "@/components/dashboard/quick-log";
import { CheckinCard } from "@/components/dashboard/checkin-card";

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
    checkinToday,
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

      {/* Erholung — wie geht es mir heute? */}
      <section className="space-y-2">
        <SectionLabel icon={<Activity className="size-3.5" aria-hidden />}>
          Erholung
        </SectionLabel>
        <RecoveryCard
          recoveryPct={metricsToday.recovery}
          sleepHours={metricsToday.sleep}
          hrvToday={metricsToday.hrv}
          rhrToday={metricsToday.rhr}
          readiness={signals.readiness}
        />
      </section>

      {/* Befinden — mentaler Check-in */}
      <section className="space-y-2">
        <SectionLabel icon={<Smile className="size-3.5" aria-hidden />}>
          Befinden
        </SectionLabel>
        <CheckinCard initial={checkinToday} />
      </section>

      {/* Heute — was steht an? */}
      <section className="space-y-3">
        <SectionLabel
          icon={<Sun className="size-3.5" aria-hidden />}
          action={
            dueToday.length > 0 ? (
              <span className="text-xs font-medium text-muted-foreground">
                {openCount === 0 ? "alles erledigt ✓" : `${openCount} offen`}
              </span>
            ) : null
          }
        >
          Heute
        </SectionLabel>

        {todaySession && adjusted ? (
          <TodayTrainingCard session={todaySession} adjusted={adjusted} />
        ) : null}

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
          <TodayHabits items={sortedDue} today={today} shifts={shifts} />
        ) : (
          <p className="px-1 text-sm text-muted-foreground">
            Heute ist keine Gewohnheit fällig.
          </p>
        )}
      </section>

      {/* Fortschritt — wo stehe ich? */}
      <section className="space-y-3">
        <SectionLabel
          icon={<TrendingUp className="size-3.5" aria-hidden />}
          action={
            <Link
              href="/goals"
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {mainGoal ? "Alle Ziele" : "Ziele verwalten"}
            </Link>
          }
        >
          Fortschritt
        </SectionLabel>
        <WeekCard
          isStartblock={isStartblock}
          runCount={weekActuals.runCount}
          runTarget={3}
          kmActual={weekActuals.km}
          kmPlanned={weekPlannedKm}
          habits={habitsWeek}
        />
        {mainGoal ? <ActiveGoalCard item={mainGoal} today={today} /> : null}
      </section>

      {/* Erfassen */}
      <section className="space-y-2">
        <SectionLabel icon={<PlusCircle className="size-3.5" aria-hidden />}>
          Erfassen
        </SectionLabel>
        <QuickLog
          weightToday={metricsToday.weight}
          stepsToday={metricsToday.steps}
        />
      </section>
    </div>
  );
}
