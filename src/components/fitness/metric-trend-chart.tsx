"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesPoint } from "@/domain/fitness";

/**
 * Verlauf einer einzelnen Messgröße als Fläche mit weichem Verlauf.
 * Bewusst EINE Serie je Diagramm — zwei Messgrößen mit verschiedenen
 * Einheiten bekommen zwei Diagramme nebeneinander, nie zwei Y-Achsen.
 */
export function MetricTrendChart({
  points,
  unit,
  domain,
  reference,
  height = 128,
}: {
  points: SeriesPoint[];
  /** Einheit im Tooltip, z. B. "%" oder "h". */
  unit: string;
  domain?: [number | string, number | string];
  /** Optionale Ziel-/Schwellenlinie (gestrichelt, gedämpft). Beschriftet
   *  wird sie in der Bildunterschrift, nicht im Diagramm — bei 128 px Höhe
   *  würde ein Label mit den Daten kollidieren. */
  reference?: number;
  height?: number;
}) {
  // Gradient-IDs müssen je Instanz eindeutig sein — sonst greift der erste.
  const fillId = `trend-${useId().replace(/:/g, "")}`;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 8, right: 6, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.24} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="0"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            minTickGap={24}
          />
          <YAxis
            domain={domain}
            // Feste Zahl an Ticks → gleichmäßige Abstände statt der
            // ungleichen Schritte, die Recharts sonst wählt.
            tickCount={6}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={34}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as SeriesPoint;
              return (
                <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                  <p className="font-medium">{shortDate(String(label))}</p>
                  <p>
                    {Math.round(p.value * 10) / 10} {unit}
                  </p>
                </div>
              );
            }}
          />
          {reference !== undefined ? (
            <ReferenceLine
              y={reference}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          ) : null}
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={`url(#${fillId})`}
            dot={false}
            activeDot={{ r: 4, fill: "var(--primary)" }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.`;
}
