import type { Metadata } from "next";
import Link from "next/link";
import { Activity, BedDouble, Heart, HeartPulse, Moon } from "lucide-react";
import { loadSleepPage, TREND_DAYS } from "@/server/queries/sleep";
import { sleepPlan, tomorrowPrep } from "@/domain/sleep";
import { addDaysISO, formatLongDate, todayISO } from "@/domain/dates";
import { RECOVERY_RED_BELOW } from "@/domain/readiness";
import { SHIFT_TIME_LABEL, SHIFT_TYPE_LABEL } from "@/lib/labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Ring } from "@/components/ui/ring";
import { StatTile } from "@/components/ui/stat-tile";
import { MetricTrendChart } from "@/components/fitness/metric-trend-chart-lazy";
import { DayTimeline } from "@/components/sleep/day-timeline";
import { FastingSection } from "@/components/fasting/fasting-section";
import { fastingPlan, isFollowNight } from "@/domain/fasting";

export const metadata: Metadata = { title: "Schlaf — Vision" };

/** Tage in der Fasten-Übersicht. */
const FASTING_DAYS = 14;

function recoveryTone(pct: number): { label: string; className: string } {
  if (pct < RECOVERY_RED_BELOW)
    return { label: "Erholung priorisieren", className: "text-destructive" };
  if (pct < 67) return { label: "moderat", className: "text-amber-500" };
  return { label: "bereit", className: "text-emerald-500" };
}

function TipList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-2 text-sm">
        {items.map((t, i) => (
          <li key={i} className="flex items-baseline gap-2">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
            <span className="text-muted-foreground">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function SleepPage() {
  const today = todayISO();
  const {
    shiftToday,
    shiftTomorrow,
    sleepHours,
    recoveryPct,
    hrv,
    rhr,
    recoverySeries,
    sleepSeries,
    avg7,
    shiftMap,
    rotationStart,
  } = await loadSleepPage(today, FASTING_DAYS + 1);

  const hasTrend = recoverySeries.length >= 2 || sleepSeries.length >= 2;

  // Schicht-Fasten: manuell eingetragene Tage gewinnen über die Rotation.
  const fasting = fastingPlan(today, FASTING_DAYS + 1, shiftMap, rotationStart);

  // "Erste Nacht" aus derselben Quelle wie das Fastenfenster ableiten
  // (effektive Schicht, Rotation eingeschlossen) — sonst könnten Schlafplan
  // und Essensfenster für denselben Tag auseinanderlaufen.
  const firstNight =
    shiftToday === "night" && !isFollowNight(today, shiftMap, rotationStart);
  const plan = shiftToday ? sleepPlan(shiftToday, { firstNight }) : undefined;
  const tomorrowFirstNight =
    shiftTomorrow === "night" &&
    !isFollowNight(addDaysISO(today, 1), shiftMap, rotationStart);
  const tomorrowPlan = shiftTomorrow
    ? sleepPlan(shiftTomorrow, { firstNight: tomorrowFirstNight })
    : undefined;
  const prepTomorrow = tomorrowPrep(shiftTomorrow, {
    firstNight: tomorrowFirstNight,
  });

  const rec = recoveryPct !== undefined ? recoveryTone(recoveryPct) : undefined;
  const sleepTarget = plan?.sleepTargetHours ?? 7;

  return (
    <div className="space-y-5">
      <header className="space-y-2 relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/20 via-primary/6 to-transparent px-4 py-5 shadow-[0_12px_36px_-20px_var(--primary)] backdrop-blur-xl">
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
          {/* Die Zahlen selbst stehen in den Kacheln darunter — hier zählt
              die Einordnung. */}
          <div className="min-w-0 flex-1 space-y-1 text-sm">
            <p className="font-medium">Erholung heute</p>
            <p className={rec ? rec.className : "text-muted-foreground"}>
              {rec?.label ?? "Noch keine Werte für heute"}
            </p>
            <p className="text-xs text-muted-foreground">
              {recoveryPct !== undefined
                ? "Grundlage für die Autoregulation im Coach."
                : "WHOOP-Werte im Heute-Tab eintragen."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Kennzahlen: heutiger Wert, darunter der 7-Tage-Schnitt als Kontext */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Recovery"
          value={recoveryPct ?? "–"}
          unit={recoveryPct !== undefined ? "%" : undefined}
          icon={<HeartPulse className="size-5" />}
          delta={avg7.recovery !== null ? `Ø 7 T. ${avg7.recovery} %` : undefined}
        />
        <StatTile
          label="Schlaf"
          value={sleepHours ?? "–"}
          unit={sleepHours !== undefined ? "h" : undefined}
          icon={<BedDouble className="size-5" />}
          delta={avg7.sleep !== null ? `Ø 7 T. ${avg7.sleep} h` : undefined}
        />
        <StatTile
          label="HRV"
          value={hrv ?? "–"}
          unit={hrv !== undefined ? "ms" : undefined}
          icon={<Activity className="size-5" />}
          delta={avg7.hrv !== null ? `Ø 7 T. ${avg7.hrv} ms` : undefined}
        />
        <StatTile
          label="Ruhepuls"
          value={rhr ?? "–"}
          unit={rhr !== undefined ? "bpm" : undefined}
          icon={<Heart className="size-5" />}
          delta={avg7.rhr !== null ? `Ø 7 T. ${avg7.rhr}` : undefined}
        />
      </div>

      {/* Verläufe: zwei Einheiten = zwei Diagramme, nie zwei Y-Achsen */}
      {hasTrend ? (
        <Card>
          <CardHeader>
            <CardTitle>Verlauf · letzte {TREND_DAYS} Tage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recoverySeries.length >= 2 ? (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Recovery in % — gestrichelt: rote Zone ab{" "}
                  {RECOVERY_RED_BELOW} %
                </p>
                <MetricTrendChart
                  points={recoverySeries}
                  unit="%"
                  domain={[0, 100]}
                  reference={RECOVERY_RED_BELOW}
                />
              </div>
            ) : null}
            {sleepSeries.length >= 2 ? (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Schlaf in Stunden — gestrichelt: Ziel {sleepTarget} h
                </p>
                <MetricTrendChart
                  points={sleepSeries}
                  unit="h"
                  domain={[0, 10]}
                  reference={sleepTarget}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

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
        <CollapsibleCard
          defaultOpen
          title={plan?.title}
          subtitle={`${SHIFT_TYPE_LABEL[shiftToday]} · ${SHIFT_TIME_LABEL[shiftToday]} · Schlafziel ${plan?.sleepTargetHours} h`}
        >
          {plan ? (
            <DayTimeline plan={plan} eatingWindow={fasting[0]?.window} />
          ) : null}
        </CollapsibleCard>
      )}

      {plan ? (
        <CollapsibleCard
          title="Erholung"
          subtitle="Heute beachten, Abendroutine, Vorbereitung für morgen"
        >
          <div className="space-y-5">
            <TipList title="Heute beachten" items={plan.tips} />
            <TipList title="Abendroutine" items={plan.eveningRoutine} />
            <TipList
              title={
                shiftTomorrow
                  ? `Für morgen · ${SHIFT_TYPE_LABEL[shiftTomorrow]}`
                  : "Für morgen"
              }
              items={prepTomorrow}
            />
          </div>
        </CollapsibleCard>
      ) : null}

      <FastingSection
        plan={fasting}
        today={today}
        rotationStart={rotationStart}
        days={FASTING_DAYS}
      />

      {tomorrowPlan && shiftTomorrow ? (
        <CollapsibleCard
          title={`Morgen · ${tomorrowPlan.title}`}
          subtitle={`${SHIFT_TYPE_LABEL[shiftTomorrow]} — zum Vorausplanen`}
        >
          <DayTimeline plan={tomorrowPlan} eatingWindow={fasting[1]?.window} />
        </CollapsibleCard>
      ) : null}
    </div>
  );
}
