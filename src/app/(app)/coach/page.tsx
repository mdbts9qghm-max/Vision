import type { Metadata } from "next";
import { addDaysISO, diffDaysISO, todayISO, weekStartISO } from "@/domain/dates";
import { PHASE_LABEL, phaseForWeek } from "@/domain/coach";
import { trailingAverage } from "@/domain/fitness";
import { loadCoachPage } from "@/server/queries/coach";
import { regeneratePlan, restartProgram } from "@/server/actions/coach";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Ring } from "@/components/ui/ring";
import { CoachCalendar, type CalDay } from "@/components/coach/coach-calendar";
import { RoadToUltra } from "@/components/coach/road-to-ultra";
import { WeightChart } from "@/components/fitness/weight-chart-lazy";
import { WeeklyKmChart } from "@/components/fitness/weekly-km-chart-lazy";
import { WorkoutForm } from "@/components/fitness/workout-form";
import { WorkoutList } from "@/components/fitness/workout-list";

const LOGGABLE_KINDS = new Set(["longrun", "run", "easy", "gym", "mobility"]);

export const metadata: Metadata = { title: "Coach — Vision" };

async function regenerateAction() {
  "use server";
  await regeneratePlan();
}

async function restartAction() {
  "use server";
  await restartProgram();
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
    longestRunKm,
    totalRunKm,
    weeklyKm,
  } = await loadCoachPage(today, horizon, currentWeek);
  const weightTrend = trailingAverage(weightSeries, 7);

  // Kennzahlen zum Volumen-Diagramm: Schnitt der abgeschlossenen Wochen und
  // der Vergleich der laufenden Woche zur Vorwoche.
  const doneWeeks = weeklyKm.filter((w) => !w.isCurrent);
  const avgWeekKm =
    doneWeeks.length > 0
      ? Math.round(
          (doneWeeks.reduce((s, w) => s + w.km, 0) / doneWeeks.length) * 10,
        ) / 10
      : 0;
  const prevWeekKm = doneWeeks.at(-1)?.km ?? 0;
  const kmDelta = Math.round((weekActuals.km - prevWeekKm) * 10) / 10;
  const hasVolume = weeklyKm.some((w) => w.km > 0);

  const sessionByDate = new Map(plan.map((s) => [s.date, s]));
  const days = Array.from({ length: 14 }, (_, i) => addDaysISO(today, i));
  const missingShifts = days.filter((d) => !shiftMap[d]).length;

  // Kalender-Raster: volle Mo–So-Wochen, die das 14-Tage-Fenster abdecken.
  const gridStart = weekStartISO(today);
  const lastWeek = weekStartISO(horizon);
  const weeks: CalDay[][] = [];
  for (let ws = gridStart; ws <= lastWeek; ws = addDaysISO(ws, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, i) => {
        const d = addDaysISO(ws, i);
        const active = d >= today && d <= horizon;
        const session = sessionByDate.get(d) ?? null;
        return {
          date: d,
          active,
          isToday: d === today,
          shift: shiftMap[d],
          session,
          loggable:
            active && d === today && !!session && LOGGABLE_KINDS.has(session.kind),
          logged: loggedDates.has(d),
        };
      }),
    );
  }

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

  return (
    <div className="space-y-6">
      <header className="space-y-2 relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/20 via-primary/6 to-transparent px-4 py-5 shadow-[0_12px_36px_-20px_var(--primary)] backdrop-blur-xl">
        <h1 className="text-2xl font-bold tracking-tight">Coach</h1>
        <p className="text-sm text-muted-foreground">
          Woche {weekIndex + 1} · Phase: {PHASE_LABEL[phase]}
          {isStartblock
            ? " · Ziel: sanfter Run-Walk-Aufbau — Schritt für Schritt mehr am Stück laufen"
            : ` · +${settings.progressionPct} % Progression, Deload alle ${settings.deloadEveryWeeks} Wochen`}
        </p>
        <form action={restartAction}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="mt-1 border-primary/50"
          >
            Programm ab dieser Woche starten (Woche 1)
          </Button>
        </form>
      </header>

      <RoadToUltra longestRunKm={longestRunKm} totalRunKm={totalRunKm} />

      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <Ring
            value={isStartblock ? weekActuals.runCount : weekActuals.km}
            max={isStartblock ? Math.max(runTarget, 1) : Math.max(weekPlannedKm, 1)}
            size={76}
            ariaLabel="Wochenfortschritt"
          >
            <span className="text-lg font-bold leading-none">
              {isStartblock
                ? weekActuals.runCount
                : Math.round(weekActuals.km * 10) / 10}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {isStartblock ? "Läufe" : "km"}
            </span>
          </Ring>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium">Diese Woche</p>
            <p className="text-sm text-muted-foreground">
              {isStartblock
                ? `${weekActuals.runCount}/${runTarget} Läufe · ${Math.round(weekActuals.km * 10) / 10} km`
                : `${Math.round(weekActuals.km * 10) / 10}/${weekPlannedKm} km`}{" "}
              · Kraft {weekActuals.gymCount}×
            </p>
            <p className="text-xs text-muted-foreground">
              {isStartblock
                ? "Ziel sind die Läufe (Konsistenz) — km laufen nur mit. Zone 3+ ist tabu, Talk-Test."
                : "Kilometer kommen aus dem Logbuch (Distanz beim Loggen)."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Wochenvolumen — die Kernkurve im Ultra-Aufbau */}
      <Card>
        <CardHeader className="flex-row flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <CardTitle>Wochenvolumen</CardTitle>
          {hasVolume ? (
            <span className="text-sm text-muted-foreground">
              8 Wochen · Ø {avgWeekKm} km
            </span>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2">
          {hasVolume ? (
            <>
              <WeeklyKmChart weeks={weeklyKm} />
              <p className="text-xs text-muted-foreground">
                Diese Woche {Math.round(weekActuals.km * 10) / 10} km ·{" "}
                <span
                  className={
                    kmDelta > 0
                      ? "text-emerald-400"
                      : kmDelta < 0
                        ? "text-orange-400"
                        : ""
                  }
                >
                  {kmDelta > 0 ? "+" : ""}
                  {kmDelta} km zur Vorwoche
                </span>{" "}
                · die laufende Woche ist gedämpft, weil sie noch nicht fertig
                ist.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sobald du Läufe mit Distanz loggst, wächst hier deine
              Volumenkurve — die wichtigste Grafik im Ultra-Aufbau.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Neu berechnen ist immer erreichbar — der Plan liegt gespeichert in
          der DB und übernimmt Regeländerungen erst beim Neuberechnen. */}
      <Card>
        <CardContent className="space-y-3 py-4">
          <p className="text-sm">
            {plan.length === 0
              ? "Noch kein Plan berechnet."
              : missingShifts > 0
                ? `${missingShifts} von 14 Tagen haben noch keine Schicht — trag sie unten ein, dann plane ich diese Tage.`
                : "Alle 14 Tage sind verplant."}
          </p>
          <form action={regenerateAction}>
            <Button type="submit" variant="outline" className="w-full">
              Plan neu berechnen
            </Button>
          </form>
        </CardContent>
      </Card>

      <CoachCalendar weeks={weeks} initialSelected={today} />

      {/* Logbuch: freies Loggen + Historie + Gewichtstrend */}
      <section className="space-y-4 border-t border-border pt-6">
        <h2 className="text-lg font-semibold">Logbuch</h2>

        {/* Das Formular ist der seltene Fall — es liegt hinter dem +. */}
        <CollapsibleCard
          toggle="plus"
          title="Training loggen"
          subtitle="Lauf, Kraft oder Mobility frei eintragen"
        >
          <WorkoutForm />
        </CollapsibleCard>

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
