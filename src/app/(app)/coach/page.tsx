import type { Metadata } from "next";
import { addDaysISO, diffDaysISO, todayISO, weekStartISO } from "@/domain/dates";
import { PHASE_LABEL, phaseForWeek } from "@/domain/coach";
import { loadCoachPage } from "@/server/queries/coach";
import { regeneratePlan } from "@/server/actions/coach";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlanDay } from "@/components/coach/plan-day";

export const metadata: Metadata = { title: "Coach — Vision" };

async function regenerateAction() {
  "use server";
  await regeneratePlan();
}

export default async function CoachPage() {
  const today = todayISO();
  const horizon = addDaysISO(today, 13);
  const currentWeek = weekStartISO(today);

  const { settings, shiftMap, plan, weekPlannedKm, weekActuals } =
    await loadCoachPage(today, horizon, currentWeek);

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
        {days.map((d) => (
          <PlanDay
            key={d}
            date={d}
            shift={shiftMap[d]}
            session={sessionByDate.get(d)}
            isToday={d === today}
          />
        ))}
      </section>
    </div>
  );
}
