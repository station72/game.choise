export type ParentRelationType =
  | "warm"
  | "distant_no_conflict"
  | "tense"
  | "control_and_expectations"
  | "barely_any_contact"
  | "role_inversion";

export interface ParentRelations {
  currentType: ParentRelationType;
  fatherPresent: boolean;
  motherPresent: boolean;
  /** Инверсия ролей — персонаж тащит родителей на себе */
  carryingParents: boolean;
}
