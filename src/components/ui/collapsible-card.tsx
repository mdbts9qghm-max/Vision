import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Aufklappbare Karte auf Basis von <details> — braucht kein JavaScript und
 * bleibt damit auch beim ersten Rendern sofort bedienbar. Optik entspricht
 * der normalen Card (data-slot="card" zieht Verlauf + Schatten).
 */
export function CollapsibleCard({
  title,
  icon,
  subtitle,
  defaultOpen = false,
  children,
  className,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  subtitle?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <details
      data-slot="card"
      open={defaultOpen}
      className={cn(
        "group rounded-xl border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-2 px-6 py-4",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        {icon}
        <span className="min-w-0 flex-1">
          <span className="block font-semibold leading-none">{title}</span>
          {subtitle ? (
            <span className="mt-1 block text-xs text-muted-foreground">
              {subtitle}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="px-6 pb-6">{children}</div>
    </details>
  );
}
