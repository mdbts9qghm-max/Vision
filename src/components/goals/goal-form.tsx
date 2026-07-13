"use client";

import { useState, useTransition } from "react";
import type { ActionState, GoalInput } from "@/server/actions/goals";
import { PRIORITY_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PRIORITIES = ["low", "medium", "high"] as const;

export function GoalForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: GoalInput;
  submitLabel: string;
  onSubmit: (input: GoalInput) => Promise<ActionState>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [why, setWhy] = useState(initial?.why ?? "");
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const [priority, setPriority] = useState<GoalInput["priority"]>(
    initial?.priority ?? "medium",
  );
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await onSubmit({
        title,
        why: why || undefined,
        deadline,
        priority,
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Titel</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. 100 km Ultra finishen"
          maxLength={120}
          required
          autoFocus={!initial}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="why">Warum? (optional)</Label>
        <Input
          id="why"
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          placeholder="Dein Antrieb — hilft an schwachen Tagen"
          maxLength={500}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="deadline">Deadline (optional)</Label>
        <Input
          id="deadline"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Priorität</legend>
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {PRIORITIES.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={priority === value}
              onClick={() => setPriority(value)}
              className={cn(
                "rounded-md border px-2 py-2 text-sm transition-colors",
                priority === value
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-input text-muted-foreground hover:text-foreground",
              )}
            >
              {PRIORITY_LABEL[value]}
            </button>
          ))}
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Speichern …" : submitLabel}
      </Button>
    </form>
  );
}
