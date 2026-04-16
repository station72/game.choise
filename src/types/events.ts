import type { StatDelta } from "./stats.js";

// ConditionExpression DSL — evaluated by conditionEvaluator.ts
export type ConditionExpression =
  | StatCondition
  | TagCondition
  | FlagCondition
  | AndCondition
  | OrCondition
  | NotCondition;

export interface StatCondition {
  stat: string;
  op: "<" | "<=" | ">" | ">=" | "==" | "!=";
  value: number;
}

export interface TagCondition {
  hasTag: string;
}

export interface FlagCondition {
  flag: string;
}

export interface AndCondition {
  and: ConditionExpression[];
}

export interface OrCondition {
  or: ConditionExpression[];
}

export interface NotCondition {
  not: ConditionExpression;
}

export interface PlayerChoice {
  optionA: { text: string; effects: StatDelta };
  optionB: { text: string; effects: StatDelta };
}

export interface EventOutcome {
  id: string;
  description: string;
  effects: StatDelta;
  flagsSet?: string[];
  flagsCleared?: string[];
  playerChoice?: PlayerChoice;
}

export interface EventCard {
  id: string;
  title: string;
  description: string;
  triggerCondition: ConditionExpression;
  weight: number;
  /** 0 = never repeats */
  cooldownMonths: number;
  /** null = any month */
  monthOfYear?: number;
  requiresActionTag?: string;
  outcomes: EventOutcome[];
  defaultOutcomeId: string;
  tags: string[];
}
