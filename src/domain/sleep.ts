/**
 * Schlaf- & Erholungsplan als Tageszeitstrahl, abgeleitet aus der Schicht.
 * Grundlage: docs/coach-leitfaden.md (Kap. 3–5). Pure Logik, keine
 * Framework-Imports.
 *
 * Zeiten sind Minuten seit 00:00 (0..1440) der lokalen Zeit. Über Mitternacht
 * laufende Blöcke werden in zwei Segmente geteilt, damit sie auf einer
 * 00–24-Uhr-Achse korrekt liegen.
 */

import type { ShiftType } from "./coach";

export type SegmentKind = "sleep" | "nap" | "work" | "training";
export type MarkerKind = "caffeine" | "meal" | "light" | "wake";

export interface TimelineSegment {
  startMin: number;
  endMin: number;
  kind: SegmentKind;
  label: string;
}

export interface TimelineMarker {
  atMin: number;
  kind: MarkerKind;
  label: string;
}

export interface SleepPlan {
  title: string;
  segments: TimelineSegment[];
  markers: TimelineMarker[];
  /** Ziel-Schlafdauer des Haupt-Schlafblocks in Stunden. */
  sleepTargetHours: number;
  tips: string[];
  /** Runter-fahren heute Abend (schicht-abhängig). */
  eveningRoutine: string[];
}

/** Uhrzeit → Minuten seit 00:00. */
export function hm(h: number, m = 0): number {
  return h * 60 + m;
}

/** Teilt einen ggf. über Mitternacht laufenden Block in 00–24-Segmente. */
function span(
  startMin: number,
  endMin: number,
  kind: SegmentKind,
  label: string,
): TimelineSegment[] {
  if (endMin <= 1440) return [{ startMin, endMin, kind, label }];
  return [
    { startMin, endMin: 1440, kind, label },
    { startMin: 0, endMin: endMin - 1440, kind, label },
  ];
}

export interface SleepPlanOptions {
  /** Erste Nacht eines Blocks (Vortag war keine Nachtschicht). */
  firstNight?: boolean;
}

/**
 * Liefert den Erholungsplan für die Schichtart. `firstNight` unterscheidet
 * bei Nachtschichten den freien Vormittag (erste Nacht) vom Nachholschlaf
 * (Folgenächte).
 */
export function sleepPlan(
  shift: ShiftType,
  opts: SleepPlanOptions = {},
): SleepPlan {
  switch (shift) {
    case "day":
      return {
        title: "Tagschicht",
        segments: [
          ...span(hm(22, 30), hm(30, 0), "sleep", "Nachtschlaf"),
          { startMin: hm(7), endMin: hm(19), kind: "work", label: "Schicht" },
          {
            startMin: hm(20),
            endMin: hm(20, 20),
            kind: "training",
            label: "Mobility (optional)",
          },
        ],
        markers: [
          { atMin: hm(6), kind: "wake", label: "Aufstehen" },
          { atMin: hm(15), kind: "caffeine", label: "Letztes Koffein" },
          { atMin: hm(19, 45), kind: "meal", label: "Abendessen" },
        ],
        sleepTargetHours: 7.5,
        tips: [
          "Nach der Schicht keine harten Intervalle — das verschlechtert den Schlaf. Kraft oder Mobility ist ok.",
          "Letztes Koffein 6–8 h vor dem Zubettgehen (≈15 Uhr).",
          "Schlafraum dunkel, kühl, leise; feste Zubett-Zeit stabilisiert die innere Uhr.",
        ],
        eveningRoutine: [
          "Letzte größere Mahlzeit ~2 h vor dem Schlaf, danach nur leicht.",
          "1 h vor dem Bett: Licht dimmen, Bildschirme runter.",
          "Schlafraum auf ~18 °C, dunkel und leise vorbereiten.",
          "Zubettgehen ~22:30 anpeilen — feste Zeit hält die innere Uhr stabil.",
        ],
      };

    case "night":
      if (opts.firstNight) {
        return {
          title: "Nachtschicht — erste Nacht",
          segments: [
            { startMin: 0, endMin: hm(7), kind: "sleep", label: "Nachtschlaf" },
            {
              startMin: hm(10),
              endMin: hm(12),
              kind: "training",
              label: "Lockerer Lauf",
            },
            { startMin: hm(14), endMin: hm(16, 30), kind: "nap", label: "Vorschlaf" },
            ...span(hm(19), hm(24), "work", "Schicht"),
          ],
          markers: [
            { atMin: hm(7), kind: "wake", label: "Aufstehen" },
            { atMin: hm(17, 30), kind: "meal", label: "Hauptmahlzeit vor der Schicht" },
            { atMin: hm(19, 30), kind: "caffeine", label: "Koffein zum Schichtstart" },
          ],
          sleepTargetHours: 2.5,
          tips: [
            "Training am freien Vormittag (10–12 Uhr) und ~2 h vor dem Vorschlaf beenden — nicht nach dem Nap.",
            "Vorschlaf 14–17 Uhr ist Pflicht-Werkzeug: 90-min-Zyklus für echte Erholung.",
            "Hauptmahlzeit vor die Schicht legen; nachts nur leichte, proteinbetonte Snacks.",
            "In der Schicht hell, auf dem Heimweg morgens Sonnenbrille.",
          ],
          eveningRoutine: [
            "Vor der Schicht: Hauptmahlzeit gegessen, leichte Snacks für die Nacht einpacken.",
            "Koffein zum Schichtstart — letzte Dosis bis ~00:30.",
            "In der Schicht hell halten (fördert Wachheit).",
            "Sonnenbrille + Blackout fürs Schlafzimmer für den Tagschlaf danach bereitlegen.",
          ],
        };
      }
      return {
        title: "Nachtschicht — Folgenacht",
        segments: [
          { startMin: 0, endMin: hm(7), kind: "work", label: "Schicht" },
          { startMin: hm(8), endMin: hm(14), kind: "sleep", label: "Tagschlaf" },
          { startMin: hm(16), endMin: hm(16, 45), kind: "nap", label: "Kurz-Nap (optional)" },
          ...span(hm(19), hm(24), "work", "Schicht"),
        ],
        markers: [
          { atMin: hm(0, 30), kind: "caffeine", label: "Letztes Koffein (6–8 h vor Tagschlaf)" },
          { atMin: hm(7), kind: "light", label: "Sonnenbrille auf dem Heimweg" },
          { atMin: hm(14), kind: "wake", label: "Aufstehen" },
          { atMin: hm(17, 30), kind: "meal", label: "Hauptmahlzeit vor der Schicht" },
        ],
        sleepTargetHours: 6,
        tips: [
          "Folgenächte sind Erhalt, kein Aufbau: kein Training, der Vormittag gehört dem Schlaf.",
          "Tagschlaf 08–14 Uhr aktiv als zu wenig behandeln — mit Kurz-Nap oder früherem Zubettgehen verlängern.",
          "Kein Koffein mehr ab ~00:30, sonst leidet der ohnehin knappe Tagschlaf.",
        ],
        eveningRoutine: [
          "Vor der nächsten Nacht: Hauptmahlzeit essen, Snacks einpacken.",
          "Kurz-Nap gegen 16 Uhr, falls der Tagschlaf zu knapp war.",
          "Koffein zum Schichtstart, letzte Dosis bis ~00:30.",
          "Schlafzimmer für den morgigen Tagschlaf abdunkeln.",
        ],
      };

    case "sleep":
      return {
        title: "Schlaftag (nach Nachtschicht)",
        segments: [
          { startMin: 0, endMin: hm(7), kind: "work", label: "Schicht (Ende)" },
          { startMin: hm(8), endMin: hm(14), kind: "sleep", label: "Haupt-Tagschlaf" },
          {
            startMin: hm(16),
            endMin: hm(17),
            kind: "training",
            label: "Lockerer Lauf (optional)",
          },
          ...span(hm(22), hm(24), "sleep", "Früher Nachtschlaf"),
        ],
        markers: [
          { atMin: hm(7), kind: "light", label: "Sonnenbrille auf dem Heimweg" },
          { atMin: hm(14), kind: "wake", label: "Aufstehen" },
        ],
        sleepTargetHours: 6.5,
        tips: [
          "~6 h Tagschlaf sind zu wenig — Erholung über 24–48 h ziehen: zweiter Nap oder früh ins Bett.",
          "Nachmittags fällt die freie Zeit ins Leistungshoch, aber du bist im Defizit: nur locker/moderat, keine Qualität.",
          "Schlaf hat heute Vorrang vor jeder zusätzlichen Einheit.",
        ],
        eveningRoutine: [
          "Heute früh ins Bett (~22 Uhr), um die Nachtschicht-Erholung nachzuholen.",
          "Nachmittags kein Koffein mehr; abends Licht dimmen.",
          "Schlafraum dunkel & kühl — jetzt zählt jede Stunde Schlaf.",
        ],
      };

    case "free":
      return {
        title: "Freischicht",
        segments: [
          ...span(hm(23), hm(31), "sleep", "Nachtschlaf"),
          {
            startMin: hm(9),
            endMin: hm(11),
            kind: "training",
            label: "Long Run / Schlüsseleinheit",
          },
        ],
        markers: [
          { atMin: hm(7), kind: "wake", label: "Aufstehen" },
          { atMin: hm(15), kind: "caffeine", label: "Letztes Koffein" },
          { atMin: hm(8), kind: "meal", label: "Frühstück (KH für den Long Run)" },
        ],
        sleepTargetHours: 8,
        tips: [
          "Bester Trainingstag — die wichtigste Einheit der Woche hierhin legen.",
          "Voller Nachtschlaf (~8 h) ist die Basis: nur möglich, wenn keine Nacht vorausging.",
          "Long Run ist auch Ernährungs- und Ausrüstungs-Generalprobe.",
        ],
        eveningRoutine: [
          "Auf ~8 h Schlaf hinarbeiten — die Basis für morgen.",
          "Kohlenhydrate am Abend auffüllen (falls morgen ein Long Run ansteht).",
          "1 h vor dem Bett Bildschirme runter, Licht dimmen; Schlafraum kühl & dunkel.",
        ],
      };

    case "v":
      return {
        title: "V-Schicht",
        segments: [
          ...span(hm(23), hm(30, 30), "sleep", "Nachtschlaf"),
          { startMin: hm(8), endMin: hm(20), kind: "work", label: "Schicht" },
          {
            startMin: hm(20, 45),
            endMin: hm(21, 15),
            kind: "training",
            label: "Locker (optional)",
          },
        ],
        markers: [
          { atMin: hm(6, 30), kind: "wake", label: "Aufstehen" },
          { atMin: hm(15, 30), kind: "caffeine", label: "Letztes Koffein" },
          { atMin: hm(20, 15), kind: "meal", label: "Abendessen" },
        ],
        sleepTargetHours: 7,
        tips: [
          "Wie Tagschicht mit noch engerem Fenster: laufen nur kurz während/nach der Schicht.",
          "Enges Zeitfenster — Schlaf hat Vorrang vor der Einheit.",
        ],
        eveningRoutine: [
          "Nach der späten Schicht bewusst runterfahren — kein intensives Training mehr.",
          "Leichter Snack, kein Koffein; Licht dimmen.",
          "Schlafraum dunkel & kühl, Zubettgehen ~23 Uhr.",
        ],
      };
  }
}

/**
 * Vorbereitung heute für die morgige Schicht. Pure Funktion.
 */
export function tomorrowPrep(
  shift: ShiftType | undefined,
  opts: SleepPlanOptions = {},
): string[] {
  switch (shift) {
    case undefined:
      return [
        "Für morgen ist keine Schicht hinterlegt — im Coach eintragen, dann gebe ich dir die Vorbereitung.",
      ];
    case "day":
      return [
        "Morgen Tagschicht (07–19 Uhr): heute früh genug ins Bett, Wecker stellen.",
        "Kleidung und Tasche schon abends vorbereiten.",
      ];
    case "v":
      return [
        "Morgen V-Schicht (~08–20 Uhr): heute ausreichend schlafen; Training morgen nur kurz möglich.",
      ];
    case "free":
      return [
        "Morgen Freischicht — dein bester Trainingstag: heute voll ausschlafen.",
        "Ausrüstung und Verpflegung für die Schlüsseleinheit schon heute richten.",
      ];
    case "sleep":
      return [
        "Morgen Schlaftag: Tagschlaf 08–14 Uhr fest einplanen, Blackout vorbereiten.",
        "Danach nur locker; Schlaf über den Tag verlängern (zweiter Nap / früh ins Bett).",
      ];
    case "night":
      if (opts.firstNight) {
        return [
          "Morgen erste Nachtschicht: Vormittag für einen lockeren Lauf freihalten (~10–12 Uhr).",
          "Nachmittags-Nap (14–17 Uhr) fest einplanen; Hauptmahlzeit vor die Schicht legen.",
          "Schlafzimmer für den Tagschlaf danach abdunkeln, Sonnenbrille bereitlegen.",
        ];
      }
      return [
        "Morgen Folge-Nachtschicht: Vormittag ist Nachholschlaf, kein Training.",
        "Snacks und Koffein-Plan für die Nacht vorbereiten.",
      ];
  }
}
