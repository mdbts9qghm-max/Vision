"use client";

import dynamic from "next/dynamic";

/** Lazy-Variante — Recharts erst laden, wenn die Karte gerendert wird. */
export const WeeklyKmChart = dynamic(
  () => import("./weekly-km-chart").then((m) => m.WeeklyKmChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-44 w-full animate-pulse rounded-md bg-muted/40" />
    ),
  },
);
