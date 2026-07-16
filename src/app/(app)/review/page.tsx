import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Footprints,
  HeartPulse,
  Sparkles,
} from "lucide-react";
import { loadReviewPage } from "@/server/queries/review";
import { overallWeeklyProgress } from "@/domain/scoring";
import { FACETS, facetLevelLabel } from "@/domain/checkin";
import { facetDelta, weeklyCheckinTrend, weekSummary } from "@/domain/review";
import {
  addDaysISO,
  formatDayShort,
  isValidISODate,
  todayISO,
  weekStartISO,
} from "@/domain/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ring } from "@/components/ui/ring";
import { ReflectionForm } from "@/components/review/reflection-form";

export const metadata: Metadata = { title: "Rückblick — Vision" };

function fmtDelta(delta: number | null, higherIsBetter: boolean) {
  if (delta === null || delta === 0)
    return { text: delta === 0 ? "±0" : "–", className: "text-muted-foreground" };
  const improved = higherIsBetter ? delta > 0 : delta < 0;
  const arrow = delta > 0 ? "▲" : "▼";
  return {
    text: `${arrow} ${Math.abs(delta).toFixed(1)}`,
    className: improved ? "text-emerald-500" : "text-amber-500",
  };
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const today = todayISO();
  const currentWeek = weekStartISO(today);
  let selected =
    week && isValidISODate(week) ? weekStartISO(week) : currentWeek;
  if (selected > currentWeek) selected = currentWeek;
  const prevWeek = addDaysISO(selected, -7);
  const weekEnd = addDaysISO(selected, 6);
  const isCurrent = selected === currentWeek;

  const data = await loadReviewPage(selected);
  const summary = weekSummary(data.allCheckins, selected);
  const prevSummary = weekSummary(data.allCheckins, prevWeek);
  const habitWeek = overallWeeklyProgress(
    data.habitItems,
    selected,
    data.shifts,
  );
  const habitPct =
    habitWeek.target > 0
      ? Math.round((habitWeek.done / habitWeek.target) * 100)
      : null;
  const trend = weeklyCheckinTrend(data.allCheckins, selected, 8);
  const maxWell = Math.max(...trend.map((t) => t.wellbeing ?? 0), 1);

  return (
    <div className="space-y-5">
      <header className="space-y-3 rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card px-4 py-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles className="size-6 text-primary" aria-hidden />
          Rückblick
        </h1>
        <div className="flex items-center justify-between">
          <Link
            href={`/review?week=${prevWeek}`}
            aria-label="Vorherige Woche"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
          <p className="text-sm font-medium">
            {isCurrent ? "Diese Woche · " : ""}
            {formatDayShort(selected)} – {formatDayShort(weekEnd)}
          </p>
          {isCurrent ? (
            <span className="p-1.5 opacity-0" aria-hidden>
              <ChevronRight className="size-5" />
            </span>
          ) : (
            <Link
              href={`/review?week=${addDaysISO(selected, 7)}`}
              aria-label="Nächste Woche"
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="size-5" aria-hidden />
            </Link>
          )}
        </div>
      </header>

      {/* Wohlbefinden + Befinden-Facetten */}
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <Ring
            value={summary.wellbeing ?? 0}
            max={100}
            size={76}
            ariaLabel="Wohlbefinden der Woche"
          >
            {summary.wellbeing !== null ? (
              <>
                <span className="text-lg font-bold leading-none">
                  {summary.wellbeing}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Befinden
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">–</span>
            )}
          </Ring>
          <div className="min-w-0 flex-1 space-y-2">
            {FACETS.map((f) => {
              const val = summary[f.key];
              const d = fmtDelta(
                facetDelta(val, prevSummary[f.key]).delta,
                f.higherIsBetter,
              );
              return (
                <div key={f.key} className="flex items-center gap-2 text-sm">
                  <span className="w-16 shrink-0 text-muted-foreground">
                    {f.label}
                  </span>
                  {val !== null ? (
                    <>
                      <span aria-hidden>
                        {f.emojis[Math.round(val) - 1]}
                      </span>
                      <span className="font-medium">{val.toFixed(1)}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {facetLevelLabel(f.key, val)}
                      </span>
                      <span className={`ml-auto text-xs ${d.className}`}>
                        {d.text}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      nicht erfasst
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {summary.count === 0 ? (
        <p className="px-1 text-xs text-muted-foreground">
          {isCurrent
            ? "Noch kein Check-in diese Woche — trag im Heute-Tab dein Befinden ein, dann erscheint hier die Auswertung."
            : "In dieser Woche wurde kein Befinden erfasst."}
        </p>
      ) : (
        <p className="px-1 text-xs text-muted-foreground">
          {summary.count} von 7 Tagen erfasst · Δ zur Vorwoche
        </p>
      )}

      {/* Kennzahlen der Woche */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
            <span className="text-lg font-bold">
              {habitPct !== null ? `${habitPct}%` : "–"}
            </span>
            <span className="text-xs text-muted-foreground">
              Habits {habitWeek.done}/{habitWeek.target}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
            <Footprints className="size-4 text-primary/70" aria-hidden />
            <span className="text-lg font-bold">
              {Math.round(data.training.km * 10) / 10}
            </span>
            <span className="text-xs text-muted-foreground">
              km · {data.training.runCount} Läufe
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
            <HeartPulse className="size-4 text-primary/70" aria-hidden />
            <span className="text-lg font-bold">
              {data.recovery.avg !== null ? `${data.recovery.avg}%` : "–"}
            </span>
            <span className="text-xs text-muted-foreground">Ø Recovery</span>
          </CardContent>
        </Card>
      </div>

      <p className="-mt-2 flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
        <Dumbbell className="size-3.5" aria-hidden />
        {data.training.gymCount}× Kraft diese Woche
      </p>

      {/* Wohlbefinden-Trend */}
      {trend.some((t) => t.wellbeing !== null) ? (
        <Card>
          <CardHeader>
            <CardTitle>Befinden · letzte 8 Wochen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-28 items-end justify-between gap-1.5">
              {trend.map((t) => (
                <div
                  key={t.weekStart}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <div className="flex h-24 w-full items-end">
                    <div
                      className={`w-full rounded-t ${
                        t.weekStart === selected ? "bg-primary" : "bg-primary/40"
                      }`}
                      style={{
                        height: `${
                          t.wellbeing !== null
                            ? Math.max((t.wellbeing / maxWell) * 100, 4)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground">
                    {t.weekStart.slice(8)}.{t.weekStart.slice(5, 7)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Geführte Reflexion */}
      <Card>
        <CardHeader>
          <CardTitle>Reflexion</CardTitle>
        </CardHeader>
        <CardContent>
          <ReflectionForm
            key={selected}
            weekStart={selected}
            initial={data.review}
          />
        </CardContent>
      </Card>

      {/* Frühere Rückblicke */}
      {data.pastReviews.filter((r) => r.weekStart !== selected).length > 0 ? (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-muted-foreground">
            Frühere Rückblicke
          </h2>
          {data.pastReviews
            .filter((r) => r.weekStart !== selected)
            .map((r) => (
              <Link
                key={r.weekStart}
                href={`/review?week=${r.weekStart}`}
                className="block rounded-xl border border-border px-4 py-3 transition-colors hover:border-primary/50"
              >
                <p className="text-sm font-medium">
                  {formatDayShort(r.weekStart)} –{" "}
                  {formatDayShort(addDaysISO(r.weekStart, 6))}
                </p>
                {r.focusNext ? (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    Fokus: {r.focusNext}
                  </p>
                ) : null}
              </Link>
            ))}
        </section>
      ) : null}
    </div>
  );
}
