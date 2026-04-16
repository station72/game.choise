import type { VisibleStats } from "../../types/stats.js";
import { clamp } from "../../utils/clamp.js";

/** Fixed monthly cost of having a child */
const CHILD_ENERGY_COST = 10;
const CHILD_MONEY_COST = 12;
/** Extra cost for newborns (first 12 months) */
const NEWBORN_EXTRA_ENERGY = 5;

export function applyChildCosts(
  stats: VisibleStats,
  childAgeMonths: number
): VisibleStats {
  const s = { ...stats };
  s.energy = clamp(s.energy - CHILD_ENERGY_COST);
  s.money = clamp(s.money - CHILD_MONEY_COST);
  if (childAgeMonths < 12) {
    s.energy = clamp(s.energy - NEWBORN_EXTRA_ENERGY);
  }
  return s;
}
