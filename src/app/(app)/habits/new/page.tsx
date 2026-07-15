import type { Metadata } from "next";
import Link from "next/link";
import { createHabit } from "@/server/actions/habits";
import { HabitForm } from "@/components/habits/habit-form";
import { HABIT_LIBRARY, findPreset } from "@/lib/habit-library";
import { HABIT_CATEGORY_LABEL } from "@/lib/labels";

export const metadata: Metadata = { title: "Neue Gewohnheit — Vision" };

export default async function NewHabitPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const { preset: presetKey } = await searchParams;
  const preset = findPreset(presetKey);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Neue Gewohnheit</h1>

      {!preset ? (
        <section className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Vorschläge (Schichtarbeit + Ultra)
          </p>
          <div className="flex flex-wrap gap-2">
            {HABIT_LIBRARY.map((p) => (
              <Link
                key={p.key}
                href={`/habits/new?preset=${p.key}`}
                className="rounded-full border border-input px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                {p.name}
              </Link>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Tipp: Starte mit 3–5. Antippen füllt das Formular vor — du kannst
            alles anpassen.
          </p>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          Vorlage:{" "}
          <span className="text-foreground">{preset.name}</span>
          {preset.category
            ? ` · ${HABIT_CATEGORY_LABEL[preset.category]}`
            : ""}{" "}
          —{" "}
          <Link href="/habits/new" className="underline underline-offset-4">
            leeres Formular
          </Link>
        </p>
      )}

      <HabitForm
        key={preset?.key ?? "blank"}
        submitLabel="Anlegen"
        initial={preset}
        onSubmit={createHabit}
      />
    </div>
  );
}
