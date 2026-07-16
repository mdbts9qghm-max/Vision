"use client";

import dynamic from "next/dynamic";

/** Lazy-Variante des 12-Wochen-Charts (Recharts erst bei Bedarf laden). */
export const HabitWeeksChart = dynamic(
  () => import("./habit-weeks-chart").then((m) => m.HabitWeeksChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-44 w-full animate-pulse rounded-md bg-muted/40" />
    ),
  },
);
