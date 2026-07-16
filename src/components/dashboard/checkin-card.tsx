"use client";

import { useRef, useState, useTransition } from "react";
import { NotebookPen } from "lucide-react";
import { setTodayCheckin } from "@/server/actions/checkin";
import { FACETS, type CheckinFacet } from "@/domain/checkin";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface State {
  mood: number | null;
  energy: number | null;
  stress: number | null;
  note: string;
}

export function CheckinCard({
  initial,
}: {
  initial?: {
    mood?: number | null;
    energy?: number | null;
    stress?: number | null;
    note?: string | null;
  };
}) {
  const [state, setState] = useState<State>({
    mood: initial?.mood ?? null,
    energy: initial?.energy ?? null,
    stress: initial?.stress ?? null,
    note: initial?.note ?? "",
  });
  const [noteOpen, setNoteOpen] = useState(!!initial?.note);
  const [, startTransition] = useTransition();
  const savedNote = useRef(initial?.note ?? "");

  function persist(next: State) {
    startTransition(async () => {
      await setTodayCheckin({
        mood: next.mood,
        energy: next.energy,
        stress: next.stress,
        note: next.note,
      });
    });
  }

  function pick(facet: CheckinFacet, level: number) {
    // Erneutes Tippen der gleichen Stufe hebt die Auswahl auf.
    const value = state[facet] === level ? null : level;
    const next = { ...state, [facet]: value };
    setState(next);
    persist(next);
  }

  function saveNote() {
    if (state.note === savedNote.current) return;
    savedNote.current = state.note;
    persist(state);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card px-4 py-4">
      {FACETS.map((f) => (
        <div key={f.key} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-sm text-muted-foreground">
            {f.label}
          </span>
          <div
            className="flex flex-1 justify-between gap-1"
            role="radiogroup"
            aria-label={f.label}
          >
            {f.emojis.map((emoji, i) => {
              const level = i + 1;
              const selected = state[f.key] === level;
              return (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${f.label}: ${f.levels[i]}`}
                  onClick={() => pick(f.key, level)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full text-lg transition-all",
                    selected
                      ? "bg-primary/20 ring-2 ring-primary"
                      : "opacity-45 grayscale hover:opacity-80",
                  )}
                >
                  <span aria-hidden>{emoji}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {noteOpen ? (
        <Textarea
          value={state.note}
          onChange={(e) => setState((p) => ({ ...p, note: e.target.value }))}
          onBlur={saveNote}
          placeholder="Ein paar Zeilen zum Tag …"
          maxLength={1000}
          rows={3}
          autoFocus={!initial?.note}
          className="min-h-16 text-sm"
        />
      ) : (
        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          className="flex w-full items-center gap-2 pt-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <NotebookPen className="size-3.5" aria-hidden />
          Journal hinzufügen
        </button>
      )}
    </div>
  );
}
