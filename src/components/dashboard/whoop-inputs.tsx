"use client";

import { useState } from "react";
import { ChevronDown, Pencil, Plus } from "lucide-react";
import { MetricInput } from "@/components/fitness/metric-input";
import { cn } from "@/lib/utils";

/**
 * WHOOP-Erfassung direkt im Erholungs-Block: Schlaf, Recovery, HRV, Ruhepuls.
 * Standardmäßig eingeklappt, sobald für heute schon Werte da sind — sonst
 * offen, damit die Eingabe sofort sichtbar ist.
 */
export function WhoopInputs({
  sleepToday,
  recoveryToday,
  hrvToday,
  rhrToday,
}: {
  sleepToday?: number;
  recoveryToday?: number;
  hrvToday?: number;
  rhrToday?: number;
}) {
  const hasAny =
    sleepToday !== undefined ||
    recoveryToday !== undefined ||
    hrvToday !== undefined ||
    rhrToday !== undefined;
  const [open, setOpen] = useState(!hasAny);

  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {hasAny ? (
          <Pencil className="size-3.5" aria-hidden />
        ) : (
          <Plus className="size-3.5" aria-hidden />
        )}
        WHOOP-Werte {hasAny ? "bearbeiten" : "eintragen"}
        <ChevronDown
          className={cn(
            "ml-auto size-4 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <MetricInput
            type="sleep"
            label="Schlaf"
            unit="Std."
            step="0.5"
            todayValue={sleepToday}
          />
          <MetricInput
            type="recovery"
            label="Recovery"
            unit="%"
            step="1"
            todayValue={recoveryToday}
          />
          <MetricInput
            type="hrv"
            label="HRV"
            unit="ms"
            step="1"
            todayValue={hrvToday}
          />
          <MetricInput
            type="rhr"
            label="Ruhepuls"
            unit="bpm"
            step="1"
            todayValue={rhrToday}
          />
        </div>
      ) : null}
    </div>
  );
}
