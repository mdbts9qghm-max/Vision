import type { Metadata } from "next";
import { CalendarRange, Info, Lightbulb, Timer } from "lucide-react";
import { loadFasting } from "@/server/queries/fasting";
import { FASTING_TIPS, fastingPlan } from "@/domain/fasting";
import { formatLongDate, todayISO } from "@/domain/dates";
import { SHIFT_TYPE_LABEL } from "@/lib/labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionLabel } from "@/components/dashboard/section-label";
import { FastingStatusCard } from "@/components/fasting/fasting-status-card";
import { FastingWeek } from "@/components/fasting/fasting-week";
import { RotationForm } from "@/components/fasting/rotation-form";

export const metadata: Metadata = { title: "Fasten — Vision" };

const DAYS = 14;

function TipList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map((t, i) => (
        <li key={i} className="flex items-baseline gap-2">
          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
          <span className="text-muted-foreground">{t}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function FastingPage() {
  const today = todayISO();
  const { rotationStart, manualShifts } = await loadFasting(today, DAYS + 1);
  const plan = fastingPlan(today, DAYS + 1, manualShifts, rotationStart);

  const todayEntry = plan[0];
  const tomorrowEntry = plan[1];
  // Tage, die nur aus der Rotation kommen (noch nicht im Schichtplan stehen).
  const pendingRotationDays = plan
    .slice(0, DAYS)
    .filter((d) => d.source === "rotation").length;

  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/20 via-card to-card px-4 py-5 shadow-[0_10px_36px_-18px_var(--primary)]">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Timer className="size-6 text-primary" aria-hidden />
          Schicht-Fasten
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          16/8 nach Schicht · {formatLongDate(today)}
        </p>
      </header>

      {/* Heute — Live-Status */}
      <section className="space-y-2">
        <SectionLabel icon={<Timer className="size-3.5" aria-hidden />}>
          Heute
        </SectionLabel>
        <FastingStatusCard
          shift={todayEntry.shift}
          window={todayEntry.window}
          nextDayStartMin={tomorrowEntry.window?.startMin ?? null}
          href={null}
        />
        {todayEntry.shift === undefined ? (
          <p className="px-1 text-xs text-muted-foreground">
            Für heute ist keine Schicht bekannt — unten ein Rotations-Startdatum
            setzen oder den Tag direkt überschreiben.
          </p>
        ) : null}
      </section>

      {/* Wochenübersicht */}
      <section className="space-y-2">
        <SectionLabel icon={<CalendarRange className="size-3.5" aria-hidden />}>
          Nächste {DAYS} Tage
        </SectionLabel>
        <FastingWeek days={plan.slice(0, DAYS)} today={today} />
        <p className="px-1 text-xs text-muted-foreground">
          Rechts je Tag die Schicht ändern — ein manuell gesetzter Tag (z. B.
          V-Schicht) gewinnt immer über die Rotation.
        </p>
      </section>

      {/* Rotation */}
      <section className="space-y-2">
        <SectionLabel icon={<CalendarRange className="size-3.5" aria-hidden />}>
          Rotation
        </SectionLabel>
        <Card>
          <CardContent className="space-y-3 py-4">
            {pendingRotationDays > 0 ? (
              <p className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {pendingRotationDays} Tage kommen aktuell nur aus der Rotation.
                </span>{" "}
                Fürs Fasten reicht das. Damit auch Coach und Schlaf-Tab sie
                nutzen, unten in den Schichtplan übernehmen.
              </p>
            ) : null}
            <RotationForm initialStart={rotationStart} />
          </CardContent>
        </Card>
      </section>

      {/* Fenster-Übersicht je Schicht */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fenster je Schicht</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {(
            [
              ["day", "07:00–19:00 Arbeit", "09:00–17:00"],
              ["night", "19:00–07:00 Arbeit", "14:00–22:00"],
              ["sleep", "08:00–14:00 Schlaf", "14:00–21:00"],
              ["free", "frei", "09:00–17:00"],
              ["v", "08:00–20:00 Arbeit", "10:00–18:00"],
            ] as const
          ).map(([shift, work, win]) => (
            <div key={shift} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0">
                <span className="font-medium">{SHIFT_TYPE_LABEL[shift]}</span>{" "}
                <span className="text-xs text-muted-foreground">({work})</span>
              </span>
              <span className="shrink-0 tabular-nums text-primary">{win}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Hinweise */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="size-4 text-primary" aria-hidden />
            So sitzt das Fenster richtig
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Grundprinzip
            </p>
            <TipList items={FASTING_TIPS.principle} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Nachtschicht
            </p>
            <TipList items={FASTING_TIPS.nightShift} />
          </div>
          <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-3">
            {FASTING_TIPS.mantras.map((m) => (
              <p key={m} className="text-sm font-medium">
                {m}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="flex items-start gap-2 px-1 pb-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {FASTING_TIPS.disclaimer}
      </p>
    </div>
  );
}
