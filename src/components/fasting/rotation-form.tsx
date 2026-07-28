"use client";

import { useState, useTransition } from "react";
import { CalendarSync, Check } from "lucide-react";
import { applyRotationToShifts, setRotationStart } from "@/server/actions/fasting";
import { SHIFT_ROTATION } from "@/domain/fasting";
import { SHIFT_TYPE_LABEL } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Startpunkt der Standard-Rotation setzen. Ab diesem Tag läuft die Rotation
 * mit ihrem ersten Eintrag los; einzelne Tage lassen sich unten überschreiben.
 */
export function RotationForm({ initialStart }: { initialStart: string | null }) {
  const [date, setDate] = useState(initialStart ?? "");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const r = await setRotationStart({ date: date.trim() === "" ? null : date });
      setMsg(
        r.error
          ? { text: r.error, ok: false }
          : {
              text: date ? "Rotation gesetzt." : "Rotation entfernt.",
              ok: true,
            },
      );
    });
  }

  function apply() {
    setMsg(null);
    startTransition(async () => {
      const r = await applyRotationToShifts();
      setMsg(
        r.error
          ? { text: r.error, ok: false }
          : {
              text:
                r.applied && r.applied > 0
                  ? `${r.applied} Tage in den Schichtplan übernommen.`
                  : "Alle Tage waren schon eingetragen.",
              ok: true,
            },
      );
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={save} className="space-y-1.5">
        <Label htmlFor="rotation-start" className="text-xs text-muted-foreground">
          Erster Tag der Rotation (= {SHIFT_TYPE_LABEL[SHIFT_ROTATION[0]]})
        </Label>
        <div className="flex gap-2">
          <Input
            id="rotation-start"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Button type="submit" size="icon" aria-label="Rotation speichern" disabled={pending}>
            <Check aria-hidden />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Zyklus: {SHIFT_ROTATION.map((s) => SHIFT_TYPE_LABEL[s]).join(" → ")} →
          wiederholt sich. Leeres Feld speichern entfernt die Rotation.
        </p>
      </form>

      <div className="space-y-1.5">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={apply}
          disabled={pending || !initialStart}
        >
          <CalendarSync aria-hidden />
          In den Schichtplan übernehmen (28 Tage)
        </Button>
        <p className="text-xs text-muted-foreground">
          Trägt die Rotation als echte Schichten ein — nur für Tage ohne
          Eintrag, damit auch der Coach sie einplant. Manuelle Tage bleiben.
        </p>
      </div>

      {msg ? (
        <p
          className={cn("text-xs", msg.ok ? "text-primary" : "text-destructive")}
          aria-live="polite"
        >
          {msg.text}
        </p>
      ) : null}
    </div>
  );
}
