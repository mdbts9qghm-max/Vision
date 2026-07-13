"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeekHistoryEntry } from "@/domain/history";

/**
 * 12-Wochen-Verlauf: Erledigungen pro Woche als Balken, das Wochensoll als
 * gestrichelte Referenzlinie. Eine Serie — Titel ersetzt die Legende;
 * die laufende (unfertige) Woche ist gedämpft dargestellt.
 */
export function HabitWeeksChart({ history }: { history: WeekHistoryEntry[] }) {
  const target = history.at(-1)?.target ?? 0;
  const data = history.map((w) => ({
    ...w,
    label: shortDate(w.weekStart),
  }));

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 12, right: 8, bottom: 0, left: -24 }}
          barCategoryGap="25%"
        >
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            domain={[0, Math.max(target, 1)]}
            allowDecimals={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const w = payload[0].payload as WeekHistoryEntry & {
                label: string;
              };
              return (
                <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                  <p className="font-medium">
                    Woche ab {w.label}
                    {w.isCurrent ? " (läuft)" : ""}
                  </p>
                  <p>
                    {w.done}/{w.target} erledigt
                  </p>
                </div>
              );
            }}
          />
          <ReferenceLine
            y={target}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
          <Bar
            dataKey="done"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
            fill="var(--primary)"
            // Recharts erlaubt Zell-Styling über fillOpacity pro Datenpunkt
            // nicht direkt — die laufende Woche dämpfen wir per shape.
            shape={(props: unknown) => {
              const { x, y, width, height, payload } = props as {
                x: number;
                y: number;
                width: number;
                height: number;
                payload: WeekHistoryEntry;
              };
              if (height <= 0) return <g />;
              return (
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  rx={4}
                  ry={4}
                  fill="var(--primary)"
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
