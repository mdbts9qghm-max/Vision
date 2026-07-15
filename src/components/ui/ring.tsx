import { cn } from "@/lib/utils";

/**
 * Kreisförmiger Fortschrittsring (SVG). Farbe kommt über `colorClass`
 * (currentColor). Für echte Kennzahlen — keine Gamification.
 */
export function Ring({
  value,
  max,
  size = 72,
  stroke = 7,
  colorClass = "text-primary",
  trackClass = "text-muted",
  children,
  ariaLabel,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  colorClass?: string;
  trackClass?: string;
  children?: React.ReactNode;
  ariaLabel?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const offset = c * (1 - ratio);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className={cn("text-muted", trackClass)}
          stroke="currentColor"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={cn("transition-[stroke-dashoffset] duration-700", colorClass)}
          stroke="currentColor"
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}
