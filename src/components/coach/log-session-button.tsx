"use client";

import { useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { logPlannedSession } from "@/server/actions/coach";
import { cn } from "@/lib/utils";

/**
 * Ein-Tap-Logging der geplanten Einheit ins Logbuch. Ist der Tag bereits
 * geloggt, zeigt der Button den erledigten Zustand (kein Doppel-Log).
 */
export function LogSessionButton({
  date,
  logged,
}: {
  date: string;
  logged: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (logged) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/50 bg-primary/15 px-2.5 py-1 text-xs font-medium text-foreground">
        <Check className="size-3.5 text-primary" aria-hidden />
        Geloggt
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label="Einheit als erledigt loggen"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await logPlannedSession({ date });
        })
      }
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90",
        pending && "opacity-50",
      )}
    >
      <Plus className="size-3.5" aria-hidden />
      Erledigt
    </button>
  );
}
