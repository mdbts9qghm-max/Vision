import Link from "next/link";
import { ChevronRight, Target } from "lucide-react";
import type { GoalWithMilestones } from "@/server/queries/goals";
import { milestoneProgress } from "@/domain/goals";
import { diffDaysISO } from "@/domain/dates";
import { Card, CardContent } from "@/components/ui/card";

/** Genau EIN Hauptziel mit Countdown (Spec 2.7) — nie die ganze Liste. */
export function ActiveGoalCard({
  item,
  today,
}: {
  item: GoalWithMilestones;
  today: string;
}) {
  const { goal } = item;
  const progress = milestoneProgress(item.milestones);
  const daysLeft = goal.deadline ? diffDaysISO(today, goal.deadline) : null;

  return (
    <Link href={`/goals/${goal.id}`} className="block">
      <Card className="transition-colors hover:border-primary/50">
        <CardContent className="flex items-center gap-3 py-4">
          <Target className="size-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {goal.title}
              {daysLeft !== null ? (
                <span className="text-muted-foreground">
                  {" "}
                  — {countdown(daysLeft)}
                </span>
              ) : null}
            </p>
            {progress.ratio !== null ? (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${progress.ratio * 100}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {progress.done}/{progress.total}
                </span>
              </div>
            ) : null}
          </div>
          <ChevronRight
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </CardContent>
      </Card>
    </Link>
  );
}

function countdown(daysLeft: number): string {
  if (daysLeft < 0) return `${-daysLeft} Tage überfällig`;
  if (daysLeft === 0) return "heute";
  if (daysLeft <= 21) return `noch ${daysLeft} ${daysLeft === 1 ? "Tag" : "Tage"}`;
  const weeks = Math.round(daysLeft / 7);
  return `noch ${weeks} Wochen`;
}
