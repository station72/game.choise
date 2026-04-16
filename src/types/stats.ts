export type StatName =
  | "money"
  | "energy"
  | "health"
  | "closeness"
  | "career"
  | "stress";

export type HiddenStatName =
  | "burnout"
  | "fragility"
  | "estrangement"
  | "vitality"
  | "defocus";

export type Threshold = "crisis" | "weak" | "normal" | "good" | "strong";

/** Stats where higher = better (money, energy, health, closeness, career, vitality) */
export function getThreshold(value: number): Threshold {
  if (value <= 20) return "crisis";
  if (value <= 40) return "weak";
  if (value <= 60) return "normal";
  if (value <= 80) return "good";
  return "strong";
}

/** Stats where higher = worse (stress, burnout, fragility, estrangement, defocus) */
export function getThresholdInverse(value: number): Threshold {
  if (value >= 80) return "crisis";
  if (value >= 60) return "weak";
  if (value >= 40) return "normal";
  if (value >= 20) return "good";
  return "strong";
}

/** Set of stat/hidden-stat keys that are "higher = worse" */
export const INVERSE_STATS = new Set<string>([
  "stress",
  "burnout",
  "fragility",
  "estrangement",
  "defocus",
]);

export interface VisibleStats {
  money: number;
  energy: number;
  health: number;
  closeness: number;
  career: number;
  stress: number;
}

export interface HiddenStats {
  burnout: number;
  fragility: number;
  estrangement: number;
  vitality: number;
  /** Расфокус — штраф за слишком много открытых несовместимых линий */
  defocus: number;
}

export type StatDelta = Partial<VisibleStats> & Partial<HiddenStats>;
