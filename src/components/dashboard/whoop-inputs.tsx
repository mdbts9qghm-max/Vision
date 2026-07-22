"use client";

import { useState } from "react";
import { ChevronDown, Pencil, Sun } from "lucide-react";
import { MetricInput } from "@/components/fitness/metric-input";
import { cn } from "@/lib/utils";

/**
 * Täglicher Morgen-Check: Schlaf, Recovery, HRV & Ruhepuls aus der WHOOP-App
 * übertragen. Sind für heute noch keine Werte da, wird der Block hervorgehoben
 * und offen angezeigt (tägliche Abfrage). Sobald erfasst, klappt er ein.
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

  const fields = (
    <div className="mt-3 grid grid-cols-2 gap-3">
      <MetricInput type="sleep" label="Schlaf" unit="Std." step="0.5" todayValue={sleepToday} />
      <MetricInput type="recovery" label="Recovery" unit="%" step="1" todayValue={recoveryToday} />
      <MetricInput type="hrv" label="HRV" unit="ms" step="1" todayValue={hrvToday} />
      <MetricInput type="rhr" label="Ruhepuls" unit="bpm" step="1" todayValue={rhrToday} />
    </div>
  );

  // Noch nichts erfasst → als hervorgehobener Morgen-Check anzeigen.
  if (!hasAny) {
    return (
      <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Sun className="size-4 text-primary" aria-hidden />
          Morgen-Check — WHOOP-Werte eintragen
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Trag deine heutigen Werte aus der WHOOP-App ein.
        </p>
        {fields}
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Pencil className="size-3.5" aria-hidden />
        WHOOP-Werte bearbeiten
        <ChevronDown
          className={cn("ml-auto size-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? fields : null}
    </div>
  );
}
