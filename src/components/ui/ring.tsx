"use client";

import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Kreisförmiger Fortschrittsring (SVG). Farbe kommt über `colorClass`
 * (currentColor). Für echte Kennzahlen — keine Gamification. Füllt sich beim
 * Erscheinen sanft von 0 auf den Zielwert.
 */
export function Ring({
  value,
  max,
  size = 72,
  stroke = 7,
  colorClass = "text-primary",
  trackClass = "text-muted",
  children,
  ariaLabel,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  colorClass?: string;
  trackClass?: string;
  children?: React.ReactNode;
  ariaLabel?: string;
}) {
  const gradientId = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const offset = c * (1 - ratio);

  // Beim Mount von "leer" (c) auf den Zielwert animieren.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel}
    >
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        {/*
         * Verlauf aus der eigenen Farbe (currentColor mit fallender Deckkraft):
         * gibt den Bogen-Look der Vorlage, ohne die Status-Farben zu brechen.
         */}
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.45" />
          </linearGradient>
        </defs>
        {/* Track: hellere Stufe derselben Fläche, nicht Grau. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className={cn("text-muted", trackClass)}
          stroke="currentColor"
        />
        <g className={colorClass}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={mounted ? offset : c}
            stroke={`url(#${gradientId})`}
            className="transition-[stroke-dashoffset] duration-1000 ease-out"
            style={{ filter: "drop-shadow(0 0 6px currentColor)" }}
          />
        </g>
      </svg>
      {children ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}
