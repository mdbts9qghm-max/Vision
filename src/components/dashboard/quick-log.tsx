import { MetricInput } from "@/components/fitness/metric-input";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Quick-Log (Spec 2.8): Gewicht und Schlaf in unter zwei Sekunden,
 * inline, ohne Seitenwechsel. Der Schlafwert speist zugleich die
 * Autoregulation.
 */
export function QuickLog({
  weightToday,
  sleepToday,
}: {
  weightToday?: number;
  sleepToday?: number;
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
            type="sleep"
            label="Schlaf"
            unit="Std."
            step="0.5"
            todayValue={sleepToday}
          />
        </div>
      </CardContent>
    </Card>
  );
}
