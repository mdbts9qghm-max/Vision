"use client";

import { useState } from "react";
import {
  Activity,
  BedDouble,
  Check,
  Dumbbell,
  Footprints,
  Mountain,
} from "lucide-react";
import type { PlannedSession } from "@/server/queries/coach";
import type { ShiftType } from "@/domain/coach";
import { formatLongDate } from "@/domain/dates";
import { SESSION_KIND_LABEL, SHIFT_TYPE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ShiftSelect } from "./shift-select";
import { LogSessionButton } from "./log-session-button";

export interface CalDay {
  date: string;
  active: boolean;
  isToday: boolean;
  shift?: ShiftType;
  session: PlannedSession | null;
  loggable: boolean;
  logged: boolean;
}

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const KIND_ICON = {
  longrun: Mountain,
  run: Footprints,
  easy: Footprints,
  gym: Dumbbell,
  mobility: Activity,
  rest: BedDouble,
} as const;

const SHIFT_TINT: Record<ShiftType, string> = {
  free: "bg-emerald-500/15",
  day: "bg-amber-500/15",
  v: "bg-sky-500/15",
  night: "bg-indigo-500/25",
  sleep: "bg-violet-500/15",
  vacation: "bg-teal-500/20",
  sick: "bg-rose-500/20",
};

const SHIFT_ABBR: Record<ShiftType, string> = {
  day: "T",
  night: "N",
  sleep: "S",
  free: "F",
  v: "V",
  vacation: "U",
  sick: "K",
};

const dayNum = (iso: string) => Number(iso.slice(8, 10));
const isRun = (k?: string) => k === "longrun" || k === "run" || k === "easy";

export function CoachCalendar({
  weeks,
  initialSelected,
}: {
  weeks: CalDay[][];
  initialSelected: string;
}) {
  const [selected, setSelected] = useState(initialSelected);
  const all = weeks.flat();
  const sel = all.find((d) => d.date === selected && d.active) ?? all.find((d) => d.isToday);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-1.5 py-4">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
            {WEEKDAYS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((d) => {
                if (!d.active) {
                  return (
                    <div
                      key={d.date}
                      className="flex h-14 items-start justify-center rounded-md bg-muted/20 pt-1 text-[10px] text-muted-foreground/40"
                    >
                      {dayNum(d.date)}
                    </div>
                  );
                }
                const kind = d.session?.kind ?? "rest";
                const Icon = KIND_ICON[kind];
                const isSel = d.date === sel?.date;
                const km = isRun(kind)
                  ? d.session?.targetMin
                    ? `${d.session.targetMin}′`
                    : d.session?.targetKm
                      ? `${d.session.targetKm}k`
                      : ""
                  : "";
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setSelected(d.date)}
                    className={cn(
                      "relative flex h-14 flex-col items-center justify-between rounded-md border px-0.5 py-1 transition-colors",
                      d.shift ? SHIFT_TINT[d.shift] : "bg-muted/30",
                      isSel
                        ? "border-primary ring-1 ring-primary"
                        : d.isToday
                          ? "border-primary/50"
                          : "border-transparent",
                    )}
                  >
                    <span className="flex w-full items-center justify-between px-0.5 text-[10px] leading-none">
                      <span className={d.isToday ? "font-bold text-primary" : "text-muted-foreground"}>
                        {dayNum(d.date)}
                      </span>
                      <span className="text-[8px] text-muted-foreground">
                        {d.shift ? SHIFT_ABBR[d.shift] : ""}
                      </span>
                    </span>
                    <Icon
                      className={cn(
                        "size-4",
                        kind === "rest" || kind === "mobility"
                          ? "text-muted-foreground"
                          : "text-primary",
                      )}
                      aria-hidden
                    />
                    <span className="text-[8px] leading-none text-muted-foreground">
                      {d.logged ? (
                        <Check className="size-3 text-primary" aria-hidden />
                      ) : (
                        km
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </CardContent>
      </Card>

      {sel ? <DayDetail day={sel} /> : null}
    </div>
  );
}

function DayDetail({ day }: { day: CalDay }) {
  const kind = day.session?.kind ?? "rest";
  const Icon = KIND_ICON[kind];
  const run = isRun(kind);

  return (
    <Card className={day.isToday ? "border-primary/50" : undefined}>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-medium">
            {day.isToday ? "Heute · " : ""}
            {formatLongDate(day.date)}
            {day.shift ? (
              <span className="text-muted-foreground">
                {" "}
                · {SHIFT_TYPE_LABEL[day.shift]}
              </span>
            ) : null}
          </p>
          <div className="shrink-0">
            <ShiftSelect date={day.date} value={day.shift} />
          </div>
        </div>
        {day.session ? (
          <div className="flex items-start gap-3">
            <Icon
              className={cn(
                "mt-0.5 size-4 shrink-0",
                kind === "rest" || kind === "mobility"
                  ? "text-muted-foreground"
                  : "text-primary",
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">{SESSION_KIND_LABEL[kind]}</span>
                {run && day.session.targetMin
                  ? ` · ${day.session.targetMin} Min.`
                  : run && day.session.targetKm
                    ? ` · ${day.session.targetKm} km`
                    : ""}
                {day.session.optional ? " (optional)" : ""}
              </p>
              <p className="text-xs text-muted-foreground">{day.session.reason}</p>
            </div>
            {day.loggable ? (
              <LogSessionButton date={day.date} logged={day.logged} />
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Keine Schicht hinterlegt — oben wählen, dann plane ich den Tag.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
