/**
 * Fortschritt eines Ziels — berechnet aus seinen Meilensteinen,
 * nie gespeichert. Pure Logik, keine Framework-Imports.
 */

export interface MilestoneProgress {
  done: number;
  total: number;
  /** 0..1, oder null wenn es keine Meilensteine gibt. */
  ratio: number | null;
}

export function milestoneProgress(
  milestones: Array<{ completedAt: string | null }>,
): MilestoneProgress {
  const total = milestones.length;
  const done = milestones.filter((m) => m.completedAt !== null).length;
  return { done, total, ratio: total === 0 ? null : done / total };
}
