"use client";

import { useTransition } from "react";
import { deleteHabit, setHabitArchived } from "@/server/actions/habits";
import { Button } from "@/components/ui/button";

/** Archivieren/Reaktivieren und endgültiges Löschen (mit Rückfrage). */
export function HabitDangerZone({
  habitId,
  archived,
}: {
  habitId: string;
  archived: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3 border-t border-border pt-6">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await setHabitArchived(habitId, !archived);
          })
        }
      >
        {archived ? "Reaktivieren" : "Archivieren"}
      </Button>
      <Button
        type="button"
        variant="destructive"
        className="w-full"
        disabled={pending}
        onClick={() => {
          if (
            window.confirm(
              "Gewohnheit endgültig löschen? Alle Erledigungen gehen verloren.",
            )
          ) {
            startTransition(async () => {
              await deleteHabit(habitId);
            });
          }
        }}
      >
        Endgültig löschen
      </Button>
      <p className="text-xs text-muted-foreground">
        Archivieren blendet die Gewohnheit aus, behält aber die Historie.
      </p>
    </div>
  );
}
