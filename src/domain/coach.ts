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
export type SessionKind =
  | "longrun"
  | "run"
  | "easy"
  | "gym"
  | "mobility"
  | "rest";

const DAY_SHIFT_MOBILITY_REASON =
  "Tagschicht: 12-h-Schicht — Training bringt hier mehr Risiko als Reiz. Höchstens 10–15 min Mobility am Abend.";

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
  targetMin?: number;
  optional: boolean;
  reason: string;
}

/**
 * Jahresphasen (Aufbauplan „Von 0 auf 100 km“):
 * Startblock W1–6 (Run-Walk nach Minuten), Basis bis Monat 3,
 * Ausbau Monat 4–6, Ultra-spezifisch ab Monat 7. Tapering folgt mit
 * Renndatum-Periodisierung.
 */
export type Phase = "startblock" | "basis" | "ausbau" | "ultra";

export function phaseForWeek(weekIndex: number): Phase {
  if (weekIndex < 6) return "startblock";
  if (weekIndex < 13) return "basis";
  if (weekIndex < 26) return "ausbau";
  return "ultra";
}

export const PHASE_LABEL: Record<Phase, string> = {
  startblock: "Startblock (Run-Walk)",
  basis: "Basis",
  ausbau: "Ausbau",
  ultra: "Ultra-spezifisch",
};

/** Umfangsdeckel pro Phase (km/Woche) — Progression läuft nie darüber. */
const PHASE_KM_CAP: Record<Phase, number> = {
  startblock: 0, // nicht km-basiert
  basis: 38,
  ausbau: 60,
  ultra: 80,
};

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

/**
 * Basis-Wochenziel nach Formel: Progression + zyklischer Deload,
 * gedeckelt auf den Phasen-Umfang. Der km-Aufbau beginnt nach dem
 * Startblock (weekIndex 6 = erste km-Woche mit der Basis).
 */
export function baseTargetKm(params: CoachParams, weekIndex: number): number {
  const growth = 1 + params.progressionPct / 100;
  let lastGrowthTarget = params.weeklyKmBase;
  let target = params.weeklyKmBase;
  for (let i = 7; i <= weekIndex; i++) {
    const kmWeek = i - 6; // 1-basiert ab der zweiten km-Woche
    const cap = PHASE_KM_CAP[phaseForWeek(i)];
    if ((kmWeek + 1) % params.deloadEveryWeeks === 0) {
      target = lastGrowthTarget * 0.7; // Entlastungswoche
    } else {
      lastGrowthTarget = Math.min(lastGrowthTarget * growth, cap);
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
 * Startblock (Woche 1–6, Aufbauplan Kap. 2): Run-Walk nach Minuten statt
 * Kilometern. 3 Läufe mit mindestens einem Ruhetag dazwischen, längste
 * Einheit auf den besten Tag, Kraft max. 2× an lauffreien Tagen.
 */
const STARTBLOCK_WEEKS: Array<{
  runsMin: number[]; // aufsteigend, letzte = längste Einheit
  structure: string;
}> = [
  { runsMin: [20, 20, 20], structure: "2 Min. laufen / 2 Min. gehen" },
  { runsMin: [25, 25, 25], structure: "3 Min. laufen / 2 Min. gehen" },
  { runsMin: [30, 30, 30], structure: "4 Min. laufen / 1 Min. gehen" },
  {
    runsMin: [20, 20, 20],
    structure:
      "3 Min. laufen / 1 Min. gehen — Entlastungswoche, nur Zone 1 bis unteres Zone 2",
  },
  { runsMin: [30, 30, 40], structure: "5 Min. laufen / 1 Min. gehen" },
  {
    runsMin: [30, 35, 45],
    structure:
      "durchgehend laufen, wenn es sich gut anfühlt — den Longrun weiter als Run-Walk",
  },
];

export function planStartblockWeek(
  weekStart: string,
  shiftByDate: Record<string, ShiftType | undefined>,
  weekIndex: number, // 0–5
): WeekPlan {
  const spec = STARTBLOCK_WEEKS[Math.min(weekIndex, 5)];
  const dates = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
  const shiftOf = (d: string) => shiftByDate[d];
  const days = new Map<string, PlannedDay>();
  const claim = (day: PlannedDay) => days.set(day.date, day);

  for (const d of dates) {
    const s = shiftOf(d);
    if (s === undefined) {
      claim({
        date: d,
        kind: "rest",
        optional: false,
        reason: "Schicht unbekannt — bitte eintragen, dann plane ich den Tag.",
      });
    } else if (s === "night") {
      claim({
        date: d,
        kind: "rest",
        optional: true,
        reason:
          "Nachtschicht: zirkadianes Tief + Schlafschuld. Nachmittags-Nap; Training hat heute frei.",
      });
    } else if (s === "day") {
      claim({
        date: d,
        kind: "mobility",
        optional: true,
        reason: DAY_SHIFT_MOBILITY_REASON,
      });
    }
  }

  // Lauf-Tage: beste Slots, nie zwei Läufe an aufeinanderfolgenden Tagen.
  const score = (d: string): number => {
    const s = shiftOf(d);
    if (s === "free") return 4;
    if (s === "sleep") return 3;
    if (s === "v") return 1;
    return 0;
  };
  const isRunDay = (d: string) => {
    const k = days.get(d)?.kind;
    return k === "longrun" || k === "run" || k === "easy";
  };
  const candidates = dates
    .filter((d) => !days.has(d) && score(d) > 0)
    .sort((a, b) => score(b) - score(a));
  const runsLongestFirst = [...spec.runsMin].sort((a, b) => b - a);
  runsLongestFirst.forEach((minutes, i) => {
    const day = candidates.find(
      (d) =>
        !days.has(d) &&
        !isRunDay(addDaysISO(d, -1)) &&
        !isRunDay(addDaysISO(d, 1)),
    );
    if (!day) return; // weniger Slots als Läufe → lieber weglassen als quetschen
    const isLongest = i === 0 && minutes > Math.min(...spec.runsMin);
    claim({
      date: day,
      kind: isLongest ? "longrun" : "easy",
      targetMin: minutes,
      optional: false,
      reason: `${spec.structure}. Talk-Test: ganze Sätze müssen möglich sein — Gehen in Zone 1 ist vollwertiges Training.`,
    });
  });

  // Kraft/Stabi: max. 2× an lauffreien Tagen.
  let gym = 0;
  for (const d of dates) {
    if (gym >= 2) break;
    if (days.has(d) || score(d) === 0) continue;
    claim({
      date: d,
      kind: "gym",
      optional: false,
      reason:
        "Kraft & Stabi am lauffreien Tag (Rumpf, Hüfte, Waden) — baut die Robustheit auf, der der Bewegungsapparat jetzt hinterherhinkt.",
    });
    gym++;
  }

  for (const d of dates) {
    if (days.has(d)) continue;
    claim({
      date: d,
      kind: "rest",
      optional: false,
      reason:
        "Ruhetag — die Anpassung passiert in der Erholung, nicht im Training.",
    });
  }

  return {
    targetKm: 0,
    gymTarget: gym,
    nightDeload: false,
    days: dates.map((d) => days.get(d)!),
  };
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
  phase: Phase = "ausbau",
): WeekPlan {
  const dates = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
  const shiftOf = (d: string) => shiftByDate[d];

  const nightCount = dates.filter((d) => shiftOf(d) === "night").length;
  const nightDeload = nightCount >= 3;
  const weekKm = round1(nightDeload ? targetKm * 0.75 : targetKm);
  // Basisphase & Nachtschicht-Wochen: Kraft auf 2× begrenzen.
  const gymTarget = Math.min(
    params.weeklyGymTarget,
    nightDeload || phase === "basis" ? 2 : params.weeklyGymTarget,
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

  // 1) Fixe Tage: Nachtschichten, Tagschichten (nur Mobility) und
  //    unbekannte Schichten.
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
    } else if (s === "day") {
      claim(d, "mobility", DAY_SHIFT_MOBILITY_REASON, undefined, true);
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
    // Ab Back-to-Back-Volumen bevorzugt auf den ersten von zwei
    // aufeinanderfolgenden freien Tagen legen.
    let candidates = freeDays;
    if (weekKm >= 40) {
      const withNextFree = freeDays.filter((d) => {
        const next = addDaysISO(d, 1);
        return dates.includes(next) && shiftOf(next) === "free";
      });
      if (withNextFree.length > 0) candidates = withNextFree;
    }
    longRunDay = [...candidates].sort((a, b) => lrScore(b) - lrScore(a))[0];
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

  // 2b) Back-to-Back-Long-Run (Ultra-Aufbau, Leitfaden Kap. 6): ab 40 km
  //     Wochenumfang, wenn direkt auf den Long Run ein freier Tag folgt.
  let b2bKm = 0;
  if (longRunDay !== undefined && weekKm >= 40) {
    const nextDay = addDaysISO(longRunDay, 1);
    if (
      dates.includes(nextDay) &&
      !days.has(nextDay) &&
      shiftOf(nextDay) === "free"
    ) {
      b2bKm = round1(weekKm * 0.25);
      claim(
        nextDay,
        "run",
        "Back-to-Back-Long-Run: zweiter längerer Lauf auf ermüdeten Beinen — trainiert genau die Ermüdungsresistenz, die 100 km verlangen. Betont ruhig.",
        b2bKm,
      );
    }
  }

  // 3) Kraft: Tagschicht-Tage zuerst, dann V, dann frei/Schlaftag —
  //    nie am Long-Run-Tag oder direkt danach.
  const gymOk = (d: string) =>
    longRunDay === undefined ||
    (d !== longRunDay && d !== addDaysISO(longRunDay, 1));
  const gymPriority = (d: string): number => {
    const s = shiftOf(d);
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
      s === "v"
        ? "Kurze Krafteinheit nach der Schicht (30–45 min): hintere Kette, einbeinig, Rumpf. Kraft stört den Schlaf weniger als Intervalle."
        : s === "sleep"
          ? "Erst nachschlafen, dann Krafteinheit am Nachmittag — mit Abstand zum Long Run."
          : "Krafteinheit am freien Tag — mit Abstand zum Long Run.",
    );
    gymPlanned++;
  }

  // 4) Lockeres Z2-Volumen verteilt die restlichen Kilometer.
  const remainingKm = Math.max(weekKm - longRunKm - b2bKm, 0);
  const runPriority = (d: string): number => {
    const s = shiftOf(d);
    if (s === "free") return 3;
    if (s === "sleep") return 2;
    if (s === "v") return 0.5;
    return 0;
  };
  // In der Basisphase gilt: mindestens ein Ruhetag zwischen den Läufen.
  const isRunClaimed = (d: string) => {
    const k = days.get(d)?.kind;
    return k === "longrun" || k === "run" || k === "easy";
  };
  const chosenRunDays: string[] = [];
  const runDays = available()
    .filter((d) => runPriority(d) > 0)
    .sort((a, b) => runPriority(b) - runPriority(a))
    .filter((d) => {
      if (phase !== "basis") return true;
      const adjacent = [addDaysISO(d, -1), addDaysISO(d, 1)];
      if (adjacent.some((n) => isRunClaimed(n) || chosenRunDays.includes(n))) {
        return false;
      }
      chosenRunDays.push(d);
      return true;
    })
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
          ? "Schlaftag: erst nachschlafen, dann lockerer Lauf am Nachmittag — Leistungshoch, aber kein Qualitätsreiz im Schlafdefizit. Talk-Test!"
          : s === "v"
            ? "V-Schicht: nur kurz und locker — enges Zeitfenster, Schlaf hat Vorrang."
            : "Lockerer Grundlagenlauf (Zone 2) am freien Tag — Talk-Test: ganze Sätze müssen möglich sein.",
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
