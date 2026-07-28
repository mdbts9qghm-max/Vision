"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklyVolume } from "@/domain/fitness";

/**
 * Wochenvolumen: gelaufene km je Woche. Eine Serie — der Kartentitel ersetzt
 * die Legende. Die laufende (noch unfertige) Woche ist gedämpft, damit sie
 * nicht wie ein Einbruch aussieht.
 */
export function WeeklyKmChart({ weeks }: { weeks: WeeklyVolume[] }) {
  const data = weeks.map((w) => ({ ...w, label: shortDate(w.weekStart) }));

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 12, right: 8, bottom: 0, left: 0 }}
          barCategoryGap="25%"
        >
          <defs>
            <linearGradient id="kmBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.35} />
            </linearGradient>
          </defs>
          {/* Hairline, solide — das Gitter bleibt hinter den Daten. */}
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="0"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval="preserveStartEnd"
            minTickGap={20}
          />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={36}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const w = payload[0].payload as WeeklyVolume & { label: string };
              return (
                <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                  <p className="font-medium">
                    Woche ab {w.label}
                    {w.isCurrent ? " (läuft)" : ""}
                  </p>
                  <p>
                    {w.km} km · {w.runs} {w.runs === 1 ? "Lauf" : "Läufe"}
                  </p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="km"
            isAnimationActive={false}
            fill="var(--primary)"
            shape={(props: unknown) => {
              const { x, y, width, height, payload } = props as {
                x: number;
                y: number;
                width: number;
                height: number;
                payload: WeeklyVolume;
              };
              if (height <= 0) return <g />;
              // Balken auf max. 24 px begrenzen, Rest bleibt Luft.
              const w = Math.min(width, 24);
              return (
                <rect
                  x={x + (width - w) / 2}
                  y={y}
                  width={w}
                  height={height}
                  rx={4}
                  ry={4}
                  fill="url(#kmBar)"
                  fillOpacity={payload.isCurrent ? 0.45 : 1}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.`;
}
