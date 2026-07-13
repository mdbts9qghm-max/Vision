"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { upsertMetric, type MetricType } from "@/server/actions/metrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Schnelle Tages-Erfassung eines Messwerts (ein Wert pro Tag, Upsert). */
export function MetricInput({
  type,
  label,
  unit,
  step,
  todayValue,
}: {
  type: MetricType;
  label: string;
  unit: string;
  step: string;
  todayValue?: number;
}) {
  const [draft, setDraft] = useState(todayValue?.toString() ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const value = Number(draft.replace(",", "."));
    if (draft.trim() === "" || Number.isNaN(value)) {
      setError("Bitte eine Zahl eingeben.");
      return;
    }
    startTransition(async () => {
      const result = await upsertMetric({ type, value });
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  const id = `metric-${type}`;
  return (
    <form onSubmit={save} className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label} heute ({unit})
      </Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          inputMode="decimal"
          step={step}
          placeholder="–"
        />
        <Button
          type="submit"
          size="icon"
          aria-label={`${label} speichern`}
          disabled={pending}
          variant={saved ? "secondary" : "default"}
        >
          <Check aria-hidden />
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
