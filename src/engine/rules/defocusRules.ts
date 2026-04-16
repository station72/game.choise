import type { LifeLine } from "../../types/lifelines.js";

export interface DefocusInput {
  lifeLines: LifeLine[];
  personalLineIgnoredMonths: number;
}

/**
 * Calculate how much defocus should change this turn.
 * Positive = defocus grows; negative = defocus shrinks.
 * Reduction sources (line closure, recovery actions) are applied via
 * normal StatDelta flows — this function only handles the passive growth.
 */
export function calculateDefocusDelta(input: DefocusInput): number {
  const { lifeLines, personalLineIgnoredMonths } = input;

  const activeCount = lifeLines.filter((l) => l.state === "active").length;
  const suspendedCount = lifeLines.filter((l) => l.state === "suspended").length;
  const suspendedTooLong = lifeLines.some(
    (l) => l.state === "suspended" && l.suspendedMonths > 6
  );

  let delta = 0;

  // Too many active lines
  if (activeCount >= 5) delta += 4;
  else if (activeCount >= 4) delta += 2;
  else if (activeCount >= 3) delta += 1;

  // Each suspended line adds light passive noise
  delta += suspendedCount * 1;

  // Lines lingering in "подвешено" too long amplify the noise
  if (suspendedTooLong) delta += 3;

  // Personal line ignored adds internal conflict
  if (personalLineIgnoredMonths >= 3) delta += 2;

  return delta;
}

/**
 * Compute the action effectiveness multiplier from defocus level.
 * Only positive stat gains are reduced — costs are not diminished.
 */
export function getActionEffectivenessMultiplier(defocus: number): number {
  if (defocus >= 70) return 0.6;
  if (defocus >= 50) return 0.75;
  if (defocus >= 30) return 0.9;
  return 1.0;
}
