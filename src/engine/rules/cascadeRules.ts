import type { VisibleStats, HiddenStats } from "../../types/stats.js";
import { clamp } from "../../utils/clamp.js";

export interface CascadeResult {
  stats: VisibleStats;
  hiddenStats: HiddenStats;
  newFlags: string[];
}

/**
 * Apply all cascade rules from GDD §22.
 * Called at the end of every turn after all deltas have been applied.
 */
export function applyCascades(
  stats: VisibleStats,
  hiddenStats: HiddenStats,
  flags: Set<string>,
  personalLineIgnoredMonths: number
): CascadeResult {
  const s = { ...stats };
  const h = { ...hiddenStats };
  const newFlags: string[] = [];

  // 1. Career → Stress: high career without energy raises stress
  if (s.career >= 70 && s.energy < 40) {
    const excess = s.career - 60;
    s.stress = clamp(s.stress + excess * 0.15);
  }

  // 2. Stress → Health: high stress slowly erodes health
  if (s.stress >= 60) {
    const excess = s.stress - 60;
    s.health = clamp(s.health - excess * 0.1);
  }

  // 3. Closeness decay: low closeness with a partner accelerates estrangement
  if (!flags.has("relationship_single") && s.closeness < 30) {
    h.estrangement = clamp(h.estrangement + 5);
  }

  // 4. Personal line neglect → vitality loss (GDD §22)
  if (personalLineIgnoredMonths >= 3) {
    h.vitality = clamp(h.vitality - 3);
  }

  // 5. Low vitality → meaning crisis risk flag
  if (h.vitality < 20) {
    newFlags.push("meaning_crisis_risk");
  }

  // 6. Burnout active: when burnout is severe it drains energy and health each turn
  if (h.burnout >= 70 || flags.has("burnout_active")) {
    if (h.burnout >= 70) newFlags.push("burnout_active");
    s.energy = clamp(s.energy - 5);
    s.health = clamp(s.health - 2);
  }

  // 7. Defocus → stress: scattered focus amplifies stress
  if (h.defocus >= 40) {
    const excess = h.defocus - 40;
    s.stress = clamp(s.stress + excess * 0.1);
  }

  // 8. Severe defocus: extreme scatter actively drains energy and raises a flag
  if (h.defocus >= 70) {
    newFlags.push("defocus_severe");
    s.energy = clamp(s.energy - 3);
  }

  return { stats: s, hiddenStats: h, newFlags };
}
