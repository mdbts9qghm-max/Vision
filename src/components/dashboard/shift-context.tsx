import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";
import type { ShiftType } from "@/domain/coach";
import { SHIFT_TIME_LABEL, SHIFT_TYPE_LABEL } from "@/lib/labels";

/**
 * Kontextzeile (Spec 2.1): Die Schicht ist der Anker des Tages.
 * Ohne hinterlegte Schicht: klare nächste Aktion statt geratener Empfehlung.
 */
export function ShiftContext({ shift }: { shift?: ShiftType }) {
  if (!shift) {
    return (
      <Link
        href="/coach"
        className="flex items-center gap-2 rounded-xl border border-dashed border-muted-foreground/40 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
      >
        <CalendarClock className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">
          Keine Schicht für heute hinterlegt — eintragen
        </span>
        <ChevronRight className="size-4 shrink-0" aria-hidden />
      </Link>
    );
  }

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
      <span className="font-medium text-primary">
        {SHIFT_TYPE_LABEL[shift]}
      </span>
      <span className="text-muted-foreground">{SHIFT_TIME_LABEL[shift]}</span>
    </p>
  );
}
