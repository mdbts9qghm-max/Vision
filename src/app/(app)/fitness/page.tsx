import type { Metadata } from "next";
import {
  getMetricSeries,
  getRecentWorkouts,
  getWorkoutsSince,
} from "@/server/queries/fitness";
import { addDaysISO, todayISO, weekStartISO } from "@/domain/dates";
import { averageOverDays, trailingAverage } from "@/domain/fitness";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeightChart } from "@/components/fitness/weight-chart";
import { MetricInput } from "@/components/fitness/metric-input";
import { WorkoutForm } from "@/components/fitness/workout-form";
import { WorkoutList } from "@/components/fitness/workout-list";

export const metadata: Metadata = { title: "Fitness — Vision" };

export default async function FitnessPage() {
  const today = todayISO();
  const chartSince = addDaysISO(today, -89); // 90 Tage
  const [weight, steps, sleep, recentWorkouts, weekWorkouts] =
    await Promise.all([
      getMetricSeries("weight", chartSince),
      getMetricSeries("steps", addDaysISO(today, -6)),
      getMetricSeries("sleep", addDaysISO(today, -6)),
      getRecentWorkouts(10),
      getWorkoutsSince(weekStartISO(today)),
    ]);

  const weightToday = weight.find((p) => p.date === today)?.value;
  const stepsToday = steps.find((p) => p.date === today)?.value;
  const sleepToday = sleep.find((p) => p.date === today)?.value;
  const trend = trailingAverage(weight, 7);
  const latestTrend = trend.at(-1)?.value;
  const stepsAvg = averageOverDays(steps, today, 7);
  const sleepAvg = averageOverDays(sleep, today, 7);
  const weekMinutes = weekWorkouts.reduce((s, w) => s + w.durationMin, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Fitness</h1>

      <Card>
        <CardHeader className="flex-row flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <CardTitle>Gewicht</CardTitle>
          {latestTrend !== undefined ? (
            <span className="text-sm text-muted-foreground">
              Trend: {Math.round(latestTrend * 10) / 10} kg
            </span>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {weight.length >= 2 ? (
            <WeightChart daily={weight} trend={trend} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Ab zwei Messungen erscheint hier dein Verlauf mit
              7-Tage-Trendlinie. Wiege dich am besten immer zur gleichen
              Tageszeit.
            </p>
          )}
          <MetricInput
            type="weight"
            label="Gewicht"
            unit="kg"
            step="0.1"
            todayValue={weightToday}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schritte & Schlaf</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MetricInput
              type="steps"
              label="Schritte"
              unit="Anzahl"
              step="1"
              todayValue={stepsToday}
            />
            <MetricInput
              type="sleep"
              label="Schlaf"
              unit="Std."
              step="0.5"
              todayValue={sleepToday}
            />
          </div>
          {stepsAvg !== null || sleepAvg !== null ? (
            <p className="text-xs text-muted-foreground">
              Ø letzte 7 Tage:{" "}
              {stepsAvg !== null
                ? `${Math.round(stepsAvg).toLocaleString("de-DE")} Schritte`
                : "– Schritte"}
              {" · "}
              {sleepAvg !== null
                ? `${Math.round(sleepAvg * 10) / 10} Std. Schlaf`
                : "– Schlaf"}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <CardTitle>Training</CardTitle>
          <span className="text-sm text-muted-foreground">
            {weekWorkouts.length}× · {weekMinutes} Min. diese Woche
          </span>
        </CardHeader>
        <CardContent className="space-y-4">
          <WorkoutForm />
          <WorkoutList workouts={recentWorkouts} />
        </CardContent>
      </Card>
    </div>
  );
}
