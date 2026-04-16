import type { VisibleStats, HiddenStats } from "./stats.js";
import type { ChildhoodProfile } from "./childhood.js";
import type { ParentRelations } from "./parentRelations.js";
import type { LifeLine } from "./lifelines.js";

export type FearType =
  | "fear_of_poverty"
  | "fear_of_loneliness"
  | "fear_of_failure"
  | "fear_of_meaninglessness"
  | "fear_of_dependence"
  | "fear_of_loss_of_control";

export type CompensationType =
  | "overwork"
  | "people_pleasing"
  | "isolation"
  | "consumerism"
  | "perfectionism"
  | "cynicism"
  | "risk_seeking";

export type PersonalLineId =
  | "create"
  | "express"
  | "explore"
  | "build_own"
  | "be_free"
  | "leave_a_mark"
  | "be_needed";

export interface InternalProfile {
  fear: FearType;
  compensation: CompensationType;
  personalLine: PersonalLineId;
  /** Months without any personalLine-tagged action/support */
  personalLineIgnoredMonths: number;
}

export interface Background {
  id: string;
  name: string;
  description: string;
  startingAge: number;
  startingStats: VisibleStats;
  startingHiddenStats: HiddenStats;
  startingRelationshipState: RelationshipStateId;
  traits: string[];
  availablePersonalLines: PersonalLineId[];
}

export type RelationshipStateId =
  | "single"
  | "dating"
  | "committed"
  | "engaged"
  | "married"
  | "separated"
  | "divorced";

export interface CharacterProfile {
  backgroundId: string;
  name: string;
  age: number;
  stats: VisibleStats;
  hiddenStats: HiddenStats;
  internalProfile: InternalProfile;
  relationshipState: RelationshipStateId;
  hasChild: boolean;
  childAgeMonths: number;
  /** 1–12 */
  month: number;
  /** 1–10 */
  year: number;
  /** 0–119 */
  totalMonths: number;
  traits: string[];
  /** Set during onboarding, immutable after game start */
  childhoodProfile: ChildhoodProfile;
  /** Current relationship with parents — can change via events */
  parentRelations: ParentRelations;
  /** One entry per life line; states change during play */
  lifeLines: LifeLine[];
}
