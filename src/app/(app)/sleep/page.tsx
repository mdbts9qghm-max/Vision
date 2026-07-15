import type { Metadata } from "next";
import Link from "next/link";
import { Moon } from "lucide-react";
import { loadSleepPage } from "@/server/queries/sleep";
import { sleepPlan } from "@/domain/sleep";
import { formatLongDate, todayISO } from "@/domain/dates";
import { RECOVERY_RED_BELOW } from "@/domain/readiness";
import { SHIFT_TIME_LABEL, SHIFT_TYPE_LABEL } from "@/lib/labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ring } from "@/components/ui/ring";
import { DayTimeline } from "@/components/sleep/day-timeline";

export const metadata: Metadata = { title: "Schlaf — Vision" };

function recoveryTone(pct: number): { label: string; className: string } {
  if (pct < RECOVERY_RED_BELOW)
    return { label: "Erholung priorisieren", className: "text-destructive" };
  if (pct < 67) return { label: "moderat", className: "text-amber-500" };
  return { label: "bereit", className: "text-emerald-500" };
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
      <header className="space-y-2 rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card px-4 py-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Moon className="size-6 text-primary" aria-hidden />
          Schlaf
        </h1>
        <p className="text-sm text-muted-foreground">{formatLongDate(today)}</p>
      </header>

      {/* Heutige Erholung */}
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          {recoveryPct !== undefined ? (
            <Ring
              value={recoveryPct}
              max={100}
              size={76}
              colorClass={rec?.className}
              ariaLabel={`Recovery ${recoveryPct} Prozent`}
            >
              <span className="text-lg font-bold leading-none">
                {recoveryPct}
                <span className="text-xs font-medium">%</span>
              </span>
              <span className="text-[10px] text-muted-foreground">Recovery</span>
            </Ring>
          ) : (
            <Ring value={0} max={100} size={76} ariaLabel="Keine Recovery-Daten">
              <span className="text-xs text-muted-foreground">–</span>
            </Ring>
          )}
          <div className="min-w-0 flex-1 space-y-1 text-sm">
            <p className="font-medium">Erholung heute</p>
            <p className="text-muted-foreground">
              Schlaf:{" "}
              <span className="text-foreground">
                {sleepHours !== undefined ? `${sleepHours} h` : "–"}
              </span>
            </p>
            <p className={rec ? rec.className : "text-muted-foreground"}>
              {recoveryPct !== undefined
                ? `Recovery ${recoveryPct} % — ${rec?.label}`
                : "WHOOP-Werte im Heute-Tab eintragen"}
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
