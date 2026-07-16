import { Apple, Droplets, Flame, UtensilsCrossed } from "lucide-react";
import type { NutritionPlan } from "@/domain/nutrition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function TipList({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
}) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </p>
      <ul className="space-y-2 text-sm">
        {items.map((t, i) => (
          <li key={i} className="flex items-baseline gap-2">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
            <span className="text-muted-foreground">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Fuel-Plan für heute: personalisiertes Protein-/KH-Ziel + Timing-Tipps. */
export function NutritionCard({
  plan,
  sessionLabel,
}: {
  plan: NutritionPlan;
  sessionLabel?: string;
}) {
  return (
    <Card>
      <CardHeader className="gap-1">
        <CardTitle className="flex items-center gap-2">
          <Apple className="size-5 text-primary" aria-hidden />
          Ernährung
        </CardTitle>
        <p className="text-sm text-muted-foreground">{plan.headline}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {plan.protein || plan.carbs ? (
          <div className="grid grid-cols-2 gap-3">
            {plan.protein ? (
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-3">
                <p className="text-xs text-muted-foreground">Protein / Tag</p>
                <p className="text-lg font-bold leading-tight">
                  {plan.protein.minG}–{plan.protein.maxG}
                  <span className="ml-1 text-xs font-medium text-muted-foreground">
                    g
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  ≈ {plan.protein.perMealG} g über {plan.protein.meals} Mahlzeiten
                </p>
              </div>
            ) : null}
            {plan.carbs ? (
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-3">
                <p className="text-xs text-muted-foreground">
                  Kohlenhydrate unterwegs
                </p>
                <p className="text-lg font-bold leading-tight">
                  {plan.carbs.perHourMinG}–{plan.carbs.perHourMaxG}
                  <span className="ml-1 text-xs font-medium text-muted-foreground">
                    g/h
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  ≈ {plan.carbs.totalMinG}–{plan.carbs.totalMaxG} g gesamt
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <TipList
          title="Timing zur Schicht"
          icon={<UtensilsCrossed className="size-3.5" aria-hidden />}
          items={plan.shiftTips}
        />
        <TipList
          title={sessionLabel ? `Rund ums Training · ${sessionLabel}` : "Rund ums Training"}
          icon={<Flame className="size-3.5" aria-hidden />}
          items={plan.trainingTips}
        />
        <TipList
          title="Trinken"
          icon={<Droplets className="size-3.5" aria-hidden />}
          items={plan.hydrationTips}
        />
      </CardContent>
    </Card>
  );
}
