import type { StatDelta } from "./stats.js";
import type { ConditionExpression } from "./events.js";

export interface MonthlyAction {
  id: string;
  name: string;
  description: string;
  baseEffects: StatDelta;
  /** Applied instead of baseEffects when chosen 3+ months in a row */
  repeatEffects?: StatDelta;
  availableIf?: ConditionExpression | null;
  tags: string[];
  moneyCost?: number;
  blockedSupportActions?: string[];
}

export interface SupportAction {
  id: string;
  name: string;
  description: string;
  effects: StatDelta;
  availableIf?: ConditionExpression | null;
  tags: string[];
  moneyCost?: number;
  energyCost?: number;
  /** Max uses per in-game year */
  maxPerYear?: number;
}
