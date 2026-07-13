"use client";

import { useTransition } from "react";
import { deleteGoal, setGoalStatus } from "@/server/actions/goals";
import { Button } from "@/components/ui/button";

/** Abschließen/Reaktivieren, Archivieren und endgültiges Löschen. */
export function GoalStatusZone({
  goalId,
  status,
}: {
  goalId: string;
  status: "active" | "completed" | "archived";
}) {
  const [pending, startTransition] = useTransition();

  const set = (next: "active" | "completed" | "archived") =>
    startTransition(async () => {
      await setGoalStatus(goalId, next);
    });

  return (
    <div className="space-y-3 border-t border-border pt-6">
      {status === "active" ? (
        <Button
          type="button"
          className="w-full"
          disabled={pending}
          onClick={() => set("completed")}
        >
          Ziel erreicht ✓
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={pending}
          onClick={() => set("active")}
        >
          Wieder aktivieren
        </Button>
      )}
      {status !== "archived" ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={pending}
          onClick={() => set("archived")}
        >
          Archivieren
        </Button>
      ) : null}
      <Button
        type="button"
        variant="destructive"
        className="w-full"
        disabled={pending}
        onClick={() => {
          if (
            window.confirm(
              "Ziel endgültig löschen? Alle Meilensteine gehen verloren.",
            )
          ) {
            startTransition(async () => {
              await deleteGoal(goalId);
            });
          }
        }}
      >
        Endgültig löschen
      </Button>
    </div>
  );
}
