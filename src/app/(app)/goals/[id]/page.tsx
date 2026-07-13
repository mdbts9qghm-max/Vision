import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Pencil } from "lucide-react";
import { getGoalWithMilestones } from "@/server/queries/goals";
import { milestoneProgress } from "@/domain/goals";
import { diffDaysISO, todayISO } from "@/domain/dates";
import { PRIORITY_LABEL, deadlineLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { MilestoneList } from "@/components/goals/milestone-list";
import { GoalStatusZone } from "@/components/goals/goal-status-zone";

export const metadata: Metadata = { title: "Ziel — Vision" };

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getGoalWithMilestones(id);
  if (!item) notFound();
  const { goal } = item;

  const progress = milestoneProgress(item.milestones);
  const daysLeft = goal.deadline
    ? diffDaysISO(todayISO(), goal.deadline)
    : null;
  const overdue = daysLeft !== null && daysLeft < 0 && goal.status === "active";

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 text-2xl font-bold tracking-tight">
            {goal.title}
          </h1>
          <Link
            href={`/goals/${goal.id}/edit`}
            aria-label="Ziel bearbeiten"
            className="mt-1 shrink-0 p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Pencil className="size-4" aria-hidden />
          </Link>
        </div>
        {goal.why ? (
          <p className="text-sm italic text-muted-foreground">
            &bdquo;{goal.why}&ldquo;
          </p>
        ) : null}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span
            className={cn(
              goal.priority === "high" && "font-medium text-primary",
            )}
          >
            Priorität: {PRIORITY_LABEL[goal.priority]}
          </span>
          {daysLeft !== null ? (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                overdue && "text-destructive",
              )}
            >
              <CalendarDays className="size-3.5" aria-hidden />
              {goal.deadline} · {deadlineLabel(daysLeft)}
            </span>
          ) : null}
          {goal.status === "completed" ? <span>✓ Erreicht</span> : null}
          {goal.status === "archived" ? <span>Archiviert</span> : null}
        </p>
      </header>

      {progress.ratio !== null ? (
        <div className="space-y-1">
          <div
            role="progressbar"
            aria-valuenow={progress.done}
            aria-valuemin={0}
            aria-valuemax={progress.total}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${progress.ratio * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {progress.done}/{progress.total} Meilensteine
          </p>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Meilensteine
        </h2>
        <MilestoneList goalId={goal.id} milestones={item.milestones} />
      </section>

      <GoalStatusZone goalId={goal.id} status={goal.status} />
    </div>
  );
}
