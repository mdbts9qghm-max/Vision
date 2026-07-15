import { Moon } from "lucide-react";
import type { ReadinessScore } from "@/domain/readiness";
import { RECOVERY_RED_BELOW } from "@/domain/readiness";
import { Card, CardContent } from "@/components/ui/card";
import { Ring } from "@/components/ui/ring";
import { ReadinessCheck } from "./readiness-check";

function recoveryColor(pct: number): string {
  if (pct < RECOVERY_RED_BELOW) return "text-destructive";
  if (pct < 67) return "text-amber-500";
  return "text-emerald-500";
}

/**
 * WHOOP-inspirierte Erholungs-Karte: Recovery-Ring (falls geloggt) + Schlaf,
 * dazu der subjektive Ein-Tap-Check. Beide speisen die Autoregulation.
 */
export function RecoveryCard({
  recoveryPct,
  sleepHours,
  readiness,
}: {
  recoveryPct?: number;
  sleepHours?: number;
  readiness: ReadinessScore | null;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <div className="flex items-center gap-4">
          {recoveryPct !== undefined ? (
            <Ring
              value={recoveryPct}
              max={100}
              colorClass={recoveryColor(recoveryPct)}
              ariaLabel={`Recovery ${recoveryPct} Prozent`}
            >
              <span className="text-lg font-bold leading-none">
                {recoveryPct}
                <span className="text-xs font-medium">%</span>
              </span>
              <span className="text-[10px] text-muted-foreground">Recovery</span>
            </Ring>
          ) : (
            <Ring value={0} max={100} ariaLabel="Keine Recovery-Daten">
              <span className="text-xs text-muted-foreground">–</span>
            </Ring>
          )}

          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium">Erholung</p>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Moon className="size-3.5" aria-hidden />
              Schlaf:{" "}
              <span className="text-foreground">
                {sleepHours !== undefined ? `${sleepHours} h` : "–"}
              </span>
            </p>
            {recoveryPct === undefined ? (
              <p className="text-xs text-muted-foreground">
                WHOOP-Werte im Quick-Log unten eintragen.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border pt-3">
          <p className="text-sm text-muted-foreground">Wie fühlst du dich?</p>
          <ReadinessCheck value={readiness} />
        </div>
      </CardContent>
    </Card>
  );
}
