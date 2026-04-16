import type { GameState, ClosedLineRecord } from "../state/GameState.js";
import type { MonthlyAction, SupportAction } from "../types/actions.js";
import type { EventCard, EventOutcome } from "../types/events.js";
import type { MonthRecord } from "../types/summary.js";
import type { StatDelta } from "../types/stats.js";
import type { LifeLineId, LifeLineConfig } from "../types/lifelines.js";
import { StatsEngine } from "./StatsEngine.js";
import { EventEngine } from "./EventEngine.js";
import { applyChildCosts } from "./rules/childRules.js";
import { calculateDefocusDelta, getActionEffectivenessMultiplier } from "./rules/defocusRules.js";
import { RNG } from "../utils/rng.js";

export interface PendingChoice {
  event: EventCard;
  outcome: EventOutcome;
}

/** How many in-game months pass per player turn */
export const MONTHS_PER_TURN = 3;

export interface TurnResult {
  newState: GameState;
  triggeredEvents: EventCard[];
  resolvedOutcomes: EventOutcome[];
  /** Present if an event requires player input — UI must call resolveChoice() */
  pendingChoice: PendingChoice | null;
  yearComplete: boolean;
  gameComplete: boolean;
  /** The 1-based month numbers (1–12) that passed this turn, for the animation */
  passedMonths: number[];
  /** Visible stats before any effects — used by the animation screen */
  statsBefore: import("../types/stats.js").VisibleStats;
  hiddenStatsBefore: import("../types/stats.js").HiddenStats;
}

export class TurnResolver {
  private statsEngine = new StatsEngine();
  private eventEngine = new EventEngine();

  /**
   * Process one month.
   * If a triggered event has playerChoice, returns pendingChoice and
   * the caller must invoke resolveChoice() before finalising the turn.
   */
  resolve(
    state: GameState,
    action: MonthlyAction,
    support: SupportAction | null,
    allEvents: import("../types/events.js").EventCard[],
    rng: RNG,
    playerChoiceOptionId?: "optionA" | "optionB"
  ): TurnResult {
    let s = { ...state.character.stats };
    let h = { ...state.character.hiddenStats };
    const flags = new Set(state.flags);
    const actionRepeatCounts = { ...state.actionRepeatCounts };
    const supportYearCounts = { ...state.supportActionYearCounts };
    const eventCooldowns = { ...state.eventCooldowns };

    const statsBefore = { ...s };
    const triggeredEvents: EventCard[] = [];
    const resolvedOutcomes: EventOutcome[] = [];

    // ---- PHASE 1: ACTION EFFECTS ----
    // Defocus reduces the effectiveness of positive stat gains from actions
    const actionEffectiveness = getActionEffectivenessMultiplier(h.defocus);

    actionRepeatCounts[action.id] = (actionRepeatCounts[action.id] ?? 0) + 1;
    const useRepeat =
      actionRepeatCounts[action.id] >= 3 && action.repeatEffects !== undefined;
    const actionDelta: StatDelta = useRepeat
      ? action.repeatEffects!
      : action.baseEffects;

    ({ stats: s, hiddenStats: h } = this.statsEngine.applyDelta(s, h, actionDelta, actionEffectiveness));

    // Reset repeat counts for all OTHER actions
    for (const id in actionRepeatCounts) {
      if (id !== action.id) actionRepeatCounts[id] = 0;
    }

    // ---- PHASE 2: SUPPORT ACTION ----
    if (support !== null) {
      // Check max per year
      const yearCount = supportYearCounts[support.id] ?? 0;
      const underLimit =
        support.maxPerYear === undefined || yearCount < support.maxPerYear;

      // Check energy cost
      const hasEnergy =
        support.energyCost === undefined || s.energy >= support.energyCost;

      // Check money cost
      const hasMoney =
        support.moneyCost === undefined || s.money >= support.moneyCost;

      if (underLimit && hasEnergy && hasMoney) {
        if (support.energyCost) s.energy = Math.max(0, s.energy - support.energyCost);
        if (support.moneyCost) s.money = Math.max(0, s.money - support.moneyCost);
        ({ stats: s, hiddenStats: h } = this.statsEngine.applyDelta(
          s,
          h,
          support.effects
        ));
        supportYearCounts[support.id] = yearCount + 1;
      }
    }

    // ---- PHASE 3: CHILD COSTS (applied once per turn, representing MONTHS_PER_TURN months) ----
    let childAgeMonths = state.character.childAgeMonths;
    if (state.character.hasChild) {
      for (let i = 0; i < MONTHS_PER_TURN; i++) {
        s = applyChildCosts(s, childAgeMonths + i);
      }
      childAgeMonths += MONTHS_PER_TURN;
    }

    // ---- PHASE 4: EVENTS ----
    const allTags = [
      ...action.tags,
      ...(support?.tags ?? []),
    ];
    const events = this.eventEngine.selectEvents(allEvents, state, allTags, rng);

    let pendingChoice: PendingChoice | null = null;

    for (const event of events) {
      triggeredEvents.push(event);
      eventCooldowns[event.id] = state.character.totalMonths;

      const defaultOutcome = event.outcomes.find(
        (o) => o.id === event.defaultOutcomeId
      )!;

      // If event has playerChoice, check if we have an answer
      if (defaultOutcome.playerChoice) {
        if (playerChoiceOptionId && pendingChoice === null) {
          // Apply chosen option effects
          const chosenEffects =
            defaultOutcome.playerChoice[playerChoiceOptionId].effects;
          ({ stats: s, hiddenStats: h } = this.statsEngine.applyDelta(
            s,
            h,
            chosenEffects
          ));
          resolvedOutcomes.push(defaultOutcome);
        } else if (pendingChoice === null) {
          // Need player input — return pending
          pendingChoice = { event, outcome: defaultOutcome };
          break;
        }
      } else {
        ({ stats: s, hiddenStats: h } = this.statsEngine.applyDelta(
          s,
          h,
          defaultOutcome.effects
        ));
        resolvedOutcomes.push(defaultOutcome);

        // Apply flags
        if (defaultOutcome.flagsSet) {
          for (const f of defaultOutcome.flagsSet) flags.add(f);
        }
        if (defaultOutcome.flagsCleared) {
          for (const f of defaultOutcome.flagsCleared) flags.delete(f);
        }
      }
    }

    // ---- PHASE 5: PERSONAL LINE TRACKING ----
    const personalLineTags: Set<string> = new Set([
      "personal_line",
      "creative",
      "self_expression",
      "freedom",
      "own_project",
    ]);
    const touchedPersonalLine = allTags.some((t) => personalLineTags.has(t));

    let personalLineIgnoredMonths =
      state.character.internalProfile.personalLineIgnoredMonths;
    if (touchedPersonalLine) {
      personalLineIgnoredMonths = 0;
    } else {
      personalLineIgnoredMonths++;
    }

    // ---- PHASE 5b: CASCADE RULES ----
    const cascadeResult = this.statsEngine.applyCascades(
      s,
      h,
      flags,
      personalLineIgnoredMonths
    );
    s = cascadeResult.stats;
    h = cascadeResult.hiddenStats;
    for (const f of cascadeResult.newFlags) flags.add(f);

    // ---- PHASE 5c: DEFOCUS TRACKING ----
    const defocusDelta = calculateDefocusDelta({
      lifeLines: state.character.lifeLines,
      personalLineIgnoredMonths,
    });
    // Scale by MONTHS_PER_TURN since defocus grows monthly
    h.defocus = Math.max(0, Math.min(100, h.defocus + defocusDelta * MONTHS_PER_TURN));

    // Advance suspendedMonths for each suspended life line
    const updatedLifeLines = state.character.lifeLines.map((l) =>
      l.state === "suspended"
        ? { ...l, suspendedMonths: l.suspendedMonths + MONTHS_PER_TURN }
        : l
    );

    // ---- PHASE 6: CLAMP & UPDATE TIME ----
    ({ stats: s, hiddenStats: h } = this.statsEngine.clampAll(s, h));

    // Advance MONTHS_PER_TURN months, tracking which months passed and year crossings
    const passedMonths: number[] = [];
    let currentMonth = state.character.month;
    let currentYear = state.character.year;
    let yearCrossed = false;

    for (let i = 0; i < MONTHS_PER_TURN; i++) {
      passedMonths.push(currentMonth);
      if (currentMonth >= 12) {
        currentMonth = 1;
        currentYear++;
        yearCrossed = true;
      } else {
        currentMonth++;
      }
    }

    const newTotalMonths = state.character.totalMonths + MONTHS_PER_TURN;
    // Age: how many full years since game start
    const newAge = state.character.age +
      (Math.floor(newTotalMonths / 12) - Math.floor(state.character.totalMonths / 12));

    // Reset yearly support counts when a year boundary was crossed
    const newSupportYearCounts = yearCrossed ? {} : supportYearCounts;

    // ---- PHASE 7: RECORD ----
    const record: MonthRecord = {
      month: state.character.month,
      year: state.character.year,
      actionId: action.id,
      supportActionId: support?.id ?? null,
      eventIds: triggeredEvents.map((e) => e.id),
      statsBefore,
      statsAfter: { ...s },
      hiddenStatsAfter: { ...h },
      flags: [...flags],
    };

    const newState: GameState = {
      ...state,
      character: {
        ...state.character,
        stats: s,
        hiddenStats: h,
        month: currentMonth,
        year: currentYear,
        totalMonths: newTotalMonths,
        age: newAge,
        childAgeMonths,
        internalProfile: {
          ...state.character.internalProfile,
          personalLineIgnoredMonths,
        },
        lifeLines: updatedLifeLines,
      },
      closedLineHistory: state.closedLineHistory,
      flags: [...flags],
      actionRepeatCounts,
      supportActionYearCounts: newSupportYearCounts,
      eventCooldowns,
      history: [...state.history, record],
    };

    const yearComplete = yearCrossed;
    const gameComplete = newTotalMonths >= 120;

    return {
      newState,
      triggeredEvents,
      resolvedOutcomes,
      pendingChoice,
      yearComplete,
      gameComplete,
      passedMonths,
      statsBefore,
      hiddenStatsBefore: { ...state.character.hiddenStats },
    };
  }

  /**
   * Permanently close a life line ("Отказаться навсегда").
   * Not a monthly action — doesn't consume the action slot.
   * Returns a new GameState with the line closed, effects applied, and flag set.
   */
  resolveLineClose(
    state: GameState,
    lineId: LifeLineId,
    config: LifeLineConfig
  ): GameState {
    const existing = state.character.lifeLines.find((l) => l.id === lineId);
    if (!existing || existing.state === "closed_forever") return state;

    const updatedLines = state.character.lifeLines.map((l) =>
      l.id === lineId ? { ...l, state: "closed_forever" as const } : l
    );

    // Apply closure StatDelta
    let s = { ...state.character.stats };
    let h = { ...state.character.hiddenStats };
    ({ stats: s, hiddenStats: h } = this.statsEngine.applyDelta(s, h, config.closureEffects));

    // Apply closure flag
    const flags = new Set(state.flags);
    flags.add(config.closureFlag);

    const closureRecord: ClosedLineRecord = {
      lineId,
      closedAtMonth: state.character.totalMonths,
    };

    return {
      ...state,
      character: {
        ...state.character,
        stats: s,
        hiddenStats: h,
        lifeLines: updatedLines,
      },
      flags: [...flags],
      closedLineHistory: [...state.closedLineHistory, closureRecord],
    };
  }
}
