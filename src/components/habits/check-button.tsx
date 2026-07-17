"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { toggleCompletion } from "@/server/actions/habits";
import { cn } from "@/lib/utils";

/** Ein-Tap-Check-off. Toggle: erneutes Tippen nimmt die Erledigung zurück. */
export function CheckButton({
  habitId,
  date,
  done,
  label,
}: {
  habitId: string;
  date: string;
  done: boolean;
  label: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={done ? `${label} zurücknehmen` : `${label} abhaken`}
      aria-pressed={done}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleCompletion({ habitId, date });
        })
      }
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition duration-200 active:scale-90",
        done
          ? "border-primary bg-primary text-primary-foreground"
          : "border-muted-foreground/40 text-transparent hover:border-primary",
        pending && "opacity-50",
      )}
    >
      <Check
        className={cn(
          "size-5 transition-transform duration-200",
          done ? "scale-100" : "scale-0",
        )}
        strokeWidth={3}
        aria-hidden
      />
    </button>
  );
}
