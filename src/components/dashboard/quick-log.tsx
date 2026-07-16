import { MetricInput } from "@/components/fitness/metric-input";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Quick-Log für die Nicht-WHOOP-Werte: Gewicht + Schritte. Die WHOOP-Werte
 * (Schlaf, Recovery, HRV, Ruhepuls) werden direkt im Erholungs-Block erfasst.
 */
export function QuickLog({
  weightToday,
  stepsToday,
}: {
  weightToday?: number;
  stepsToday?: number;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="grid grid-cols-2 gap-3">
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
