/**
 * Energy debuff rules.
 *
 * Goal: make "Energy" matter even when it hits 0.
 * - Low energy reduces the effectiveness of *beneficial* positive gains.
 * - At 0 energy we additionally apply an exhaustion penalty in cascade rules.
 */

export function getEnergyEffectivenessMultiplier(energy: number): number {
  // 0 is a special "exhausted" state.
  if (energy <= 0) return 0.6;
  if (energy <= 10) return 0.8;
  if (energy <= 25) return 0.9;
  return 1.0;
}

