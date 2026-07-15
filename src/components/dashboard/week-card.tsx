import type { WeeklyProgress } from "@/domain/scoring";
import { Card, CardContent } from "@/components/ui/card";

interface Bar {
  label: string;
  valueLabel: string;
  ratio: number;
}

function MiniBar({ bar }: { bar: Bar }) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span>{bar.label}</span>
        <span className="text-muted-foreground">{bar.valueLabel}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
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
      }
    : {
        label: "Laufen",
        valueLabel: `${Math.round(kmActual * 10) / 10}/${kmPlanned} km`,
        ratio: kmPlanned > 0 ? kmActual / kmPlanned : 0,
      };

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <p className="text-sm font-medium">Diese Woche</p>
        <MiniBar bar={runBar} />
        {habits.target > 0 ? (
          <MiniBar
            bar={{
              label: "Habits",
              valueLabel: `${habits.done}/${habits.target}`,
              ratio: habits.done / habits.target,
            }}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
