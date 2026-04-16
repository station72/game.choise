import type { StatDelta } from "./stats.js";

export type LifeLineId =
  | "own_business"
  | "personal_dream"
  | "career_race"
  | "family_dream"
  | "child_dream"
  | "parent_reconciliation"
  | "parent_approval_father"
  | "parent_approval_mother"
  | "another_life_illusion";

export type LifeLineState = "active" | "suspended" | "closed_forever";

export interface LifeLine {
  id: LifeLineId;
  state: LifeLineState;
  /** In-game totalMonths when last acted upon (0 = never) */
  lastActedMonth: number;
  /** How many consecutive months this line has been in "suspended" state */
  suspendedMonths: number;
  /**
   * Player-provided name that overrides the config name.
   * Used for open-ended lines like "personal_dream" and "another_life_illusion".
   */
  customName?: string;
}

/** Static config for a life line — loaded from JSON */
export interface LifeLineConfig {
  id: LifeLineId;
  name: string;
  description: string;
  /** Applied once as StatDelta when the line is closed forever */
  closureEffects: StatDelta;
  /** Flag added to GameState.flags when closed */
  closureFlag: string;
  /** Narrative tags used in EndingEngine to describe harder portraits */
  affectedEndingPortraits: string[];
}
