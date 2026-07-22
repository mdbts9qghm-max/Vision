import { Activity, HeartPulse, Moon } from "lucide-react";
import type { ReadinessScore } from "@/domain/readiness";
import { RECOVERY_RED_BELOW } from "@/domain/readiness";
import { Card, CardContent } from "@/components/ui/card";
import { Ring } from "@/components/ui/ring";
import { ReadinessCheck } from "./readiness-check";
import { WhoopInputs } from "./whoop-inputs";

function recoveryColor(pct: number): string {
  if (pct < RECOVERY_RED_BELOW) return "text-destructive";
  if (pct < 67) return "text-amber-500";
  return "text-emerald-500";
}

/**
 * Erholungs-Karte: Recovery-Ring (falls geloggt) + Schlaf, HRV & Ruhepuls,
 * der subjektive Ein-Tap-Check und der tägliche Morgen-Check zum Eintragen der
 * WHOOP-Werte. Alles speist die Autoregulation.
 */
export function RecoveryCard({
  recoveryPct,
  sleepHours,
  hrvToday,
  rhrToday,
  readiness,
}: {
  recoveryPct?: number;
  sleepHours?: number;
  hrvToday?: number;
  rhrToday?: number;
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
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Activity className="size-3.5" aria-hidden />
                HRV:{" "}
                <span className="text-foreground">
                  {hrvToday !== undefined ? `${hrvToday} ms` : "–"}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <HeartPulse className="size-3.5" aria-hidden />
                Puls:{" "}
                <span className="text-foreground">
                  {rhrToday !== undefined ? `${rhrToday} bpm` : "–"}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border pt-3">
          <p className="text-sm text-muted-foreground">Wie fühlst du dich?</p>
          <ReadinessCheck value={readiness} />
        </div>

        <WhoopInputs
          sleepToday={sleepHours}
          recoveryToday={recoveryPct}
          hrvToday={hrvToday}
          rhrToday={rhrToday}
        />
      </CardContent>
    </Card>
  );
}
