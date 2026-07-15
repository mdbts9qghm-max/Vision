import type { SleepPlan, SegmentKind, MarkerKind } from "@/domain/sleep";
import { cn } from "@/lib/utils";

const SEGMENT_STYLE: Record<SegmentKind, string> = {
  sleep: "bg-primary/80",
  nap: "bg-primary/45",
  work: "bg-muted-foreground/25",
  training: "bg-emerald-500/70",
};

const SEGMENT_LABEL: Record<SegmentKind, string> = {
  sleep: "Schlaf",
  nap: "Nap",
  work: "Schicht",
  training: "Training",
};

const MARKER_EMOJI: Record<MarkerKind, string> = {
  caffeine: "☕",
  meal: "🍽️",
  light: "🕶️",
  wake: "⏰",
};

const pct = (min: number) => `${(min / 1440) * 100}%`;
const clock = (min: number) => {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/**
 * 24-Stunden-Tageszeitstrahl: farbige Bänder (Schlaf/Nap/Schicht/Training)
 * plus Marker (Koffein/Mahlzeit/Licht/Aufstehen). Darunter der Ablauf als
 * zeitgestempelte, verlässliche Liste.
 */
export function DayTimeline({ plan }: { plan: SleepPlan }) {
  const hours = [0, 6, 12, 18, 24];
  const orderedSegments = [...plan.segments].sort(
    (a, b) => a.startMin - b.startMin,
  );
  const timelineItems = [
    ...plan.segments.map((s) => ({
      at: s.startMin,
      text: `${clock(s.startMin)}–${clock(s.endMin)} · ${s.label}`,
      emoji: s.kind === "sleep" || s.kind === "nap" ? "😴" : s.kind === "training" ? "🏃" : "🏭",
    })),
    ...plan.markers.map((m) => ({
      at: m.atMin,
      text: `${clock(m.atMin)} · ${m.label}`,
      emoji: MARKER_EMOJI[m.kind],
    })),
  ].sort((a, b) => a.at - b.at);

  return (
    <div className="space-y-4">
      {/* Strahl */}
      <div className="space-y-1">
        <div className="relative h-9 w-full overflow-hidden rounded-md bg-muted/40">
          {/* Stunden-Gitter */}
          {hours.slice(1, -1).map((h) => (
            <div
              key={h}
              className="absolute top-0 h-full w-px bg-border"
              style={{ left: pct(h * 60) }}
            />
          ))}
          {/* Bänder */}
          {orderedSegments.map((s, i) => (
            <div
              key={i}
              className={cn(
                "absolute top-1 flex h-7 items-center overflow-hidden rounded-sm px-1",
                SEGMENT_STYLE[s.kind],
              )}
              style={{
                left: pct(s.startMin),
                width: pct(s.endMin - s.startMin),
              }}
              title={`${clock(s.startMin)}–${clock(s.endMin)} ${s.label}`}
            >
              <span className="truncate text-[10px] font-medium text-foreground">
                {s.label}
              </span>
            </div>
          ))}
        </div>
        {/* Marker-Reihe */}
        <div className="relative h-4 w-full">
          {plan.markers.map((m, i) => (
            <span
              key={i}
              className="absolute -translate-x-1/2 text-[11px]"
              style={{ left: pct(m.atMin) }}
              title={`${clock(m.atMin)} ${m.label}`}
            >
              {MARKER_EMOJI[m.kind]}
            </span>
          ))}
        </div>
        {/* Stunden-Beschriftung */}
        <div className="relative h-4 w-full text-[10px] text-muted-foreground">
          {hours.map((h) => (
            <span
              key={h}
              className={cn(
                "absolute top-0",
                h === 0 ? "left-0" : h === 24 ? "right-0" : "-translate-x-1/2",
              )}
              style={h === 0 || h === 24 ? undefined : { left: pct(h * 60) }}
            >
              {String(h).padStart(2, "0")}
            </span>
          ))}
        </div>
      </div>

      {/* Legende */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {(["sleep", "nap", "work", "training"] as SegmentKind[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={cn("size-3 rounded-sm", SEGMENT_STYLE[k])} />
            {SEGMENT_LABEL[k]}
          </span>
        ))}
      </div>

      {/* Verlässlicher Ablauf als Liste */}
      <ul className="space-y-1.5 text-sm">
        {timelineItems.map((it, i) => (
          <li key={i} className="flex items-baseline gap-2">
            <span aria-hidden>{it.emoji}</span>
            <span>{it.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
