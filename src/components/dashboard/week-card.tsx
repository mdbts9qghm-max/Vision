import { CheckCircle2, Footprints } from "lucide-react";
import type { WeeklyProgress } from "@/domain/scoring";
import { Card, CardContent } from "@/components/ui/card";

interface Bar {
  label: string;
  valueLabel: string;
  ratio: number;
  icon: React.ReactNode;
}

function MiniBar({ bar }: { bar: Bar }) {
  const done = bar.ratio >= 1;
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span className="inline-flex items-center gap-1.5">
          {bar.icon}
          {bar.label}
        </span>
        <span className={done ? "font-medium text-primary" : "text-muted-foreground"}>
          {bar.valueLabel}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700"
          style={{ width: `${Math.min(bar.ratio, 1) * 100}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Wochenfortschritt (Spec 2.6): Laufen + Habits der laufenden Woche.
 * Bewusst Fortschritt statt Streak.
 */
export function WeekCard({
  isStartblock,
  runCount,
  runTarget,
  kmActual,
  kmPlanned,
  habits,
}: {
  isStartblock: boolean;
  runCount: number;
  runTarget: number;
  kmActual: number;
  kmPlanned: number;
  habits: WeeklyProgress;
}) {
  const runBar: Bar = isStartblock
    ? {
        label: "Läufe",
        valueLabel: `${runCount}/${runTarget}`,
        ratio: runTarget > 0 ? runCount / runTarget : 0,
        icon: <Footprints className="size-3.5 text-primary" aria-hidden />,
      }
    : {
        label: "Laufen",
        valueLabel: `${Math.round(kmActual * 10) / 10}/${kmPlanned} km`,
        ratio: kmPlanned > 0 ? kmActual / kmPlanned : 0,
        icon: <Footprints className="size-3.5 text-primary" aria-hidden />,
      };

  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <p className="text-sm font-medium">Diese Woche</p>
        <MiniBar bar={runBar} />
        {habits.target > 0 ? (
          <MiniBar
            bar={{
              label: "Habits",
              valueLabel: `${habits.done}/${habits.target}`,
              ratio: habits.done / habits.target,
              icon: <CheckCircle2 className="size-3.5 text-primary" aria-hidden />,
            }}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
