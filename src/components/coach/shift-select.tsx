"use client";

import { useTransition } from "react";
import { setShift } from "@/server/actions/coach";
import type { ShiftType } from "@/domain/coach";
import { SHIFT_TYPE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ value: ShiftType | ""; label: string }> = [
  { value: "", label: "Schicht?" },
  { value: "day", label: SHIFT_TYPE_LABEL.day },
  { value: "night", label: SHIFT_TYPE_LABEL.night },
  { value: "sleep", label: SHIFT_TYPE_LABEL.sleep },
  { value: "free", label: SHIFT_TYPE_LABEL.free },
  { value: "v", label: SHIFT_TYPE_LABEL.v },
];

/** Kompakte Schichtauswahl pro Tag; jede Änderung plant sofort neu. */
export function ShiftSelect({
  date,
  value,
}: {
  date: string;
  value?: ShiftType;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label={`Schicht am ${date}`}
      value={value ?? ""}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as ShiftType | "";
        startTransition(async () => {
          await setShift({ date, type: next === "" ? null : next });
        });
      }}
      className={cn(
        "h-8 rounded-md border border-input bg-transparent px-2 text-xs",
        value === undefined ? "text-muted-foreground" : "text-foreground",
        pending && "opacity-50",
      )}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value} className="bg-popover">
          {o.label}
        </option>
      ))}
    </select>
  );
}
