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

  // 9. Stress overload: very high stress drains resources across the board
  if (s.stress >= 80) {
    const excess = s.stress - 80; // 0..20
    s.energy = clamp(s.energy - (2 + excess * 0.07));
    h.burnout = clamp(h.burnout + (1 + excess * 0.08));
    h.fragility = clamp(h.fragility + (0.5 + excess * 0.05));
  }

  // 10. Panic mode: at extreme stress you can't sustainably build career
  if (s.stress >= 90) {
    const excess = s.stress - 90; // 0..10
    s.career = clamp(s.career - (2 + excess * 0.6));
    s.health = clamp(s.health - (1 + excess * 0.15));
    if (!flags.has("relationship_single")) {
      s.closeness = clamp(s.closeness - (1 + excess * 0.2));
    }
  }

  // 11. Relationship buffers stress when closeness is high
  if (!flags.has("relationship_single") && s.closeness >= 70) {
    const excess = s.closeness - 70; // 0..30
    s.stress = clamp(s.stress - (3 + excess * 0.05));
    h.burnout = clamp(h.burnout - (2 + excess * 0.03));
    h.vitality = clamp(h.vitality + (1 + excess * 0.03));
  }

  // 12. Relationship strain: very low closeness increases stress and drains vitality
  if (!flags.has("relationship_single") && s.closeness <= 20) {
    const lack = 20 - s.closeness; // 0..20
    s.stress = clamp(s.stress + (3 + lack * 0.08));
    h.vitality = clamp(h.vitality - (2 + lack * 0.05));
  }

  // 13. Estrangement feeds on itself: high estrangement makes closeness decay
  if (!flags.has("relationship_single") && h.estrangement >= 60) {
    const excess = h.estrangement - 60; // 0..40
    s.closeness = clamp(s.closeness - (2 + excess * 0.08));
    s.stress = clamp(s.stress + (1 + excess * 0.05));
  }

  // 14. Money insecurity: low money raises stress and vulnerability
  if (s.money <= 20) {
    const lack = 20 - s.money; // 0..20
    s.stress = clamp(s.stress + (2 + lack * 0.2));
    h.fragility = clamp(h.fragility + (1 + lack * 0.1));
    if (s.money <= 10) h.vitality = clamp(h.vitality - 1);
  } else if (s.money >= 85) {
    // Small positive effect: a cushion reduces background stress
    s.stress = clamp(s.stress - 2);
  }

  // 15. Health crisis: low health drains energy, raises stress and fragility
  if (s.health <= 30) {
    const lack = 30 - s.health; // 0..30
    s.energy = clamp(s.energy - (2 + lack * 0.08));
    s.stress = clamp(s.stress + (2 + lack * 0.1));
    h.fragility = clamp(h.fragility + (1 + lack * 0.08));

    // When the body is in trouble, career momentum stalls.
    if (s.health <= 15) s.career = clamp(s.career - 3);
  }

  // 16. Low vitality: when there's no "why", everything is harder
  if (h.vitality <= 25) {
    const lack = 25 - h.vitality; // 0..25
    s.stress = clamp(s.stress + (2 + lack * 0.08));
    h.burnout = clamp(h.burnout + (1 + lack * 0.05));
  }

  // 17. Fragility tax: high fragility makes health and energy degrade easier
  if (h.fragility >= 70) {
    const excess = h.fragility - 70; // 0..30
    s.health = clamp(s.health - (1 + excess * 0.12));
    s.energy = clamp(s.energy - (1 + excess * 0.05));
  }

  // 18. Exhaustion: when energy is depleted, the body pays for it.
  // This makes "Energy: 0" a real debuff instead of a cosmetic number.
  if (s.energy <= 0) {
    s.stress = clamp(s.stress + 6);
    s.health = clamp(s.health - 4);
    h.burnout = clamp(h.burnout + 4);
  } else if (s.energy <= 10) {
    s.stress = clamp(s.stress + 3);
    s.health = clamp(s.health - 2);
    h.burnout = clamp(h.burnout + 2);
  }

  return { stats: s, hiddenStats: h, newFlags };
}
