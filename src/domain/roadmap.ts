/**
 * "Road to 100 km": Meilenstein-Leiter vom Einsteiger bis zum 100-km-Ultra,
 * gemessen an der längsten gelaufenen Einzelstrecke. Pure Logik, unit-testbar.
 */

export const ULTRA_TARGET_KM = 100;

export interface Milestone {
  km: number;
  label: string;
}

/** Die Etappen der Reise (aufsteigend). */
export const MILESTONES: Milestone[] = [
  { km: 5, label: "5 km" },
  { km: 10, label: "10 km" },
  { km: 21.1, label: "Halbmarathon" },
  { km: 30, label: "30 km" },
  { km: 42.2, label: "Marathon" },
  { km: 60, label: "60 km" },
  { km: 80, label: "80 km" },
  { km: 100, label: "100 km — Ultra" },
];

export interface MilestoneState extends Milestone {
  reached: boolean;
  isNext: boolean;
}

export interface Roadmap {
  longestRunKm: number;
  /** Fortschritt 0..1 in Richtung 100 km (an der längsten Strecke). */
  progress: number;
  reachedCount: number;
  total: number;
  milestones: MilestoneState[];
  /** Nächster noch nicht erreichter Meilenstein (oder null, wenn 100 km). */
  next: Milestone | null;
  /** Rest-km bis zum nächsten Meilenstein (0, wenn Ziel erreicht). */
  kmToNext: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function roadToUltra(longestRunKm: number): Roadmap {
  const longest = Math.max(longestRunKm, 0);
  const nextIdx = MILESTONES.findIndex((m) => longest < m.km);
  const next = nextIdx >= 0 ? MILESTONES[nextIdx] : null;

  const milestones: MilestoneState[] = MILESTONES.map((m, i) => ({
    ...m,
    reached: longest >= m.km,
    isNext: i === nextIdx,
  }));

  return {
    longestRunKm: round1(longest),
    progress: Math.min(longest / ULTRA_TARGET_KM, 1),
    reachedCount: milestones.filter((m) => m.reached).length,
    total: MILESTONES.length,
    milestones,
    next,
    kmToNext: next ? round1(next.km - longest) : 0,
  };
}
