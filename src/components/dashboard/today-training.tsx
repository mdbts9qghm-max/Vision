import Link from "next/link";
import {
  Activity,
  BedDouble,
  ChevronRight,
  Dumbbell,
  Footprints,
  Mountain,
  ShieldAlert,
} from "lucide-react";
import type { PlannedSession } from "@/server/queries/coach";
import type { SessionAdjustment } from "@/domain/readiness";
import { SESSION_KIND_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const KIND_ICON = {
  longrun: Mountain,
  run: Footprints,
  easy: Footprints,
  gym: Dumbbell,
  mobility: Activity,
  rest: BedDouble,
} as const;

/**
 * Heutige Trainings-Empfehlung: der Plan ist die Absicht, die
 * Autoregulation (Schlaf + Check-in) entscheidet über die Ausführung.
 */
export function TodayTrainingCard({
  session,
  adjusted,
}: {
  session: PlannedSession;
  adjusted: SessionAdjustment;
}) {
  const Icon = KIND_ICON[adjusted.kind];
  const isRun =
    adjusted.kind === "longrun" ||
    adjusted.kind === "run" ||
    adjusted.kind === "easy";
  const wasAdjusted = adjusted.note !== null;
  const kindChanged =
    adjusted.kind !== session.kind ||
    (adjusted.targetKm ?? null) !== (session.targetKm ?? null) ||
    (adjusted.targetMin ?? null) !== (session.targetMin ?? null);

  return (
    <Link href="/coach" className="block">
      <Card className="transition-colors hover:border-primary/50">
        <CardContent className="flex items-center gap-3 py-4">
          <Icon
            className={cn(
              "size-5 shrink-0",
              adjusted.kind === "rest" || adjusted.kind === "mobility"
                ? "text-muted-foreground"
                : "text-primary",
            )}
            aria-hidden
          />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-medium">
              {SESSION_KIND_LABEL[adjusted.kind]}
              {isRun && adjusted.targetMin
                ? ` · ${adjusted.targetMin} Min.`
                : isRun && adjusted.targetKm
                  ? ` · ${adjusted.targetKm} km`
                  : ""}
              {session.optional && !wasAdjusted ? " (optional)" : ""}
              {wasAdjusted && kindChanged ? (
                <span className="text-muted-foreground">
                  {" "}
                  (statt {SESSION_KIND_LABEL[session.kind]}
                  {session.targetMin
                    ? ` ${session.targetMin} Min.`
                    : session.targetKm
                      ? ` ${session.targetKm} km`
                      : ""})
                </span>
              ) : null}
            </p>
            {wasAdjusted ? (
              <p className="flex items-start gap-1 text-xs text-primary">
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {adjusted.note}
              </p>
            ) : (
              <p className="truncate text-xs text-muted-foreground">
                {session.reason}
              </p>
            )}
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
