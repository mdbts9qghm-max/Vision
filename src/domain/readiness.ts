/**
 * Autoregulation (Leitfaden Kap. 8): Der gespeicherte Plan ist die Absicht —
 * der Tageszustand entscheidet über die Ausführung. Warnsignale:
 *   1. Schlaf letzte Nacht < 6 h
 *   2. Erholungs-Check "platt" (low)
 * Entscheidungsregel: ≥2 Signale → Einheit wird Ruhe. 1 Signal → Umfang
 * deutlich reduzieren, Long Run wird zum moderaten Lauf.
 * Verpasste Einheiten sind kein Problem; Infekt/Verletzung kostet Wochen.
 *
 * Pure Logik, keine Framework-Imports.
 */

import type { SessionKind } from "./coach";

export type ReadinessScore = "good" | "ok" | "low";

export interface DaySignals {
  sleepHours: number | null; // null = nicht erfasst
  readiness: ReadinessScore | null; // null = kein Check-in
}

export interface SessionAdjustment {
  kind: SessionKind;
  targetKm?: number;
  targetMin?: number;
  /** Hinweis, warum angepasst wurde — null, wenn der Plan unverändert gilt. */
  note: string | null;
}

export function warningSignals(signals: DaySignals): number {
  let count = 0;
  if (signals.sleepHours !== null && signals.sleepHours < 6) count++;
  if (signals.readiness === "low") count++;
  return count;
}

export function adjustSession(
  session: {
    kind: SessionKind;
    targetKm?: number | null;
    targetMin?: number | null;
  },
  signals: DaySignals,
): SessionAdjustment {
  const kind = session.kind;
  const targetKm = session.targetKm ?? undefined;
  const targetMin = session.targetMin ?? undefined;
  // Ruhe bleibt Ruhe; Mobility ist selbst Erholung und bleibt unangetastet.
  if (kind === "rest" || kind === "mobility") {
    return { kind, targetKm, targetMin, note: null };
  }

  const warnings = warningSignals(signals);
  if (warnings >= 2) {
    return {
      kind: "rest",
      note: "Autoregulation: zu wenig Schlaf und platt — heute ist Erholung das Training. Die Einheit fällt aus, nicht dein Aufbau.",
    };
  }
  if (warnings === 1) {
    const reason =
      signals.readiness === "low"
        ? "Check-in „platt“"
        : "unter 6 h Schlaf";
    if (kind === "gym") {
      return {
        kind,
        targetKm,
        targetMin,
        note: `Autoregulation (${reason}): Kraft nur leicht — weniger Gewicht, keine neuen Reize.`,
      };
    }
    const reducedKm =
      targetKm !== undefined ? Math.max(round1(targetKm * 0.6), 2) : undefined;
    const reducedMin =
      targetMin !== undefined
        ? Math.max(Math.round(targetMin * 0.6), 15)
        : undefined;
    return {
      kind: kind === "longrun" ? "run" : kind,
      targetKm: reducedKm,
      targetMin: reducedMin,
      note: `Autoregulation (${reason}): Umfang reduziert${
        kind === "longrun" ? ", Long Run wird moderater Lauf" : ""
      } — ganz locker bleiben.`,
    };
  }
  return { kind, targetKm, targetMin, note: null };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
