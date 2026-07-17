import { Flag, Footprints } from "lucide-react";
import { roadToUltra } from "@/domain/roadmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** "Road to 100 km": Meilenstein-Leiter, gemessen am längsten Lauf. */
export function RoadToUltra({
  longestRunKm,
  totalRunKm,
}: {
  longestRunKm: number;
  totalRunKm: number;
}) {
  const road = roadToUltra(longestRunKm);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Flag className="size-5 text-primary" aria-hidden />
          Road to 100 km
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {road.reachedCount}/{road.total} Etappen
        </span>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="flex items-baseline gap-1">
              <Footprints className="size-4 self-center text-primary/70" aria-hidden />
              <span className="text-2xl font-bold leading-none">
                {road.longestRunKm}
              </span>
              <span className="text-sm font-medium text-muted-foreground">km</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">längster Lauf</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold leading-none">
              {Math.round(totalRunKm)}
              <span className="ml-1 text-xs font-medium text-muted-foreground">
                km
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">gesamt gelaufen</p>
          </div>
        </div>

        {/* Meilenstein-Leiter */}
        <div className="flex items-start">
          {road.milestones.map((m, i) => (
            <div key={m.km} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {/* linke Verbindung */}
                <span
                  className={cn(
                    "h-0.5 flex-1 rounded",
                    i === 0
                      ? "opacity-0"
                      : road.milestones[i - 1].reached
                        ? "bg-primary"
                        : "bg-muted",
                  )}
                />
                <span
                  className={cn(
                    "size-3 shrink-0 rounded-full border-2 transition-colors",
                    m.reached
                      ? "border-primary bg-primary"
                      : m.isNext
                        ? "animate-pulse border-primary bg-background"
                        : "border-muted bg-muted",
                  )}
                  aria-hidden
                />
                {/* rechte Verbindung */}
                <span
                  className={cn(
                    "h-0.5 flex-1 rounded",
                    i === road.milestones.length - 1
                      ? "opacity-0"
                      : m.reached
                        ? "bg-primary"
                        : "bg-muted",
                  )}
                />
              </div>
              <span
                className={cn(
                  "mt-1.5 text-[10px] tabular-nums",
                  m.reached
                    ? "font-semibold text-foreground"
                    : m.isNext
                      ? "font-semibold text-primary"
                      : "text-muted-foreground",
                )}
              >
                {Math.round(m.km)}
              </span>
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          {road.next ? (
            <>
              Nächste Etappe:{" "}
              <span className="font-medium text-foreground">
                {road.next.label}
              </span>{" "}
              — noch{" "}
              <span className="font-medium text-foreground">
                {road.kmToNext} km
              </span>
            </>
          ) : (
            <span className="font-medium text-emerald-500">
              100 km geknackt — Ultra-Ziel erreicht! 🎉
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
