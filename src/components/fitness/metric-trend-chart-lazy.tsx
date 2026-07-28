"use client";

import dynamic from "next/dynamic";

/** Lazy-Variante — Recharts erst laden, wenn die Karte gerendert wird. */
export const MetricTrendChart = dynamic(
  () => import("./metric-trend-chart").then((m) => m.MetricTrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-32 w-full animate-pulse rounded-md bg-muted/40" />
    ),
  },
);
