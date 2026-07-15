"use client";

import { useTransition } from "react";
import { SkipForward } from "lucide-react";
import { skipCompletion } from "@/server/actions/habits";
import { cn } from "@/lib/utils";

/**
 * Bewusster Skip (Habit-Spec 2.5): zählt nicht als Fehlschlag, wird aus der
 * Quote genommen. Erneutes Tippen nimmt den Skip zurück.
 */
export function SkipButton({
  habitId,
  date,
  skipped,
  label,
}: {
  habitId: string;
  date: string;
  skipped: boolean;
  label: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={
        skipped ? `${label} Skip zurücknehmen` : `${label} bewusst überspringen`
      }
      aria-pressed={skipped}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await skipCompletion({ habitId, date });
        })
      }
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
        skipped
          ? "border-muted-foreground/60 bg-muted text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
        pending && "opacity-50",
      )}
    >
      <SkipForward className="size-3" aria-hidden />
      {skipped ? "Übersprungen" : "Skip"}
    </button>
  );
}
