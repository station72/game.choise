import type { StatDelta } from "./stats.js";
import type { LifeLineId } from "./lifelines.js";
import type { FearType, CompensationType } from "./character.js";

export type WhoWasPresent =
  | "both_parents"
  | "mother_only"
  | "father_only"
  | "mother_and_stepfather"
  | "father_and_stepmother"
  | "grandparents"
  | "one_emotionally_absent"
  | "one_parent_gone";

export type HomeAtmosphere =
  | "warm_but_poor"
  | "cold_and_poor"
  | "cold_and_demanding"
  | "chaotic_unstable"
  | "normal_but_empty"
  | "safe_but_overprotective"
  | "wealthy_but_dry";

export type ParentModel =
  | "warm_accepting"
  | "warm_anxious"
  | "cold_distant"
  | "controlling"
  | "sacrificial"
  | "unpredictable"
  | "emotionally_dependent"
  | "strong_but_distant"
  | "cold_evaluating"
  | "absent"
  | "soft_powerless"
  | "shaming"
  | "chaotic";

export type ChildhoodLesson =
  | "love_must_be_earned"
  | "cant_relax"
  | "asking_is_pointless"
  | "cant_make_mistakes"
  | "be_convenient"
  | "closeness_is_dangerous"
  | "money_equals_safety"
  | "duty_first_life_second"
  | "desires_get_in_the_way"
  | "nobody_will_save_you";

/** Stored on the character — immutable after game start */
export interface ChildhoodProfile {
  cardId: string;
  whoWasPresent: WhoWasPresent;
  homeAtmosphere: HomeAtmosphere;
  motherModel: ParentModel;
  fatherModel: ParentModel;
  mainLesson: ChildhoodLesson;
}

/** JSON card loaded from data/childhood/childhood-cards.json */
export interface ChildhoodCard {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  profile: Omit<ChildhoodProfile, "cardId">;
  /** Applied once at game start on top of background stats */
  statModifiers: StatDelta;
  /** Extra traits granted at start */
  traits: string[];
  /** Life lines that start as "active" */
  initialActiveLines: LifeLineId[];
  /** Life lines that start as "suspended" */
  initialSuspendedLines: LifeLineId[];
  /** Suggested internal fear for this childhood profile */
  suggestedFear?: FearType;
  /** Suggested compensation pattern for this childhood profile */
  suggestedCompensation?: CompensationType;
}
