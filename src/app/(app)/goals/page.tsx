import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Ziele — Vision" };

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Ziele</h1>
      <EmptyState
        title="Noch keine Ziele"
        description="Hier verwaltest du Ziele mit Meilensteinen, Deadlines, Prioritäten und Fortschrittsbalken — Roadmap-Schritt 4."
      />
    </div>
  );
}
