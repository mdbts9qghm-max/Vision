"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronRight, Moon, UtensilsCrossed } from "lucide-react";
import {
  fastingStatus,
  formatMin,
  type EatingWindow,
} from "@/domain/fasting";
import { USER_TIME_ZONE } from "@/domain/dates";
import { SHIFT_TYPE_LABEL } from "@/lib/labels";
import type { ShiftType } from "@/domain/coach";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Aktuelle Minute des Tages in der Nutzer-Zeitzone. */
function nowMinutes(): number {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: USER_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

/** Tickt jede halbe Minute, damit der Status live bleibt. */
function subscribeToClock(onChange: () => void) {
  const id = setInterval(onChange, 30_000);
  return () => clearInterval(id);
}

/** Auf dem Server gibt es keine Uhrzeit — verhindert Hydration-Abweichungen. */
function serverSnapshot(): number | null {
  return null;
}

/**
 * Live-Status des Essensfensters: zeigt Schicht, Fenster und ob gerade
 * gegessen werden darf. Aktualisiert sich jede Minute.
 */
export function FastingStatusCard({
  shift,
  window,
  nextDayStartMin,
  href = "/fasting",
}: {
  shift?: ShiftType;
  window: EatingWindow | null;
  nextDayStartMin?: number | null;
  /** Ziel des Tipps — auf der Fasten-Seite selbst weglassen. */
  href?: string | null;
}) {
  const min = useSyncExternalStore<number | null>(
    subscribeToClock,
    nowMinutes,
    serverSnapshot,
  );

  const status =
    min === null ? null : fastingStatus(window, min, nextDayStartMin);
  const eating = status?.state === "eating";

  // Fortschritt innerhalb des Fensters (nur während der Essenszeit).
  const progress =
    window && min !== null && eating
      ? Math.min(
          Math.max((min - window.startMin) / (window.endMin - window.startMin), 0),
          1,
        )
      : 0;

  const body = (
    <CardContent className="space-y-3 py-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors",
            eating
              ? "bg-primary/20 text-primary"
              : "bg-muted text-muted-foreground",
          )}
          aria-hidden
        >
          {eating ? (
            <UtensilsCrossed className="size-5" />
          ) : (
            <Moon className="size-5" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            {status === null ? (
              <span className="text-muted-foreground">Fenster wird geladen …</span>
            ) : (
              <span className={eating ? "text-primary" : "text-foreground"}>
                {eating ? "Essen erlaubt" : "Fastenzeit"}
              </span>
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {window
              ? `Fenster ${formatMin(window.startMin)}–${formatMin(window.endMin)} (${window.hours} h)`
              : shift
                ? "Für diese Schicht ist kein Fasten vorgesehen"
                : "Keine Schicht hinterlegt"}
            {shift ? ` · ${SHIFT_TYPE_LABEL[shift]}` : ""}
          </p>
        </div>

        {href ? (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        ) : null}
      </div>

      {window ? (
        <div className="space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-700"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {status?.label ?? " "}
          </p>
        </div>
      ) : null}
    </CardContent>
  );

  if (!href) return <Card>{body}</Card>;

  return (
    <Card className="transition-colors hover:border-primary/40">
      <Link href={href} aria-label="Schicht-Fasten öffnen" className="block">
        {body}
      </Link>
    </Card>
  );
}
