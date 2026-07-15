"use client";

import { useState, useTransition } from "react";
import type { IsoWeekday, Recurrence } from "@/domain/recurrence";
import type { ShiftType } from "@/domain/coach";
import type { ActionState, HabitInput } from "@/server/actions/habits";
import {
  HABIT_CATEGORY_LABEL,
  SHIFT_TYPE_LABEL,
  WEEKDAY_SHORT,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ALL_WEEKDAYS: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];
const ALL_SHIFTS: ShiftType[] = ["day", "night", "sleep", "free", "v"];
const CATEGORIES = [
  "sleep",
  "nutrition",
  "movement",
  "recovery",
  "mind",
] as const;

type RecurrenceType = Recurrence["type"];
type Category = HabitInput["category"];

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
  const [cue, setCue] = useState(initial?.cue ?? "");
  const [stackedOn, setStackedOn] = useState(initial?.stackedOn ?? "");
  const [category, setCategory] = useState<Category>(initial?.category);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState<RecurrenceType>(
    initial?.recurrence.type ?? "daily",
  );
  const [times, setTimes] = useState(
    initial?.recurrence.type === "timesPerWeek" ? initial.recurrence.times : 3,
  );
  const [weekdays, setWeekdays] = useState<IsoWeekday[]>(
    initial?.recurrence.type === "weekdays" ? initial.recurrence.weekdays : [],
  );
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>(
    initial?.recurrence.shiftTypes ?? [],
  );
  const [minValue, setMinValue] = useState(
    initial?.minValue?.toString() ?? "",
  );
  const [targetValue, setTargetValue] = useState(
    initial?.targetValue?.toString() ?? "",
  );
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function buildRecurrence(): Recurrence {
    const base: Recurrence =
      type === "timesPerWeek"
        ? { type, times }
        : type === "weekdays"
          ? { type, weekdays }
          : { type: "daily" };
    return shiftTypes.length > 0 ? { ...base, shiftTypes } : base;
  }

  function toggle<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  const parseNum = (s: string) => {
    const n = Number(s.replace(",", "."));
    return s.trim() === "" || Number.isNaN(n) ? undefined : n;
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await onSubmit({
        name,
        cue,
        stackedOn: stackedOn || undefined,
        category,
        description: description || undefined,
        recurrence: buildRecurrence(),
        minValue: parseNum(minValue),
        targetValue: parseNum(targetValue),
        unit: unit || undefined,
      });
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
          placeholder="z.B. Wasser trinken"
          maxLength={100}
          required
          autoFocus={!initial}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cue">Auslöser (Pflicht)</Label>
        <Input
          id="cue"
          value={cue}
          onChange={(e) => setCue(e.target.value)}
          placeholder="Wenn … dann — z.B. nach dem Aufwachen 500 ml"
          maxLength={160}
          required
        />
        <p className="text-xs text-muted-foreground">
          Ein konkreter Auslöser erhöht die Ausführungsrate deutlich stärker
          als ein bloßer Name.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="stacked">Kopplung (optional)</Label>
        <Input
          id="stacked"
          value={stackedOn}
          onChange={(e) => setStackedOn(e.target.value)}
          placeholder="z.B. nach dem Kaffee — oder: vor dem Vorschlaf"
          maxLength={120}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Kategorie (optional)</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(category === c ? undefined : c)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                category === c
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-input text-muted-foreground hover:text-foreground",
              )}
            >
              {HABIT_CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </fieldset>

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
                onClick={() => setWeekdays((w) => toggle(w, day).sort((a, b) => a - b))}
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

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Nur an bestimmten Schichten (optional)
        </legend>
        <div className="flex flex-wrap gap-2">
          {ALL_SHIFTS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={shiftTypes.includes(s)}
              onClick={() => setShiftTypes((st) => toggle(st, s))}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                shiftTypes.includes(s)
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-input text-muted-foreground hover:text-foreground",
              )}
            >
              {SHIFT_TYPE_LABEL[s]}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Leer = an allen Tagen fällig. Sonst nur an den gewählten Schichten.
        </p>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Zwei-Level-Ziel (optional)
        </legend>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="min" className="text-xs text-muted-foreground">
              Minimum
            </Label>
            <Input
              id="min"
              value={minValue}
              onChange={(e) => setMinValue(e.target.value)}
              inputMode="decimal"
              placeholder="2"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="target" className="text-xs text-muted-foreground">
              Ziel
            </Label>
            <Input
              id="target"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              inputMode="decimal"
              placeholder="3"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="unit" className="text-xs text-muted-foreground">
              Einheit
            </Label>
            <Input
              id="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="L"
              maxLength={20}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Minimum = auch am schlechtesten Tag machbar. Rettet die Kontinuität.
        </p>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="description">Notiz (optional)</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Zusätzlicher Kontext"
          maxLength={500}
        />
      </div>

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
