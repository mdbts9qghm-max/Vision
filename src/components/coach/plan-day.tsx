import { Activity, BedDouble, Dumbbell, Footprints, Mountain } from "lucide-react";
import type { PlannedSession } from "@/server/queries/coach";
import type { ShiftType } from "@/domain/coach";
import { SESSION_KIND_LABEL } from "@/lib/labels";
import { formatDayShort } from "@/domain/dates";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ShiftSelect } from "./shift-select";

const KIND_ICON = {
  longrun: Mountain,
  run: Footprints,
  easy: Footprints,
  gym: Dumbbell,
  mobility: Activity,
  rest: BedDouble,
} as const;

export function PlanDay({
  date,
  shift,
  session,
  isToday,
}: {
  date: string;
  shift?: ShiftType;
  session?: PlannedSession;
  isToday: boolean;
}) {
  const kind = session?.kind ?? "rest";
  const Icon = KIND_ICON[kind];
  const isRun = kind === "longrun" || kind === "run" || kind === "easy";

  return (
    <Card className={cn(isToday && "border-primary/50")}>
      <CardContent className="space-y-2 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-medium">
            {isToday ? "Heute · " : ""}
            {formatDayShort(date)}
          </p>
          <div className="shrink-0">
            <ShiftSelect date={date} value={shift} />
          </div>
        </div>
        {session ? (
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
            <div className="min-w-0">
              <p className="text-sm">
                <span className="font-medium">{SESSION_KIND_LABEL[kind]}</span>
                {isRun && session.targetMin
                  ? ` · ${session.targetMin} Min.`
                  : isRun && session.targetKm
                    ? ` · ${session.targetKm} km`
                    : ""}
                {session.optional ? " (optional)" : ""}
              </p>
              <p className="text-xs text-muted-foreground">{session.reason}</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
