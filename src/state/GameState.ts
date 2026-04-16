import type { CharacterProfile } from "../types/character.js";
import type { LifeComposition } from "../types/composition.js";
import type { MonthRecord, YearSummary } from "../types/summary.js";
import type { LifeLineId } from "../types/lifelines.js";

export interface ClosedLineRecord {
  lineId: LifeLineId;
  closedAtMonth: number;
}

export interface GameState {
  character: CharacterProfile;
  composition: LifeComposition;
  flags: string[];
  /** How many times in a row each monthly action has been chosen */
  actionRepeatCounts: Record<string, number>;
  /** How many times each support action was used this in-game year */
  supportActionYearCounts: Record<string, number>;
  /** eventId → totalMonths when last triggered */
  eventCooldowns: Record<string, number>;
  history: MonthRecord[];
  yearSummaries: YearSummary[];
  rngSeed: number;
  /** History of lines closed forever — used for grief/regret event targeting */
  closedLineHistory: ClosedLineRecord[];
}

export function flagsAsSet(state: GameState): Set<string> {
  return new Set(state.flags);
}
