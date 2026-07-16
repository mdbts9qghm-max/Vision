/**
 * Sofort-Skelett bei Tab-Navigation: Statt auf die Server-Daten zu warten,
 * erscheint umgehend ein Platzhalter — die App fühlt sich instant an.
 */
export default function Loading() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="h-24 animate-pulse rounded-2xl bg-muted/40" />
      <div className="h-14 animate-pulse rounded-xl bg-muted/40" />
      <div className="h-36 animate-pulse rounded-xl bg-muted/40" />
      <div className="h-28 animate-pulse rounded-xl bg-muted/40" />
    </div>
  );
}
