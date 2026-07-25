/** Kleiner Abschnitts-Titel für die Dashboard-Struktur. */
export function SectionLabel({
  icon,
  children,
  action,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="h-3.5 w-0.5 rounded-full bg-primary/70" aria-hidden />
        {icon}
        {children}
      </div>
      {action}
    </div>
  );
}
