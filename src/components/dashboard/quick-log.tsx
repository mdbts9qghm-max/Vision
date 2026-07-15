import { MetricInput } from "@/components/fitness/metric-input";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Quick-Log (Spec 2.8): WHOOP-Werte + Gewicht in unter zwei Sekunden,
 * inline, ohne Seitenwechsel. Schlaf und Recovery speisen die
 * Autoregulation der Trainingsempfehlung.
 */
export function QuickLog({
  weightToday,
  sleepToday,
  recoveryToday,
  hrvToday,
  rhrToday,
  stepsToday,
}: {
  weightToday?: number;
  sleepToday?: number;
  recoveryToday?: number;
  hrvToday?: number;
  rhrToday?: number;
  stepsToday?: number;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="grid grid-cols-2 gap-3">
          <MetricInput
            type="sleep"
            label="Schlaf"
            unit="Std."
            step="0.5"
            todayValue={sleepToday}
          />
          <MetricInput
            type="recovery"
            label="Recovery"
            unit="%"
            step="1"
            todayValue={recoveryToday}
          />
          <MetricInput
            type="hrv"
            label="HRV"
            unit="ms"
            step="1"
            todayValue={hrvToday}
          />
          <MetricInput
            type="rhr"
            label="Ruhepuls"
            unit="bpm"
            step="1"
            todayValue={rhrToday}
          />
          <MetricInput
            type="weight"
            label="Gewicht"
            unit="kg"
            step="0.1"
            todayValue={weightToday}
          />
          <MetricInput
            type="steps"
            label="Schritte"
            unit="Anzahl"
            step="1"
            todayValue={stepsToday}
          />
        </div>
      </CardContent>
    </Card>
  );
}
