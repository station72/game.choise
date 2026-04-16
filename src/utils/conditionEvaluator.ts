import type {
  ConditionExpression,
  StatCondition,
  TagCondition,
  FlagCondition,
  AndCondition,
  OrCondition,
  NotCondition,
} from "../types/events.js";
import type { VisibleStats, HiddenStats } from "../types/stats.js";

export interface EvalContext {
  stats: VisibleStats;
  hiddenStats: HiddenStats;
  flags: Set<string>;
  /** Tags from the current month's action and support action */
  activeTags: Set<string>;
}

/** Evaluate a ConditionExpression against the current game context */
export function evaluate(expr: ConditionExpression, ctx: EvalContext): boolean {
  if ("and" in expr) return evaluateAnd(expr as AndCondition, ctx);
  if ("or" in expr) return evaluateOr(expr as OrCondition, ctx);
  if ("not" in expr) return !evaluate((expr as NotCondition).not, ctx);
  if ("stat" in expr) return evaluateStat(expr as StatCondition, ctx);
  if ("hasTag" in expr) return evaluateTag(expr as TagCondition, ctx);
  if ("flag" in expr) return evaluateFlag(expr as FlagCondition, ctx);
  return false;
}

function evaluateAnd(expr: AndCondition, ctx: EvalContext): boolean {
  return expr.and.every((child) => evaluate(child, ctx));
}

function evaluateOr(expr: OrCondition, ctx: EvalContext): boolean {
  return expr.or.some((child) => evaluate(child, ctx));
}

function evaluateStat(expr: StatCondition, ctx: EvalContext): boolean {
  const value = getStatValue(expr.stat, ctx);
  if (value === undefined) return false;
  switch (expr.op) {
    case "<":  return value < expr.value;
    case "<=": return value <= expr.value;
    case ">":  return value > expr.value;
    case ">=": return value >= expr.value;
    case "==": return value === expr.value;
    case "!=": return value !== expr.value;
  }
}

function evaluateTag(expr: TagCondition, ctx: EvalContext): boolean {
  return ctx.activeTags.has(expr.hasTag);
}

function evaluateFlag(expr: FlagCondition, ctx: EvalContext): boolean {
  return ctx.flags.has(expr.flag);
}

function getStatValue(stat: string, ctx: EvalContext): number | undefined {
  if (stat in ctx.stats) return ctx.stats[stat as keyof VisibleStats];
  if (stat in ctx.hiddenStats) return ctx.hiddenStats[stat as keyof HiddenStats];
  return undefined;
}
