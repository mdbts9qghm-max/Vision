import Link from "next/link";
import { BedDouble, ChevronRight, Dumbbell, Footprints, Mountain } from "lucide-react";
import type { PlannedSession } from "@/server/queries/coach";
import { SESSION_KIND_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const KIND_ICON = {
  longrun: Mountain,
  run: Footprints,
  easy: Footprints,
  gym: Dumbbell,
  rest: BedDouble,
} as const;

/** Heutige Trainings-Empfehlung des Coaches auf dem Dashboard. */
export function TodayTrainingCard({ session }: { session: PlannedSession }) {
  const Icon = KIND_ICON[session.kind];
  const isRun =
    session.kind === "longrun" ||
    session.kind === "run" ||
    session.kind === "easy";

  return (
    <Link href="/coach" className="block">
      <Card className="transition-colors hover:border-primary/50">
        <CardContent className="flex items-center gap-3 py-4">
          <Icon
            className={cn(
              "size-5 shrink-0",
              session.kind === "rest" ? "text-muted-foreground" : "text-primary",
            )}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {SESSION_KIND_LABEL[session.kind]}
              {isRun && session.targetKm ? ` · ${session.targetKm} km` : ""}
              {session.optional ? " (optional)" : ""}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {session.reason}
            </p>
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
