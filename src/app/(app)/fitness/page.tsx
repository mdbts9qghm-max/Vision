import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Fitness — Vision" };

export default function FitnessPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Fitness</h1>
      <EmptyState
        title="Noch keine Einträge"
        description="Hier entstehen Gewichts-Log mit Trendlinie, Trainings-Log sowie manuelle Schritte- und Schlaf-Erfassung — Roadmap-Schritt 5."
      />
    </div>
  );
}
