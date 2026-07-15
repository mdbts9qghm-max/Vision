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
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {children}
      </div>
      {action}
    </div>
  );
}
