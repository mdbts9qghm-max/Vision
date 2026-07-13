/**
 * Trainings-Coach: regelbasierte, deterministische Wochenplanung für einen
 * Schichtarbeiter im Ultra-Aufbau (Anfänger, ausdauerdominiert).
 *
 * Regeln (aus dem sportmedizinischen Leitfaden):
 * - Long Run auf die beste Freischicht; ersatzweise moderat auf einen
 *   Schlaftag (nie Maximalqualität nach Nachtschicht).
 * - Kraft auf Tagschicht-Tage oder freie Tage, nie am Long-Run-Tag und
 *   nicht direkt danach (~24 h Trennung).
 * - Lockeres Z2 füllt die restlichen Slots; eine Einheit pro Tag.
 * - Nachtschicht = Ruhe (optional 20–30 min locker vor der Schicht).
 * - Wochen mit ≥3 Nachtschichten sind Teil-Deloads (km ×0,75, Gym max 2).
 * - Progressive Overload: ×(1+p) pro Woche, Entlastungswoche (×0,7) alle
 *   `deloadEveryWeeks` Wochen; Steigerung nur, wenn die Vorwoche
 *   ausreichend umgesetzt wurde.
 *
 * Pure Logik, keine Framework-Imports.
 */

import { addDaysISO } from "./dates";

export type ShiftType = "day" | "night" | "sleep" | "free" | "v";
export type SessionKind = "longrun" | "run" | "easy" | "gym" | "rest";

export interface CoachParams {
  weeklyKmBase: number;
  progressionPct: number; // z.B. 7 = +7 %/Woche
  deloadEveryWeeks: number; // z.B. 4 = jede 4. Woche Entlastung
  weeklyGymTarget: number;
}

export interface PlannedDay {
  date: string;
  kind: SessionKind;
  targetKm?: number;
  optional: boolean;
  reason: string;
}

export interface WeekPlan {
  targetKm: number;
  gymTarget: number;
  nightDeload: boolean;
  days: PlannedDay[];
}

const SHIFT_LABEL: Record<ShiftType, string> = {
  day: "Tagschicht",
  night: "Nachtschicht",
  sleep: "Schlaftag",
  free: "Freischicht",
  v: "V-Schicht",
};

/** Basis-Wochenziel nach Formel: Progression + zyklischer Deload. */
export function baseTargetKm(params: CoachParams, weekIndex: number): number {
  const growth = 1 + params.progressionPct / 100;
  let lastGrowthTarget = params.weeklyKmBase;
  let target = params.weeklyKmBase;
  for (let i = 1; i <= weekIndex; i++) {
    if ((i + 1) % params.deloadEveryWeeks === 0) {
      target = lastGrowthTarget * 0.7; // Entlastungswoche
    } else {
      lastGrowthTarget = lastGrowthTarget * growth;
      target = lastGrowthTarget;
    }
  }
  return round1(target);
}

/**
 * Effektives Wochenziel: keine Steigerung, wenn die Vorwoche deutlich
 * (<60 %) unter Plan blieb — dann wird die Vorwoche wiederholt.
 */
export function effectiveTargetKm(
  formulaTarget: number,
  prevPlannedKm: number | null,
  prevActualKm: number | null,
): number {
  if (
    prevPlannedKm !== null &&
    prevActualKm !== null &&
    prevPlannedKm > 0 &&
    prevActualKm < 0.6 * prevPlannedKm &&
    prevPlannedKm < formulaTarget
  ) {
    return prevPlannedKm;
  }
  return formulaTarget;
}

/**
 * Plant eine Woche (Mo–So). `shiftByDate` darf Lücken haben — Tage ohne
 * bekannte Schicht werden nicht verplant.
 */
export function planWeek(
  params: CoachParams,
  weekStart: string, // Montag
  shiftByDate: Record<string, ShiftType | undefined>,
  targetKm: number,
): WeekPlan {
  const dates = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
  const shiftOf = (d: string) => shiftByDate[d];

  const nightCount = dates.filter((d) => shiftOf(d) === "night").length;
  const nightDeload = nightCount >= 3;
  const weekKm = round1(nightDeload ? targetKm * 0.75 : targetKm);
  const gymTarget = Math.min(
    params.weeklyGymTarget,
    nightDeload ? 2 : params.weeklyGymTarget,
  );

  const days = new Map<string, PlannedDay>();
  const claim = (
    date: string,
    kind: SessionKind,
    reason: string,
    targetKmValue?: number,
    optional = false,
  ) => {
    days.set(date, {
      date,
      kind,
      targetKm: targetKmValue,
      optional,
      reason,
    });
  };

  // 1) Fixe Tage: Nachtschichten und unbekannte Schichten.
  for (const d of dates) {
    const s = shiftOf(d);
    if (s === undefined) {
      claim(d, "rest", "Schicht unbekannt — bitte eintragen, dann plane ich den Tag.");
    } else if (s === "night") {
      claim(
        d,
        "rest",
        "Nachtschicht: zirkadianes Tief + Schlafschuld. Nachmittags-Nap; optional 20–30 min ganz locker vor der Schicht.",
        undefined,
        true,
      );
    }
  }
  const available = () => dates.filter((d) => !days.has(d));

  // 2) Long Run: beste Freischicht (Vortag möglichst keine Nachtschicht),
  //    ersatzweise moderat auf einem Schlaftag.
  const lrScore = (d: string): number => {
    const prev = shiftOf(addDaysISO(d, -1));
    if (prev === "free") return 3;
    if (prev === "sleep" || prev === "day") return 2;
    if (prev === undefined || prev === "v") return 1;
    return 0; // Nachtschicht am Vortag
  };
  const freeDays = available().filter((d) => shiftOf(d) === "free");
  const sleepDays = available().filter((d) => shiftOf(d) === "sleep");
  let longRunDay: string | undefined;
  let longRunKm = 0;
  if (freeDays.length > 0) {
    longRunDay = [...freeDays].sort((a, b) => lrScore(b) - lrScore(a))[0];
    longRunKm = round1(weekKm * 0.35);
    claim(
      longRunDay,
      "longrun",
      "Freischicht und ausgeruht — der wichtigste Lauf der Woche. Ganz ruhiges Tempo (Zone 2, Plaudertempo).",
      longRunKm,
    );
  } else if (sleepDays.length > 0) {
    longRunDay = sleepDays[0];
    longRunKm = round1(weekKm * 0.28);
    claim(
      longRunDay,
      "longrun",
      "Keine Freischicht diese Woche: moderater längerer Lauf am Schlaftag-Nachmittag — erst nachschlafen, bewusst gedeckelt.",
      longRunKm,
    );
  }

  // 3) Kraft: Tagschicht-Tage zuerst, dann V, dann frei/Schlaftag —
  //    nie am Long-Run-Tag oder direkt danach.
  const gymOk = (d: string) =>
    longRunDay === undefined ||
    (d !== longRunDay && d !== addDaysISO(longRunDay, 1));
  const gymPriority = (d: string): number => {
    const s = shiftOf(d);
    if (s === "day") return 3;
    if (s === "v") return 2;
    if (s === "free" || s === "sleep") return 1;
    return 0;
  };
  const gymCandidates = available()
    .filter((d) => gymOk(d) && gymPriority(d) > 0)
    .sort((a, b) => gymPriority(b) - gymPriority(a));
  let gymPlanned = 0;
  for (const d of gymCandidates) {
    if (gymPlanned >= gymTarget) break;
    // Nicht zwei Gym-Tage direkt hintereinander.
    const prevDay = days.get(addDaysISO(d, -1));
    const nextDay = days.get(addDaysISO(d, 1));
    if (prevDay?.kind === "gym" || nextDay?.kind === "gym") continue;
    const s = shiftOf(d);
    claim(
      d,
      "gym",
      s === "day" || s === "v"
        ? "Kurze Krafteinheit nach der Schicht (30–45 min): hintere Kette, einbeinig, Rumpf. Kraft stört den Schlaf weniger als Intervalle."
        : s === "sleep"
          ? "Erst nachschlafen, dann Krafteinheit am Nachmittag — mit Abstand zum Long Run."
          : "Krafteinheit am freien Tag — mit Abstand zum Long Run.",
    );
    gymPlanned++;
  }

  // 4) Lockeres Z2-Volumen verteilt die restlichen Kilometer.
  const remainingKm = Math.max(weekKm - longRunKm, 0);
  const runPriority = (d: string): number => {
    const s = shiftOf(d);
    if (s === "free") return 3;
    if (s === "sleep") return 2;
    if (s === "day") return 1;
    if (s === "v") return 0.5;
    return 0;
  };
  const runDays = available()
    .filter((d) => runPriority(d) > 0)
    .sort((a, b) => runPriority(b) - runPriority(a))
    .slice(0, remainingKm >= 12 ? 3 : 2);
  if (runDays.length > 0 && remainingKm >= 3) {
    const perDay = remainingKm / runDays.length;
    runDays.forEach((d, i) => {
      const s = shiftOf(d);
      const km = round1(
        i === runDays.length - 1
          ? remainingKm - round1(perDay) * (runDays.length - 1)
          : perDay,
      );
      if (km < 2) return;
      const isModerate = s === "free" || s === "sleep";
      claim(
        d,
        isModerate ? "run" : "easy",
        s === "sleep"
          ? "Schlaftag: erst nachschlafen, dann lockerer Lauf am Nachmittag — Leistungshoch, aber kein Qualitätsreiz im Schlafdefizit."
          : s === "day"
            ? "Tagschicht: kurzer, ganz lockerer Lauf — früh vor oder direkt nach der Schicht, Umfang klein halten."
            : s === "v"
              ? "V-Schicht: nur kurz und locker — enges Zeitfenster, Schlaf hat Vorrang."
              : "Lockerer Grundlagenlauf (Zone 2) am freien Tag.",
        km,
      );
    });
  }

  // 5) Rest: Ruhetage.
  for (const d of available()) {
    const s = shiftOf(d);
    claim(
      d,
      "rest",
      s === "sleep"
        ? "Ruhetag: Schlaf nachholen ist heute das Training."
        : `Ruhetag (${s ? SHIFT_LABEL[s] : "—"}) — Erholung ist Teil des Plans.`,
    );
  }

  return {
    targetKm: weekKm,
    gymTarget: gymPlanned,
    nightDeload,
    days: dates.map((d) => days.get(d)!),
  };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
