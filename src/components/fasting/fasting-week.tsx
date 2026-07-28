import { formatMin, type FastingDay } from "@/domain/fasting";
import { formatDayShort } from "@/domain/dates";
import { SHIFT_TYPE_LABEL } from "@/lib/labels";
import { Card, CardContent } from "@/components/ui/card";
import { ShiftSelect } from "@/components/coach/shift-select";
import { cn } from "@/lib/utils";

/**
 * Wochenübersicht: Schicht + Essensfenster pro Tag. Über die Schichtauswahl
 * lässt sich jeder Tag überschreiben (z. B. V-Schicht einschieben) — der
 * manuelle Eintrag gewinnt immer über die Rotation.
 */
export function FastingWeek({
  days,
  today,
}: {
  days: FastingDay[];
  today: string;
}) {
  return (
    <Card>
      <CardContent className="divide-y divide-border p-0">
        {days.map((d) => (
          <div
            key={d.date}
            className={cn(
              "flex items-center gap-3 px-4 py-3",
              d.date === today && "bg-primary/5",
            )}
          >
            <div className="w-[4.5rem] shrink-0">
              <p
                className={cn(
                  "whitespace-nowrap text-sm font-medium",
                  d.date === today && "text-primary",
                )}
              >
                {formatDayShort(d.date)}
              </p>
              {d.source === "rotation" ? (
                <p className="text-[10px] text-muted-foreground">Rotation</p>
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              {d.window ? (
                <p className="whitespace-nowrap text-sm tabular-nums">
                  {formatMin(d.window.startMin)}–{formatMin(d.window.endMin)}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({d.window.hours} h)
                  </span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {d.shift ? "kein Fasten" : "keine Schicht"}
                </p>
              )}
              <p className="truncate text-xs text-muted-foreground">
                {d.shift ? SHIFT_TYPE_LABEL[d.shift] : "offen"}
              </p>
            </div>

            <ShiftSelect date={d.date} value={d.shift} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
