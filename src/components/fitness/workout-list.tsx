"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import type { Workout } from "@/server/queries/fitness";
import { deleteWorkout } from "@/server/actions/workouts";
import { formatLongDate } from "@/domain/dates";

export function WorkoutList({ workouts }: { workouts: Workout[] }) {
  const [pending, startTransition] = useTransition();

  if (workouts.length === 0) return null;

  return (
    <ul className="space-y-2">
      {workouts.map((w) => (
        <li
          key={w.id}
          className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {w.type} · {w.durationMin} Min.
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {formatLongDate(w.date)}
              {w.note ? ` — ${w.note}` : ""}
            </p>
          </div>
          <button
            type="button"
            aria-label={`Training vom ${w.date} löschen`}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await deleteWorkout(w.id);
              })
            }
            className="p-1 text-muted-foreground transition-colors hover:text-destructive"
          >
            <X className="size-4" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
