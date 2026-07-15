"use client";

import { useTransition } from "react";
import { setTodayReadiness } from "@/server/actions/readiness";
import type { ReadinessScore } from "@/domain/readiness";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ value: ReadinessScore; label: string }> = [
  { value: "good", label: "Fit" },
  { value: "ok", label: "Okay" },
  { value: "low", label: "Platt" },
];

/** Ein-Tap-Erholungs-Check: steuert die Autoregulation des Coaches. */
export function ReadinessCheck({ value }: { value: ReadinessScore | null }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-border px-4 py-3">
      <p className="text-sm text-muted-foreground">Wie erholt bist du?</p>
      <div
        className="flex shrink-0 gap-1.5"
        role="radiogroup"
        aria-label="Erholungs-Check"
      >
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await setTodayReadiness({ score: o.value });
              })
            }
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              value === o.value
                ? "border-primary bg-primary/15 text-foreground"
                : "border-input text-muted-foreground hover:text-foreground",
              pending && "opacity-50",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
