/**
 * Ernährungs-/Fuel-Plan, abgeleitet aus Schicht + heutiger Einheit + Gewicht.
 * Grundlage: docs/coach-leitfaden.md (Kap. 5 „Ernährung"). Pure Logik, keine
 * Framework-Imports — voll unit-testbar.
 *
 * Kernregeln aus dem Leitfaden:
 *  - Protein 1,6–2,2 g/kg/Tag, 0,3–0,4 g/kg pro Mahlzeit alle 3–4 h.
 *  - Kohlenhydrate periodisieren (mehr an harten/langen Tagen).
 *  - Ultra-Fueling: 60–90 g KH/h in langen Einheiten, Darm trainieren.
 *  - Schicht-Timing: Hauptmahlzeit vor die Nachtschicht, nachts leichte
 *    Protein-Snacks, vor dem Tagschlaf keine große Mahlzeit.
 */

import type { ShiftType, SessionKind } from "./coach";

export interface ProteinTarget {
  /** Tagesziel-Spanne in Gramm (1,6–2,2 g/kg). */
  minG: number;
  maxG: number;
  /** Pro Mahlzeit (0,3–0,4 g/kg). */
  perMealG: number;
  /** Empfohlene Anzahl proteinhaltiger Mahlzeiten (alle 3–4 h). */
  meals: number;
}

export interface CarbFueling {
  /** Geschätzte Dauer der Einheit in Minuten. */
  durationMin: number;
  /** KH pro Stunde (Spanne). */
  perHourMinG: number;
  perHourMaxG: number;
  /** Gesamtbedarf über die Einheit (gerundet). */
  totalMinG: number;
  totalMaxG: number;
}

export interface NutritionPlan {
  /** Kurze Tageszusammenfassung (eine Zeile). */
  headline: string;
  /** Personalisiert — nur wenn ein Gewicht bekannt ist. */
  protein?: ProteinTarget;
  /** Nur bei langen Einheiten (>90 min) relevant. */
  carbs?: CarbFueling;
  /** Schicht-abhängiges Mahlzeiten-Timing. */
  shiftTips: string[];
  /** Fueling rund um die heutige Einheit. */
  trainingTips: string[];
  /** Flüssigkeit/Elektrolyte. */
  hydrationTips: string[];
}

const round5 = (n: number) => Math.round(n / 5) * 5;

/** Tages-Proteinziel aus dem Körpergewicht (1,6–2,2 g/kg, 0,35 g/kg pro Mahlzeit). */
export function proteinTarget(weightKg: number): ProteinTarget {
  return {
    minG: round5(1.6 * weightKg),
    maxG: round5(2.2 * weightKg),
    perMealG: Math.round(0.35 * weightKg),
    meals: 4,
  };
}

/** Grobe Dauerschätzung einer Einheit (min). Nutzt targetMin, sonst ~7 min/km. */
function estimateDurationMin(
  kind: SessionKind,
  targetKm?: number | null,
  targetMin?: number | null,
): number {
  if (targetMin && targetMin > 0) return targetMin;
  if (targetKm && targetKm > 0) return Math.round(targetKm * 7);
  // Ohne Vorgabe grobe Defaults je Art.
  if (kind === "longrun") return 120;
  if (kind === "run") return 60;
  if (kind === "easy") return 45;
  return 45;
}

/**
 * KH-Bedarf für lange Einheiten. Erst ab ~90 min lohnt Fueling während des
 * Laufs (Darm trainieren, 60–90 g/h) — darunter genügt Wasser. `null` = kein
 * In-Race-Fueling nötig.
 */
export function carbFueling(
  kind: SessionKind,
  targetKm?: number | null,
  targetMin?: number | null,
): CarbFueling | null {
  if (kind !== "longrun" && kind !== "run") return null;
  const durationMin = estimateDurationMin(kind, targetKm, targetMin);
  if (durationMin < 90) return null;
  const hours = durationMin / 60;
  return {
    durationMin,
    perHourMinG: 60,
    perHourMaxG: 90,
    totalMinG: round5(60 * hours),
    totalMaxG: round5(90 * hours),
  };
}

/** Schicht-abhängiges Mahlzeiten-/Koffein-Timing (Leitfaden Kap. 5). */
export function shiftFuelTips(
  shift: ShiftType,
  opts: { firstNight?: boolean } = {},
): string[] {
  switch (shift) {
    case "day":
      return [
        "Hauptmahlzeiten in die Tagphase legen — vor der Schicht ordentlich frühstücken.",
        "Letztes Koffein ~15 Uhr (6–8 h vor dem Schlaf).",
        "Nach der Schicht eine proteinreiche Mahlzeit zur Regeneration.",
      ];
    case "v":
      return [
        "Frühstück vor der Schicht, über den langen Tag regelmäßig essen.",
        "Letztes Koffein ~15:30, damit der Schlaf nicht leidet.",
        "Nach der späten Schicht nur noch leicht essen.",
      ];
    case "night":
      if (opts.firstNight) {
        return [
          "Hauptmahlzeit VOR die Schicht (~17:30 Uhr) — nicht mitten in der Nacht.",
          "Vor dem Vorschlaf (ab 14 Uhr) nichts Schweres essen.",
          "Nachts nur leichte, proteinbetonte Snacks (Quark, Nüsse, Skyr).",
          "Koffein zum Schichtstart, letzte Dosis bis ~00:30.",
        ];
      }
      return [
        "Vor der Nacht eine Hauptmahlzeit essen; nachts leichte Protein-Snacks.",
        "Vor dem Tagschlaf (08 Uhr) keine große Mahlzeit — sonst leidet der Schlaf.",
        "Kein Koffein mehr ab ~00:30.",
      ];
    case "sleep":
      return [
        "Vor dem Tagschlaf (08 Uhr) keine große Mahlzeit — höchstens einen leichten Snack.",
        "Nach dem Aufstehen (~14 Uhr) proteinreich essen und den Tag über auffüllen.",
        "Nachmittags kein Koffein mehr, damit der Nachholschlaf klappt.",
      ];
    case "vacation":
    case "free":
      return [
        "Normaler Tagesrhythmus — die Chance für saubere, regelmäßige Mahlzeiten.",
        "Vor der Schlüsseleinheit kohlenhydratreich frühstücken.",
        "Letztes Koffein ~15 Uhr.",
      ];
    case "sick":
      return [
        "Krank: leichte, nährstoffreiche Kost — Suppe, Obst, genug Protein.",
        "Viel trinken (Wasser, Tee) — Flüssigkeit hilft beim Gesundwerden.",
        "Kein Leistungsdruck beim Essen; iss, worauf du Appetit hast.",
      ];
  }
}

/** Fueling rund um die heutige Einheit. */
export function trainingFuelTips(
  kind: SessionKind,
  carbs: CarbFueling | null,
  protein?: ProteinTarget,
): string[] {
  const postProtein = protein
    ? `Innerhalb 1–2 h danach ${protein.perMealG} g Protein + Kohlenhydrate zur Regeneration.`
    : "Innerhalb 1–2 h danach Protein + Kohlenhydrate zur Regeneration.";

  switch (kind) {
    case "longrun":
      return [
        "2–3 h vorher eine kohlenhydratreiche Mahlzeit (z. B. Haferflocken, Banane, Toast).",
        carbs
          ? `Unterwegs ${carbs.perHourMinG}–${carbs.perHourMaxG} g KH/h (≈ ${carbs.totalMinG}–${carbs.totalMaxG} g gesamt) — Darm trainieren, Long Run ist die Generalprobe.`
          : "Bei über 90 min unterwegs Kohlenhydrate zuführen (Gel, Riegel, Getränk).",
        "Natrium & Flüssigkeit einplanen; verschiedene Produkte testen, nichts Neues am Wettkampftag.",
        postProtein,
      ];
    case "run":
      return [
        "1–2 h vorher ein leichter, kohlenhydratbetonter Snack.",
        carbs
          ? `Bei dieser Länge unterwegs ${carbs.perHourMinG}–${carbs.perHourMaxG} g KH/h einplanen.`
          : "Wasser reicht für die Dauer; danach normal essen.",
        postProtein,
      ];
    case "easy":
      return [
        "Nüchtern oder mit kleinem Snack machbar — locker heißt locker.",
        postProtein,
      ];
    case "gym":
      return [
        "Vorher ein Snack mit Kohlenhydraten + etwas Protein für die Kraftleistung.",
        postProtein,
      ];
    case "mobility":
      return [
        "Kein spezielles Fuel nötig — auf das gleichmäßige Tages-Protein achten.",
      ];
    case "rest":
      return [
        "Ruhetag: Protein über den Tag verteilt hält die Regeneration am Laufen.",
        "Kohlenhydrate etwas zurückfahren (periodisieren) — kein hoher Bedarf ohne Einheit.",
      ];
  }
}

export interface NutritionPlanInput {
  shift: ShiftType;
  kind?: SessionKind;
  targetKm?: number | null;
  targetMin?: number | null;
  weightKg?: number;
  firstNight?: boolean;
}

/** Stellt den kompletten Fuel-Plan für heute zusammen. */
export function nutritionPlan(input: NutritionPlanInput): NutritionPlan {
  const { shift, kind, targetKm, targetMin, weightKg, firstNight } = input;
  const protein = weightKg ? proteinTarget(weightKg) : undefined;
  const carbs = kind ? carbFueling(kind, targetKm, targetMin) : null;

  const headline = protein
    ? `Heute ${protein.minG}–${protein.maxG} g Protein${carbs ? " · lange Einheit → Kohlenhydrate hochfahren" : ""}`
    : carbs
      ? "Lange Einheit heute → Kohlenhydrate hochfahren"
      : "Regelmäßig proteinreich essen, Timing an die Schicht anpassen";

  return {
    headline,
    protein,
    carbs: carbs ?? undefined,
    shiftTips: shiftFuelTips(shift, { firstNight }),
    trainingTips: kind
      ? trainingFuelTips(kind, carbs, protein)
      : [
          "Keine Einheit heute — Fokus auf gleichmäßiges Protein und leichte Kost.",
        ],
    hydrationTips: [
      "Über den Tag verteilt trinken — nicht erst bei Durst.",
      carbs
        ? "An der langen Einheit Natrium/Elektrolyte zusätzlich einplanen."
        : "An Trainingstagen etwas mehr trinken, Elektrolyte bei Hitze.",
    ],
  };
}
