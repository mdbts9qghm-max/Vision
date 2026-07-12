"use client";

import { useState, useTransition } from "react";
import type { IsoWeekday, Recurrence } from "@/domain/recurrence";
import type { ActionState, HabitInput } from "@/server/actions/habits";
import { WEEKDAY_SHORT } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ALL_WEEKDAYS: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];

type RecurrenceType = Recurrence["type"];

export function HabitForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: HabitInput;
  submitLabel: string;
  onSubmit: (input: HabitInput) => Promise<ActionState>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState<RecurrenceType>(
    initial?.recurrence.type ?? "daily",
  );
  const [times, setTimes] = useState(
    initial?.recurrence.type === "timesPerWeek"
      ? initial.recurrence.times
      : 3,
  );
  const [weekdays, setWeekdays] = useState<IsoWeekday[]>(
    initial?.recurrence.type === "weekdays" ? initial.recurrence.weekdays : [],
  );
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function buildRecurrence(): Recurrence {
    if (type === "timesPerWeek") return { type, times };
    if (type === "weekdays") return { type, weekdays };
    return { type: "daily" };
  }

  function toggleWeekday(day: IsoWeekday) {
    setWeekdays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort((a, b) => a - b),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await onSubmit({
        name,
        description: description || undefined,
        recurrence: buildRecurrence(),
      });
      // Bei Erfolg redirected die Action; hier landet nur der Fehlerfall.
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Lesen"
          maxLength={100}
          required
          autoFocus={!initial}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Beschreibung (optional)</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Warum? Woran erinnern?"
          maxLength={500}
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Wiederholung</legend>
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {(
            [
              ["daily", "Täglich"],
              ["timesPerWeek", "x pro Woche"],
              ["weekdays", "Wochentage"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={type === value}
              onClick={() => setType(value)}
              className={cn(
                "rounded-md border px-2 py-2 text-sm transition-colors",
                type === value
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-input text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {type === "timesPerWeek" ? (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Weniger"
              disabled={times <= 1}
              onClick={() => setTimes((t) => Math.max(1, t - 1))}
            >
              −
            </Button>
            <span className="min-w-24 text-center text-sm">
              {times}× pro Woche
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Mehr"
              disabled={times >= 7}
              onClick={() => setTimes((t) => Math.min(7, t + 1))}
            >
              +
            </Button>
          </div>
        ) : null}

        {type === "weekdays" ? (
          <div className="flex flex-wrap gap-2">
            {ALL_WEEKDAYS.map((day) => (
              <button
                key={day}
                type="button"
                aria-pressed={weekdays.includes(day)}
                onClick={() => toggleWeekday(day)}
                className={cn(
                  "size-10 rounded-full border text-sm transition-colors",
                  weekdays.includes(day)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input text-muted-foreground hover:text-foreground",
                )}
              >
                {WEEKDAY_SHORT[day]}
              </button>
            ))}
          </div>
        ) : null}
      </fieldset>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={pending || (type === "weekdays" && weekdays.length === 0)}
      >
        {pending ? "Speichern …" : submitLabel}
      </Button>
    </form>
  );
}
