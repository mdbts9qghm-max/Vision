"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Plus, X } from "lucide-react";
import type { Milestone } from "@/server/queries/goals";
import {
  addMilestone,
  deleteMilestone,
  toggleMilestone,
} from "@/server/actions/goals";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MilestoneList({
  goalId,
  milestones,
}: {
  goalId: string;
  milestones: Milestone[];
}) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await addMilestone({ goalId, title });
      if (result.error) {
        setError(result.error);
      } else {
        setTitle("");
        inputRef.current?.focus();
      }
    });
  }

  return (
    <div className="space-y-3">
      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Zerlege das Ziel in Meilensteine — jeder abgehakte füllt den
          Fortschrittsbalken.
        </p>
      ) : (
        <ul className="space-y-2">
          {milestones.map((m) => {
            const done = m.completedAt !== null;
            return (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
              >
                <button
                  type="button"
                  aria-label={
                    done ? `${m.title} zurücknehmen` : `${m.title} abhaken`
                  }
                  aria-pressed={done}
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await toggleMilestone(m.id);
                    })
                  }
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40 text-transparent hover:border-primary",
                  )}
                >
                  <Check className="size-4" strokeWidth={3} aria-hidden />
                </button>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    done && "text-muted-foreground line-through",
                  )}
                >
                  {m.title}
                </span>
                <button
                  type="button"
                  aria-label={`${m.title} löschen`}
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteMilestone(m.id);
                    })
                  }
                  className="p-1 text-muted-foreground transition-colors hover:text-destructive"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={add} className="flex gap-2">
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Neuer Meilenstein"
          maxLength={120}
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Meilenstein hinzufügen"
          disabled={pending || title.trim() === ""}
        >
          <Plus aria-hidden />
        </Button>
      </form>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
