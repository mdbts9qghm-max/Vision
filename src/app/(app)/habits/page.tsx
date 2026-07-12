import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Gewohnheiten — Vision" };

export default function HabitsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Gewohnheiten</h1>
      <EmptyState
        title="Noch keine Gewohnheiten"
        description="Hier legst du Gewohnheiten mit flexibler Wiederholung an (täglich, x-mal pro Woche oder feste Wochentage) — mit Check-off, Streak und Erfolgsquote. Kommt als nächster Schritt der Roadmap."
      />
    </div>
  );
}
