"use client";

import dynamic from "next/dynamic";

/**
 * Lazy-Variante: Recharts (schweres Bundle) wird erst geladen, wenn die
 * Gewichtskarte wirklich gerendert wird — beschleunigt den Coach-Tab.
 */
export const WeightChart = dynamic(
  () => import("./weight-chart").then((m) => m.WeightChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 w-full animate-pulse rounded-md bg-muted/40" />
    ),
  },
);
