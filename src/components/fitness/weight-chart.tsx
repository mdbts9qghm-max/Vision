"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesPoint } from "@/domain/fitness";

/**
 * Gewichtsverlauf: eine Messgröße in zwei Darstellungen — Tageswerte als
 * gepunktete, gedämpfte Linie (Kontext), 7-Tage-Trend solide in der
 * Akzentfarbe. Unterscheidung läuft über Linienstil + Legende, nicht nur
 * über Farbe (Trend > Einzelwert, siehe UX-Prinzipien).
 */
export function WeightChart({
  daily,
  trend,
}: {
  daily: SeriesPoint[];
  trend: SeriesPoint[];
}) {
  const trendByDate = new Map(trend.map((p) => [p.date, p.value]));
  const data = daily.map((p) => ({
    date: p.date,
    gewicht: p.value,
    trend: round1(trendByDate.get(p.date)),
  }));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <svg width="20" height="6" aria-hidden>
            <line
              x1="0"
              y1="3"
              x2="20"
              y2="3"
              stroke="var(--primary)"
              strokeWidth="2"
            />
          </svg>
          7-Tage-Trend
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="20" height="6" aria-hidden>
            <line
              x1="0"
              y1="3"
              x2="20"
              y2="3"
              stroke="var(--primary)"
              strokeWidth="1.5"
              strokeOpacity="0.45"
              strokeDasharray="2 4"
            />
          </svg>
          Tageswerte
        </span>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              minTickGap={32}
            />
            <YAxis
              domain={["dataMin - 0.5", "dataMax + 0.5"]}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${round1(v)}`}
              width={44}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as {
                  gewicht: number;
                  trend?: number;
                };
                return (
                  <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                    <p className="font-medium">{shortDate(String(label))}</p>
                    <p>Gewicht: {point.gewicht} kg</p>
                    {point.trend !== undefined ? (
                      <p>Trend: {point.trend} kg</p>
                    ) : null}
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="gewicht"
              stroke="var(--primary)"
              strokeOpacity={0.45}
              strokeWidth={1.5}
              strokeDasharray="2 4"
              dot={false}
              activeDot={{ r: 4, fill: "var(--primary)" }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="trend"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.`;
}

function round1(v: number | undefined): number | undefined {
  return v === undefined ? undefined : Math.round(v * 10) / 10;
}
