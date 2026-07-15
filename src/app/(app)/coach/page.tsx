import type { Metadata } from "next";
import { addDaysISO, diffDaysISO, todayISO, weekStartISO } from "@/domain/dates";
import { PHASE_LABEL, phaseForWeek } from "@/domain/coach";
import { trailingAverage } from "@/domain/fitness";
import { loadCoachPage } from "@/server/queries/coach";
import { regeneratePlan } from "@/server/actions/coach";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanDay } from "@/components/coach/plan-day";
import { WeightChart } from "@/components/fitness/weight-chart";
import { WorkoutForm } from "@/components/fitness/workout-form";
import { WorkoutList } from "@/components/fitness/workout-list";

const LOGGABLE_KINDS = new Set(["longrun", "run", "easy", "gym", "mobility"]);

export const metadata: Metadata = { title: "Coach — Vision" };

async function regenerateAction() {
  "use server";
  await regeneratePlan();
}

export default async function CoachPage() {
  const today = todayISO();
  const horizon = addDaysISO(today, 13);
  const currentWeek = weekStartISO(today);

  const {
    settings,
    shiftMap,
    plan,
    weekPlannedKm,
    weekActuals,
    weightSeries,
    recentWorkouts,
    loggedDates,
  } = await loadCoachPage(today, horizon, currentWeek);
  const weightTrend = trailingAverage(weightSeries, 7);

  const sessionByDate = new Map(plan.map((s) => [s.date, s]));
  const days = Array.from({ length: 14 }, (_, i) => addDaysISO(today, i));
  const missingShifts = days.filter((d) => !shiftMap[d]).length;

  const weekIndex = Math.max(
    Math.round(diffDaysISO(settings.startWeek, currentWeek) / 7),
    0,
  );
  const phase = phaseForWeek(weekIndex);
  const isStartblock = phase === "startblock";
  const plannedRuns = plan.filter(
    (s) =>
      s.date >= currentWeek &&
      s.date <= addDaysISO(currentWeek, 6) &&
      (s.kind === "longrun" || s.kind === "run" || s.kind === "easy"),
  ).length;
  const runTarget = isStartblock ? 3 : plannedRuns;
  const ratio = isStartblock
    ? Math.min(weekActuals.runCount / Math.max(runTarget, 1), 1)
    : weekPlannedKm > 0
      ? Math.min(weekActuals.km / weekPlannedKm, 1)
      : 0;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Coach</h1>
        <p className="text-sm text-muted-foreground">
          Woche {weekIndex + 1} · Phase: {PHASE_LABEL[phase]}
          {isStartblock
            ? " · Ziel: nach 6 Wochen 30 Min. am Stück laufen"
            : ` · +${settings.progressionPct} % Progression, Deload alle ${settings.deloadEveryWeeks} Wochen`}
        </p>
      </header>

      <Card>
        <CardContent className="space-y-2 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
            <span className="font-medium">Diese Woche</span>
            <span className="text-muted-foreground">
              {isStartblock
                ? `Läufe ${weekActuals.runCount}/${runTarget} · Kraft ${weekActuals.gymCount}×`
                : `${Math.round(weekActuals.km * 10) / 10}/${weekPlannedKm} km · Kraft ${weekActuals.gymCount}×`}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={
              isStartblock ? weekActuals.runCount : Math.round(weekActuals.km)
            }
            aria-valuemin={0}
            aria-valuemax={
              isStartblock
                ? Math.max(runTarget, 1)
                : Math.max(Math.round(weekPlannedKm), 1)
            }
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {isStartblock
              ? "Run-Walk zählt voll: jede geloggte Einheit (außer Kraft) ist ein Lauf. Zone 3+ ist tabu — Talk-Test."
              : "Kilometer zählen aus dem Trainings-Log (Distanz-Feld beim Loggen ausfüllen)."}
          </p>
        </CardContent>
      </Card>

      {plan.length === 0 || missingShifts > 0 ? (
        <Card>
          <CardContent className="space-y-3 py-4">
            <p className="text-sm">
              {missingShifts > 0
                ? `${missingShifts} von 14 Tagen haben noch keine Schicht — trag sie unten ein, dann plane ich diese Tage.`
                : "Noch kein Plan berechnet."}
            </p>
            <form action={regenerateAction}>
              <Button type="submit" variant="outline" className="w-full">
                Plan neu berechnen
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        {days.map((d) => {
          const session = sessionByDate.get(d);
          // Loggbar ist nur der heutige Tag mit trainierbarer Einheit.
          const loggable =
            d === today && !!session && LOGGABLE_KINDS.has(session.kind);
          return (
            <PlanDay
              key={d}
              date={d}
              shift={shiftMap[d]}
              session={session}
              isToday={d === today}
              loggable={loggable}
              logged={loggedDates.has(d)}
            />
          );
        })}
      </section>

      {/* Logbuch: freies Loggen + Historie + Gewichtstrend */}
      <section className="space-y-4 border-t border-border pt-6">
        <h2 className="text-lg font-semibold">Logbuch</h2>

        <Card>
          <CardHeader>
            <CardTitle>Training loggen</CardTitle>
          </CardHeader>
          <CardContent>
            <WorkoutForm />
          </CardContent>
        </Card>

        {recentWorkouts.length > 0 ? (
          <WorkoutList workouts={recentWorkouts} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Noch nichts geloggt. Nutze oben die Erledigt-Taste an der
            heutigen Einheit oder trag frei ein, was du gemacht hast.
          </p>
        )}

        <Card>
          <CardHeader className="flex-row flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <CardTitle>Gewicht</CardTitle>
            {weightTrend.at(-1) ? (
              <span className="text-sm text-muted-foreground">
                Trend: {Math.round((weightTrend.at(-1)?.value ?? 0) * 10) / 10}{" "}
                kg
              </span>
            ) : null}
          </CardHeader>
          <CardContent>
            {weightSeries.length >= 2 ? (
              <WeightChart daily={weightSeries} trend={weightTrend} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Ab zwei Messungen erscheint hier dein Verlauf mit
                7-Tage-Trendlinie. Gewicht trägst du im Heute-Tab ein.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
