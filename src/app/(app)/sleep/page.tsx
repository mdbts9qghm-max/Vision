import type { Metadata } from "next";
import Link from "next/link";
import { Moon } from "lucide-react";
import { loadSleepPage } from "@/server/queries/sleep";
import { sleepPlan } from "@/domain/sleep";
import { formatLongDate, todayISO } from "@/domain/dates";
import { RECOVERY_RED_BELOW } from "@/domain/readiness";
import { SHIFT_TIME_LABEL, SHIFT_TYPE_LABEL } from "@/lib/labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DayTimeline } from "@/components/sleep/day-timeline";

export const metadata: Metadata = { title: "Schlaf — Vision" };

function recoveryTone(pct: number): { label: string; className: string } {
  if (pct < RECOVERY_RED_BELOW)
    return { label: "rot — Erholung priorisieren", className: "text-destructive" };
  if (pct < 67)
    return { label: "gelb — moderat", className: "text-amber-500" };
  return { label: "grün — bereit", className: "text-emerald-500" };
}

export default async function SleepPage() {
  const today = todayISO();
  const { shiftYesterday, shiftToday, shiftTomorrow, sleepHours, recoveryPct } =
    await loadSleepPage(today);

  const firstNight = shiftToday === "night" && shiftYesterday !== "night";
  const plan = shiftToday ? sleepPlan(shiftToday, { firstNight }) : undefined;
  const tomorrowFirstNight = shiftTomorrow === "night" && shiftToday !== "night";
  const tomorrowPlan = shiftTomorrow
    ? sleepPlan(shiftTomorrow, { firstNight: tomorrowFirstNight })
    : undefined;

  const rec = recoveryPct !== undefined ? recoveryTone(recoveryPct) : undefined;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Moon className="size-6 text-primary" aria-hidden />
          Schlaf
        </h1>
        <p className="text-sm text-muted-foreground">{formatLongDate(today)}</p>
      </header>

      {/* Heutige Erholung */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4 text-sm">
          <div>
            <p className="text-muted-foreground">Schlaf letzte Nacht</p>
            <p className="font-medium">
              {sleepHours !== undefined ? `${sleepHours} h` : "– (im Heute-Tab eintragen)"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">WHOOP-Recovery</p>
            <p className={rec ? `font-medium ${rec.className}` : "font-medium"}>
              {recoveryPct !== undefined ? `${recoveryPct} % · ${rec?.label}` : "–"}
            </p>
          </div>
        </CardContent>
      </Card>

      {!shiftToday ? (
        <Card>
          <CardContent className="space-y-3 py-4 text-sm">
            <p>
              Für heute ist keine Schicht hinterlegt — ohne Schicht kein
              schicht-genauer Tagesplan.
            </p>
            <Link
              href="/coach"
              className="inline-block underline underline-offset-4 hover:text-foreground"
            >
              Schicht im Coach eintragen
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="gap-1">
            <CardTitle>{plan?.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {SHIFT_TYPE_LABEL[shiftToday]} · {SHIFT_TIME_LABEL[shiftToday]} ·
              Schlafziel {plan?.sleepTargetHours} h
            </p>
          </CardHeader>
          <CardContent>{plan ? <DayTimeline plan={plan} /> : null}</CardContent>
        </Card>
      )}

      {plan ? (
        <Card>
          <CardHeader>
            <CardTitle>Erholung heute</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {plan.tips.map((t, i) => (
                <li key={i} className="flex items-baseline gap-2">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="text-muted-foreground">{t}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {tomorrowPlan && shiftTomorrow ? (
        <Card>
          <CardHeader className="gap-1">
            <CardTitle className="text-base">Morgen · {tomorrowPlan.title}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {SHIFT_TYPE_LABEL[shiftTomorrow]} — zum Vorausplanen
            </p>
          </CardHeader>
          <CardContent>
            <DayTimeline plan={tomorrowPlan} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
