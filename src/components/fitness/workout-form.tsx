"use client";

import { useState, useTransition } from "react";
import { createWorkout } from "@/server/actions/workouts";
import { todayISO } from "@/domain/dates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PRESETS = ["Kraft", "Laufen", "Rad", "Mobility"] as const;

export function WorkoutForm() {
  const [type, setType] = useState<string>("Kraft");
  const [custom, setCustom] = useState(false);
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await createWorkout({
        date,
        type,
        durationMin: Number(duration),
        distanceKm:
          distance.trim() === ""
            ? undefined
            : Number(distance.replace(",", ".")),
        note: note || undefined,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setDuration("");
        setDistance("");
        setNote("");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={!custom && type === p}
            onClick={() => {
              setCustom(false);
              setType(p);
            }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              !custom && type === p
                ? "border-primary bg-primary/15 text-foreground"
                : "border-input text-muted-foreground hover:text-foreground",
            )}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={custom}
          onClick={() => {
            setCustom(true);
            setType("");
          }}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm transition-colors",
            custom
              ? "border-primary bg-primary/15 text-foreground"
              : "border-input text-muted-foreground hover:text-foreground",
          )}
        >
          Sonstiges
        </button>
      </div>

      {custom ? (
        <Input
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="Trainingsart, z.B. Schwimmen"
          maxLength={40}
          autoFocus
        />
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="workout-duration" className="text-xs text-muted-foreground">
            Dauer (Min.)
          </Label>
          <Input
            id="workout-duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            inputMode="numeric"
            placeholder="60"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="workout-distance" className="text-xs text-muted-foreground">
            km (Lauf)
          </Label>
          <Input
            id="workout-distance"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            inputMode="decimal"
            placeholder="–"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="workout-date" className="text-xs text-muted-foreground">
            Datum
          </Label>
          <Input
            id="workout-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayISO()}
            required
          />
        </div>
      </div>

      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Notiz (optional)"
        maxLength={500}
      />

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Speichern …" : "Training loggen"}
      </Button>
    </form>
  );
}
