/**
 * Mentaler Tages-Check-in: Stimmung, Energie, Stress auf einer 1–5-Skala.
 * Pure Logik (keine Framework-Imports) — voll unit-testbar.
 *
 * Konvention: Bei Stimmung/Energie ist hoch = gut. Bei Stress ist hoch =
 * schlecht. Für ein einheitliches Wohlbefinden wird Stress invertiert.
 */

export type CheckinFacet = "mood" | "energy" | "stress";

export interface Checkin {
  date: string; // YYYY-MM-DD
  mood?: number | null;
  energy?: number | null;
  stress?: number | null;
  note?: string | null;
}

export interface FacetMeta {
  key: CheckinFacet;
  label: string;
  higherIsBetter: boolean;
  /** Labels für Stufe 1..5 (Index 0 = Stufe 1). */
  levels: [string, string, string, string, string];
  emojis: [string, string, string, string, string];
}

export const FACETS: FacetMeta[] = [
  {
    key: "mood",
    label: "Stimmung",
    higherIsBetter: true,
    levels: ["sehr schlecht", "schlecht", "neutral", "gut", "sehr gut"],
    emojis: ["😞", "🙁", "😐", "🙂", "😄"],
  },
  {
    key: "energy",
    label: "Energie",
    higherIsBetter: true,
    levels: ["leer", "niedrig", "okay", "gut", "voll"],
    emojis: ["🪫", "🔅", "⚡", "🔋", "🚀"],
  },
  {
    key: "stress",
    label: "Stress",
    higherIsBetter: false,
    levels: ["entspannt", "ruhig", "mittel", "hoch", "überlastet"],
    emojis: ["😌", "🙂", "😬", "😰", "🤯"],
  },
];

export function facetMeta(facet: CheckinFacet): FacetMeta {
  const m = FACETS.find((f) => f.key === facet);
  if (!m) throw new Error(`Unbekannte Facette: ${facet}`);
  return m;
}

/** Label für eine konkrete Stufe (1..5). */
export function facetLevelLabel(facet: CheckinFacet, level: number): string {
  const m = facetMeta(facet);
  const idx = Math.min(Math.max(Math.round(level), 1), 5) - 1;
  return m.levels[idx];
}

/** Ist für heute überhaupt etwas erfasst? */
export function hasCheckin(c: Checkin | undefined | null): boolean {
  return (
    !!c &&
    (c.mood != null ||
      c.energy != null ||
      c.stress != null ||
      (c.note ?? "").trim() !== "")
  );
}

/** Mittelwert einer Facette über mehrere Check-ins (null-Werte ignoriert). */
export function averageFacet(
  checkins: Checkin[],
  facet: CheckinFacet,
): number | null {
  const vals = checkins
    .map((c) => c[facet])
    .filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(avg * 10) / 10;
}

/**
 * Wohlbefinden 0–100 aus einem Check-in: Stimmung + Energie + invertierter
 * Stress, gemittelt über die vorhandenen Facetten. `null`, wenn nichts erfasst.
 */
export function wellbeingScore(c: Checkin): number | null {
  const parts: number[] = [];
  if (c.mood != null) parts.push(c.mood);
  if (c.energy != null) parts.push(c.energy);
  if (c.stress != null) parts.push(6 - c.stress); // invertiert
  if (parts.length === 0) return null;
  const avg = parts.reduce((a, b) => a + b, 0) / parts.length; // 1..5
  return Math.round(((avg - 1) / 4) * 100); // → 0..100
}

export interface CheckinSummary {
  mood: number | null;
  energy: number | null;
  stress: number | null;
  wellbeing: number | null;
  count: number; // Anzahl Tage mit mindestens einem Wert
}

/** Fasst eine Menge Check-ins zusammen (z. B. eine Woche). */
export function summarizeCheckins(checkins: Checkin[]): CheckinSummary {
  const withData = checkins.filter(hasCheckin);
  const wellbeings = withData
    .map(wellbeingScore)
    .filter((v): v is number => v != null);
  const wellbeing =
    wellbeings.length > 0
      ? Math.round(wellbeings.reduce((a, b) => a + b, 0) / wellbeings.length)
      : null;
  return {
    mood: averageFacet(checkins, "mood"),
    energy: averageFacet(checkins, "energy"),
    stress: averageFacet(checkins, "stress"),
    wellbeing,
    count: withData.length,
  };
}
