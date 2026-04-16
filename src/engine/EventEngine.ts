import type { EventCard } from "../types/events.js";
import type { GameState } from "../state/GameState.js";
import { evaluate, type EvalContext } from "../utils/conditionEvaluator.js";
import { RNG } from "../utils/rng.js";

export class EventEngine {
  /**
   * Select 0–2 events to trigger this month.
   * Filters by condition, cooldown, monthOfYear, requiresActionTag, then weighted pick.
   */
  selectEvents(
    allEvents: EventCard[],
    state: GameState,
    actionTags: string[],
    rng: RNG,
    options?: {
      /** Default: 2 */
      maxEvents?: number;
      /** Probability to pick a second event when available. Default: 0.3 */
      secondEventChance?: number;
    }
  ): EventCard[] {
    const { character, flags, eventCooldowns } = state;
    const flagSet = new Set(flags);
    const tagSet = new Set(actionTags);

    // Build eval context
    const ctx: EvalContext = {
      stats: character.stats,
      hiddenStats: character.hiddenStats,
      flags: flagSet,
      activeTags: tagSet,
    };

    // Also expose personalLineIgnoredMonths as a pseudo-stat
    const extendedCtx: EvalContext = {
      ...ctx,
      stats: {
        ...character.stats,
        // totalMonths is used in some events (parent_ill, noticed_time_passing)
      } as typeof character.stats & { totalMonths?: number },
    };
    // Patch: allow totalMonths condition to work
    (extendedCtx as unknown as { totalMonths: number }).totalMonths =
      character.totalMonths;

    // Create a context that can resolve totalMonths and personalLineIgnoredMonths
    const fullCtx: EvalContext & {
      totalMonths: number;
      personalLineIgnoredMonths: number;
    } = {
      stats: character.stats,
      hiddenStats: character.hiddenStats,
      flags: flagSet,
      activeTags: tagSet,
      totalMonths: character.totalMonths,
      personalLineIgnoredMonths:
        character.internalProfile.personalLineIgnoredMonths,
    };

    const candidates = allEvents.filter((event) => {
      // Cooldown check
      const lastTriggered = eventCooldowns[event.id];
      if (
        event.cooldownMonths > 0 &&
        lastTriggered !== undefined &&
        character.totalMonths - lastTriggered < event.cooldownMonths
      ) {
        return false;
      }

      // Month of year check
      if (
        event.monthOfYear !== undefined &&
        event.monthOfYear !== null &&
        event.monthOfYear !== character.month
      ) {
        return false;
      }

      // Required action tag check
      if (event.requiresActionTag && !tagSet.has(event.requiresActionTag)) {
        return false;
      }

      // Condition check — patch stat lookup to include totalMonths
      return evaluateWithExtras(event.triggerCondition, fullCtx);
    });

    if (candidates.length === 0) return [];

    // Pick up to 2 events (weighted, without replacement)
    const results: EventCard[] = [];
    const pool = [...candidates];

    const maxEvents = Math.min(options?.maxEvents ?? 2, pool.length);
    const secondChance = options?.secondEventChance ?? 0.3;
    for (let i = 0; i < maxEvents; i++) {
      if (pool.length === 0) break;
      // Only pick a second event 30% of the time
      if (i === 1 && rng.next() > secondChance) break;

      const picked = rng.weightedPick(pool, (e) => e.weight);
      results.push(picked);
      pool.splice(pool.indexOf(picked), 1);
    }

    return results;
  }
}

// Extended evaluate that also handles totalMonths / personalLineIgnoredMonths
function evaluateWithExtras(
  expr: import("../types/events.js").ConditionExpression,
  ctx: EvalContext & { totalMonths?: number; personalLineIgnoredMonths?: number }
): boolean {
  // Patch: inject totalMonths and personalLineIgnoredMonths into stats for evaluation
  const patchedCtx: EvalContext = {
    ...ctx,
    stats: {
      ...ctx.stats,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      totalMonths: (ctx as any).totalMonths ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      personalLineIgnoredMonths: (ctx as any).personalLineIgnoredMonths ?? 0,
    } as typeof ctx.stats,
  };
  return evaluate(expr, patchedCtx);
}
