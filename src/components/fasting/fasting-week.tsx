import { formatDuration, formatMin, type FastingDay } from "@/domain/fasting";
import { formatDayShort } from "@/domain/dates";
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
              "space-y-1.5 px-4 py-3",
              d.date === today && "bg-primary/5",
            )}
          >
            {/* Zeile 1: Tag + Schichtauswahl */}
            <div className="flex items-center gap-3">
              <p
                className={cn(
                  "min-w-0 flex-1 whitespace-nowrap text-sm font-medium",
                  d.date === today && "text-primary",
                )}
              >
                {formatDayShort(d.date)}
                {d.source === "rotation" ? (
                  <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                    Rotation
                  </span>
                ) : null}
              </p>
              <ShiftSelect date={d.date} value={d.shift} />
            </div>

            {/* Zeile 2: Fenster + anschließendes Fasten */}
            <p className="text-xs text-muted-foreground">
              {d.window ? (
                <>
                  <span className="tabular-nums text-foreground">
                    {formatMin(d.window.startMin)}–{formatMin(d.window.endMin)}
                  </span>{" "}
                  ({d.window.hours} h Fenster)
                </>
              ) : (
                <>{d.shift ? "kein Fastenfenster" : "keine Schicht"}</>
              )}
              {d.fast ? (
                <>
                  {" · "}
                  <span className={d.fast.short ? "text-amber-500" : undefined}>
                    danach {formatDuration(d.fast.minutes)} Fasten
                  </span>
                </>
              ) : null}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
