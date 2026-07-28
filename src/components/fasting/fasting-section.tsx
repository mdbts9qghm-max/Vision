import { CalendarRange, Info, Lightbulb, Timer } from "lucide-react";
import { FASTING_TIPS, type FastingDay } from "@/domain/fasting";
import { SHIFT_TYPE_LABEL } from "@/lib/labels";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { FastingStatusCard } from "@/components/fasting/fasting-status-card";
import { FastingWeek } from "@/components/fasting/fasting-week";
import { RotationForm } from "@/components/fasting/rotation-form";

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

/**
 * Kompletter Schicht-Fasten-Block (16/8): Live-Status, Tagesübersicht,
 * Rotation, Fenster je Schicht und Hinweise. Sitzt im Schlaf-Tab, weil Fasten
 * und Schlafrhythmus zusammengehören.
 */
export function FastingSection({
  plan,
  today,
  rotationStart,
  days,
}: {
  /** Tagesplan ab heute — braucht mindestens `days + 1` Einträge. */
  plan: FastingDay[];
  today: string;
  rotationStart: string | null;
  /** Wie viele Tage in der Übersicht gezeigt werden. */
  days: number;
}) {
  const todayEntry = plan[0];
  const tomorrowEntry = plan[1];
  const pendingRotationDays = plan
    .slice(0, days)
    .filter((d) => d.source === "rotation").length;

  return (
    <section className="space-y-4 border-t border-border pt-6">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Timer className="size-5 text-primary" aria-hidden />
          Schicht-Fasten (16/8)
        </h2>
        <p className="text-sm text-muted-foreground">
          Essensfenster passend zur Schicht — Fenster ~1–2 h nach dem Aufstehen
          öffnen, ~2–3 h vor dem Schlafen schließen.
        </p>
      </div>

      {/* Live-Status */}
      <FastingStatusCard
        shift={todayEntry?.shift}
        window={todayEntry?.window ?? null}
        nextDayStartMin={tomorrowEntry?.window?.startMin ?? null}
        href={null}
      />
      {todayEntry && todayEntry.shift === undefined ? (
        <p className="px-1 text-xs text-muted-foreground">
          Für heute ist keine Schicht bekannt — unten ein Rotations-Startdatum
          setzen oder den Tag direkt überschreiben.
        </p>
      ) : null}

      {/* Tagesübersicht */}
      <CollapsibleCard
        icon={<CalendarRange className="size-5 shrink-0 text-primary" aria-hidden />}
        title={`Nächste ${days} Tage`}
        subtitle="Fenster je Tag · Schicht änderbar"
      >
        <div className="space-y-2">
          <FastingWeek days={plan.slice(0, days)} today={today} />
          <p className="px-1 text-xs text-muted-foreground">
            Rechts je Tag die Schicht ändern — ein manuell gesetzter Tag (z. B.
            V-Schicht) gewinnt immer über die Rotation.
          </p>
        </div>
      </CollapsibleCard>

      {/* Rotation */}
      <CollapsibleCard
        icon={<CalendarRange className="size-5 shrink-0 text-primary" aria-hidden />}
        title="Rotation"
        subtitle={
          rotationStart
            ? `Start ${rotationStart}`
            : "Noch kein Startdatum gesetzt"
        }
        defaultOpen={!rotationStart}
      >
        <div className="space-y-3">
          {pendingRotationDays > 0 ? (
            <p className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {pendingRotationDays} Tage kommen aktuell nur aus der Rotation.
              </span>{" "}
              Fürs Fasten reicht das. Damit auch Coach und Tagesplan sie nutzen,
              unten in den Schichtplan übernehmen.
            </p>
          ) : null}
          <RotationForm initialStart={rotationStart} />
        </div>
      </CollapsibleCard>

      {/* Fenster je Schicht */}
      <CollapsibleCard title="Fenster je Schicht">
        <div className="space-y-1.5 text-sm">
          {(
            [
              ["day", "07:00–19:00 Arbeit", "09:00–17:00"],
              ["night", "19:00–07:00 Arbeit, Vorschlaf 15–17", "11:00–19:00"],
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
              <span className="shrink-0 whitespace-nowrap tabular-nums text-primary">
                {win}
              </span>
            </div>
          ))}
        </div>
      </CollapsibleCard>

      {/* Hinweise */}
      <CollapsibleCard
        icon={<Lightbulb className="size-5 shrink-0 text-primary" aria-hidden />}
        title="So sitzt das Fenster richtig"
        subtitle="Grundprinzip, Nachtschicht, Merksätze"
      >
        <div className="space-y-5">
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
        </div>
      </CollapsibleCard>

      <p className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {FASTING_TIPS.disclaimer}
      </p>
    </section>
  );
}
