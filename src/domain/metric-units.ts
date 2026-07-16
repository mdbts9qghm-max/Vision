/** Metrik-Typen und ihre Einheiten — geteilt zwischen Action, Sync und UI. */

export type MetricType =
  | "weight"
  | "steps"
  | "sleep"
  | "recovery"
  | "hrv"
  | "rhr";

export const METRIC_UNITS: Record<MetricType, string> = {
  weight: "kg",
  steps: "Schritte",
  sleep: "h",
  recovery: "%",
  hrv: "ms",
  rhr: "bpm",
};
