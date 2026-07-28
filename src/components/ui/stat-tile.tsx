import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Kennzahl-Kachel im Look der Vorlage: kleines Label, große Zahl, farbige
 * Icon-Kachel rechts. Optional ein Vergleichswert (Delta) darunter.
 *
 * Große Einzelzahlen bewusst OHNE tabular-nums — proportionale Ziffern wirken
 * in Displaygrößen ruhiger.
 */
export function StatTile({
  label,
  value,
  unit,
  icon,
  delta,
  deltaGood,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  /** z. B. "+2,4 km" — Richtung färbt sich über `deltaGood`. */
  delta?: string;
  deltaGood?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="mt-0.5 flex items-baseline gap-1">
            <span className="text-xl font-bold leading-none">{value}</span>
            {unit ? (
              <span className="text-xs font-medium text-muted-foreground">
                {unit}
              </span>
            ) : null}
          </p>
          {delta ? (
            <p
              className={cn(
                "mt-1 text-[11px] font-medium",
                deltaGood === undefined
                  ? "text-muted-foreground"
                  : deltaGood
                    ? "text-emerald-400"
                    : "text-orange-400",
              )}
            >
              {delta}
            </p>
          ) : null}
        </div>
        {icon ? (
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_20px_-8px_var(--primary)]"
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
