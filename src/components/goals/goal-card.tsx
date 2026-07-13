import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import type { GoalWithMilestones } from "@/server/queries/goals";
import { milestoneProgress } from "@/domain/goals";
import { diffDaysISO, todayISO } from "@/domain/dates";
import { PRIORITY_LABEL, deadlineLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function GoalCard({ item }: { item: GoalWithMilestones }) {
  const { goal } = item;
  const progress = milestoneProgress(item.milestones);
  const daysLeft = goal.deadline
    ? diffDaysISO(todayISO(), goal.deadline)
    : null;
  const overdue = daysLeft !== null && daysLeft < 0 && goal.status === "active";

  return (
    <Link href={`/goals/${goal.id}`} className="block">
      <Card className="transition-colors hover:border-primary/50">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{goal.title}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span
                  className={cn(
                    goal.priority === "high" && "font-medium text-primary",
                  )}
                >
                  {PRIORITY_LABEL[goal.priority]}
                </span>
                {daysLeft !== null ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      overdue && "text-destructive",
                    )}
                  >
                    <CalendarDays className="size-3.5" aria-hidden />
                    {deadlineLabel(daysLeft)}
                  </span>
                ) : null}
              </p>
            </div>
            <ChevronRight
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
          </div>

          {progress.ratio !== null ? (
            <div className="space-y-1">
              <div
                role="progressbar"
                aria-valuenow={progress.done}
                aria-valuemin={0}
                aria-valuemax={progress.total}
                className="h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${progress.ratio * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {progress.done}/{progress.total} Meilensteine
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Noch keine Meilensteine
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
