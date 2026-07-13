"use client";

import { useState, useTransition } from "react";
import { Pencil, Target } from "lucide-react";
import { setTodayFocus } from "@/server/actions/focus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Fokus des Tages: eine einzige bewusste Priorität, direkt auf dem
 * Dashboard setz- und änderbar.
 */
export function FocusCard({ initialFocus }: { initialFocus?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialFocus ?? "");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function save() {
    setError(undefined);
    startTransition(async () => {
      const result = await setTodayFocus({ text: draft });
      if (result.error) {
        setError(result.error);
      } else {
        setEditing(false);
      }
    });
  }

  if (!editing && !initialFocus) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-muted-foreground/40 px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
      >
        <Target className="size-4 shrink-0" aria-hidden />
        Was ist heute das Wichtigste?
      </button>
    );
  }

  if (!editing) {
    return (
      <Card className="border-primary/40">
        <CardContent className="flex items-center gap-3 py-4">
          <Target className="size-4 shrink-0 text-primary" aria-hidden />
          <p className="min-w-0 flex-1 text-sm font-medium">{initialFocus}</p>
          <button
            type="button"
            aria-label="Fokus bearbeiten"
            onClick={() => {
              setDraft(initialFocus ?? "");
              setEditing(true);
            }}
            className="p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Pencil className="size-4" aria-hidden />
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-2"
    >
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Fokus des Tages"
          maxLength={200}
          autoFocus
        />
        <Button type="submit" disabled={pending}>
          OK
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Leer speichern entfernt den Fokus.
      </p>
    </form>
  );
}
