import type { WeeklyProgress } from "@/domain/scoring";
import { Card, CardContent } from "@/components/ui/card";

/** Gesamter Wochenfortschritt über alle aktiven Gewohnheiten. */
export function WeekProgressCard({ progress }: { progress: WeeklyProgress }) {
  if (progress.target === 0) return null;
  const ratio = Math.min(progress.done / progress.target, 1);

  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">Wochenfortschritt</span>
          <span className="text-muted-foreground">
            {progress.done}/{progress.target}
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={progress.done}
          aria-valuemin={0}
          aria-valuemax={progress.target}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
