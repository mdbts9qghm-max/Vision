"use client";

import { useOptimistic, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { logHabitValue } from "@/server/actions/habits";
import { cn } from "@/lib/utils";

/**
 * Wert-Logger für Mess-/Zähl-Gewohnheiten mit Zwei-Level-Ziel.
 * Zeigt den Fortschritt zum Zielwert; Minimum-Marke sichtbar.
 */
export function ValueStepper({
  habitId,
  date,
  value,
  target,
  min,
  unit,
  step,
  label,
}: {
  habitId: string;
  date: string;
  value: number;
  target: number;
  min?: number | null;
  unit?: string | null;
  step: number;
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(value);

  const change = (delta: number) => {
    const next = Math.max(0, Math.round((optimistic + delta) * 100) / 100);
    startTransition(async () => {
      setOptimistic(next);
      await logHabitValue({ habitId, date, value: next });
    });
  };

  const ratio = target > 0 ? Math.min(optimistic / target, 1) : 0;
  const minRatio = min && target > 0 ? Math.min(min / target, 1) : null;
  const reached = min ? optimistic >= min : optimistic >= target;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`${label} verringern`}
          disabled={pending || optimistic <= 0}
          onClick={() => change(-step)}
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-input text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <Minus className="size-4" aria-hidden />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Heute</span>
            <span className={reached ? "font-medium text-primary" : "font-medium"}>
              {formatNum(optimistic)}/{formatNum(target)}
              {unit ? ` ${unit}` : ""}
            </span>
          </div>
          <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300",
                reached ? "bg-primary" : "bg-primary/60",
              )}
              style={{ width: `${ratio * 100}%` }}
            />
            {minRatio !== null && minRatio < 1 ? (
              <span
                className="absolute top-0 h-full w-px bg-foreground/50"
                style={{ left: `${minRatio * 100}%` }}
                title={`Minimum ${formatNum(min ?? 0)}`}
              />
            ) : null}
          </div>
        </div>

        <button
          type="button"
          aria-label={`${label} erhöhen`}
          disabled={pending}
          onClick={() => change(step)}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}
