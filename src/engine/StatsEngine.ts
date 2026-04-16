import type { VisibleStats, HiddenStats, StatDelta } from "../types/stats.js";
import { clamp } from "../utils/clamp.js";
import { applyCascades, type CascadeResult } from "./rules/cascadeRules.js";

export class StatsEngine {
  /**
   * Apply a StatDelta to visible and hidden stats.
   * `actionEffectiveness` (0–1) scales only *positive* gains — costs are never reduced.
   * Pass 1.0 (or omit) when no defocus penalty applies.
   */
  applyDelta(
    stats: VisibleStats,
    hiddenStats: HiddenStats,
    delta: StatDelta,
    actionEffectiveness = 1.0
  ): { stats: VisibleStats; hiddenStats: HiddenStats } {
    const s: VisibleStats = { ...stats };
    const h: HiddenStats = { ...hiddenStats };

    /** Scale a delta value: only positive gains are reduced, costs are unchanged. */
    const scale = (v: number) => v > 0 ? v * actionEffectiveness : v;

    // Visible stats
    if (delta.money !== undefined)     s.money     = clamp(s.money     + scale(delta.money));
    if (delta.energy !== undefined)    s.energy    = clamp(s.energy    + scale(delta.energy));
    if (delta.health !== undefined)    s.health    = clamp(s.health    + scale(delta.health));
    if (delta.closeness !== undefined) s.closeness = clamp(s.closeness + scale(delta.closeness));
    if (delta.career !== undefined)    s.career    = clamp(s.career    + scale(delta.career));
    if (delta.stress !== undefined)    s.stress    = clamp(s.stress    + scale(delta.stress));

    // Hidden stats (defocus excluded from effectiveness scaling — it tracks focus state, not gain)
    if (delta.burnout !== undefined)      h.burnout      = clamp(h.burnout      + delta.burnout);
    if (delta.fragility !== undefined)    h.fragility    = clamp(h.fragility    + delta.fragility);
    if (delta.estrangement !== undefined) h.estrangement = clamp(h.estrangement + delta.estrangement);
    if (delta.vitality !== undefined)     h.vitality     = clamp(h.vitality     + delta.vitality);
    if (delta.defocus !== undefined)      h.defocus      = clamp(h.defocus      + delta.defocus);

    return { stats: s, hiddenStats: h };
  }

  /** Run cascade rules and return updated stats + new flags */
  applyCascades(
    stats: VisibleStats,
    hiddenStats: HiddenStats,
    flags: Set<string>,
    personalLineIgnoredMonths: number
  ): CascadeResult {
    return applyCascades(stats, hiddenStats, flags, personalLineIgnoredMonths);
  }

  /** Clamp all stats to [0, 100] */
  clampAll(stats: VisibleStats, hiddenStats: HiddenStats): {
    stats: VisibleStats;
    hiddenStats: HiddenStats;
  } {
    return {
      stats: {
        money: clamp(stats.money),
        energy: clamp(stats.energy),
        health: clamp(stats.health),
        closeness: clamp(stats.closeness),
        career: clamp(stats.career),
        stress: clamp(stats.stress),
      },
      hiddenStats: {
        burnout: clamp(hiddenStats.burnout),
        fragility: clamp(hiddenStats.fragility),
        estrangement: clamp(hiddenStats.estrangement),
        vitality: clamp(hiddenStats.vitality),
        defocus: clamp(hiddenStats.defocus),
      },
    };
  }
}
