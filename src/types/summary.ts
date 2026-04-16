import type { VisibleStats, HiddenStats } from "./stats.js";

export interface MonthRecord {
  month: number;
  year: number;
  actionId: string;
  supportActionId: string | null;
  eventIds: string[];
  statsBefore: VisibleStats;
  statsAfter: VisibleStats;
  hiddenStatsAfter: HiddenStats;
  flags: string[];
}

export type PersonalLineStatus = "following" | "ignoring" | "lost";

export interface YearPanels {
  /** Panel 1: Material reality */
  statsOverview: VisibleStats;
  /** Panel 2: Body / hidden stats hints */
  hiddenInsight: string[];
  /** Panel 3: Key events this year */
  keyEvents: string[];
  /** Panel 4: Personal line status */
  personalLineStatus: PersonalLineStatus;
  /** Panel 5: Year pattern phrase */
  yearPattern: string;
}

export interface YearSummary {
  year: number;
  panels: YearPanels;
  monthHistory: MonthRecord[];
}

export interface EndingProfile {
  totalYears: number;
  finalStats: VisibleStats;
  finalHiddenStats: HiddenStats;
  archetypeTitle: string;
  narrative: string;
  keyChoices: string[];
}
