import { describe, it, expect } from "vitest";
import { TurnResolver } from "../../src/engine/TurnResolver.js";
import { makeRNG } from "../../src/utils/rng.js";
import type { GameState } from "../../src/state/GameState.js";
import type { MonthlyAction } from "../../src/types/actions.js";
import type { VisibleStats, HiddenStats } from "../../src/types/stats.js";

function makeStats(overrides: Partial<VisibleStats> = {}): VisibleStats {
  return { money: 50, energy: 50, health: 50, closeness: 50, career: 50, stress: 30, ...overrides };
}
function makeHidden(overrides: Partial<HiddenStats> = {}): HiddenStats {
  return { burnout: 10, fragility: 10, estrangement: 10, vitality: 60, defocus: 0, ...overrides };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    character: {
      backgroundId: "reliable_start",
      name: "Test",
      age: 25,
      stats: makeStats(),
      hiddenStats: makeHidden(),
      internalProfile: {
        fear: "fear_of_failure",
        compensation: "perfectionism",
        personalLine: "explore",
        personalLineIgnoredMonths: 0,
      },
      relationshipState: "single",
      hasChild: false,
      childAgeMonths: 0,
      month: 1,
      year: 1,
      totalMonths: 0,
      traits: [],
      childhoodProfile: {
        cardId: "default",
        whoWasPresent: "both_parents",
        homeAtmosphere: "normal_but_empty",
        motherModel: "warm_accepting",
        fatherModel: "cold_distant",
        mainLesson: "cant_relax",
      },
      parentRelations: {
        currentType: "distant_no_conflict",
        fatherPresent: true,
        motherPresent: true,
        carryingParents: false,
      },
      lifeLines: [],
    },
    composition: {
      jobTitle: "Test",
      livingArrangement: "renting",
      activeGoals: [],
    },
    flags: ["relationship_single"],
    actionRepeatCounts: {},
    supportActionYearCounts: {},
    eventCooldowns: {},
    history: [],
    yearSummaries: [],
    rngSeed: 42,
    closedLineHistory: [],
    ...overrides,
  };
}

const careerAction: MonthlyAction = {
  id: "career_push",
  name: "Карьерный рывок",
  description: "Test",
  baseEffects: { career: 8, money: 5, energy: -12, stress: 10, closeness: -5 },
  repeatEffects: { career: 6, money: 4, energy: -15, stress: 14, closeness: -7, burnout: 8 },
  tags: ["work", "overworked", "career_focus"],
  availableIf: null,
};

const recoveryAction: MonthlyAction = {
  id: "recovery",
  name: "Восстановление",
  description: "Test",
  baseEffects: { energy: 15, health: 8, stress: -12, burnout: -10, career: -3, money: -4 },
  tags: ["rest", "health"],
  availableIf: null,
};

describe("TurnResolver", () => {
  const resolver = new TurnResolver();
  const rng = makeRNG(42);

  it("applies action effects", () => {
    const state = makeState();
    const result = resolver.resolve(state, careerAction, null, [], rng);
    expect(result.newState.character.stats.career).toBeGreaterThan(50);
    expect(result.newState.character.stats.energy).toBeLessThan(50);
  });

  it("advances 3 months per turn", () => {
    const state = makeState(); // starts at month 1
    const result = resolver.resolve(state, careerAction, null, [], rng);
    expect(result.newState.character.month).toBe(4);       // 1 + 3
    expect(result.newState.character.totalMonths).toBe(3); // 3 months passed
    expect(result.passedMonths).toEqual([1, 2, 3]);
  });

  it("year rolls over when crossing month 12", () => {
    const state = makeState({
      character: {
        ...makeState().character,
        month: 11,  // Nov → turns pass Nov, Dec, Jan → new month=2, year crossed
        year: 1,
        totalMonths: 10,
      },
    });
    const result = resolver.resolve(state, recoveryAction, null, [], rng);
    expect(result.newState.character.month).toBe(2);
    expect(result.newState.character.year).toBe(2);
    expect(result.yearComplete).toBe(true);
    expect(result.passedMonths).toEqual([11, 12, 1]);
  });

  it("records month history", () => {
    const state = makeState();
    const result = resolver.resolve(state, careerAction, null, [], rng);
    expect(result.newState.history).toHaveLength(1);
    expect(result.newState.history[0].actionId).toBe("career_push");
  });

  it("applies child costs when hasChild", () => {
    const state = makeState({
      character: {
        ...makeState().character,
        hasChild: true,
        stats: makeStats({ energy: 80, money: 80 }),
      },
      flags: ["relationship_single", "has_child"],
    });
    const result = resolver.resolve(state, careerAction, null, [], rng);
    // Should have child cost applied on top of action cost
    const expectedEnergy = Math.max(0, 80 - 12 - 15); // action -12, child newborn -15
    expect(result.newState.character.stats.energy).toBeLessThanOrEqual(expectedEnergy + 5); // cascade may vary
  });

  it("increments repeat count and uses repeatEffects after 3 times", () => {
    let state = makeState();
    // Process 3 times in a row
    for (let i = 0; i < 2; i++) {
      const r = resolver.resolve(state, careerAction, null, [], rng);
      state = r.newState;
    }
    const burnoutBefore = state.character.hiddenStats.burnout;
    const r3 = resolver.resolve(state, careerAction, null, [], rng);
    // repeatEffects has burnout: 8
    expect(r3.newState.character.hiddenStats.burnout).toBeGreaterThan(burnoutBefore);
  });

  it("gameComplete at 120 months", () => {
    const state = makeState({
      character: {
        ...makeState().character,
        month: 10,
        year: 10,
        totalMonths: 117, // 117 + 3 = 120
      },
    });
    const result = resolver.resolve(state, recoveryAction, null, [], rng);
    expect(result.gameComplete).toBe(true);
  });

  it("forces 1 annual surprise when scheduled", () => {
    const state = makeState({
      yearSurprises: { year: 1, remaining: 1, unlucky: false },
    });

    const annualEvent = {
      id: "annual_surprise_test_one",
      title: "Test",
      description: "Test",
      triggerCondition: { stat: "money", op: ">=", value: 0 },
      weight: 1,
      cooldownMonths: 12,
      defaultOutcomeId: "ok",
      tags: ["annual_surprise"],
      outcomes: [{ id: "ok", description: "ok", effects: { stress: 1 } }],
    };

    const result = resolver.resolve(state, recoveryAction, null, [annualEvent as any], makeRNG(1));
    expect(result.triggeredEvents.map((e) => e.id)).toContain("annual_surprise_test_one");
    expect(result.newState.yearSurprises?.year).toBe(1);
    expect(result.newState.yearSurprises?.remaining).toBe(0);
  });

  it("unlucky year schedule forces 3 annual surprises across the year", () => {
    let state = makeState({
      yearSurprises: { year: 1, remaining: 3, unlucky: true },
    });

    const annualEvents = [
      {
        id: "annual_surprise_test_a",
        title: "A",
        description: "A",
        triggerCondition: { stat: "money", op: ">=", value: 0 },
        weight: 1,
        cooldownMonths: 12,
        defaultOutcomeId: "ok",
        tags: ["annual_surprise"],
        outcomes: [{ id: "ok", description: "ok", effects: { stress: 1 } }],
      },
      {
        id: "annual_surprise_test_b",
        title: "B",
        description: "B",
        triggerCondition: { stat: "money", op: ">=", value: 0 },
        weight: 1,
        cooldownMonths: 12,
        defaultOutcomeId: "ok",
        tags: ["annual_surprise"],
        outcomes: [{ id: "ok", description: "ok", effects: { stress: 1 } }],
      },
      {
        id: "annual_surprise_test_c",
        title: "C",
        description: "C",
        triggerCondition: { stat: "money", op: ">=", value: 0 },
        weight: 1,
        cooldownMonths: 12,
        defaultOutcomeId: "ok",
        tags: ["annual_surprise"],
        outcomes: [{ id: "ok", description: "ok", effects: { stress: 1 } }],
      },
    ] as any[];

    const rng = makeRNG(123);

    // Turn 1 (month 1 -> 4): surprise #1
    let r1 = resolver.resolve(state, recoveryAction, null, annualEvents, rng);
    expect(r1.triggeredEvents.length).toBe(1);
    state = r1.newState;
    expect(state.character.month).toBe(4);
    expect(state.yearSurprises?.remaining).toBe(2);

    // Turn 2 (month 4 -> 7): surprise #2
    let r2 = resolver.resolve(state, recoveryAction, null, annualEvents, rng);
    expect(r2.triggeredEvents.length).toBe(1);
    state = r2.newState;
    expect(state.character.month).toBe(7);
    expect(state.yearSurprises?.remaining).toBe(1);

    // Turn 3 (month 7 -> 10): surprise #3
    let r3 = resolver.resolve(state, recoveryAction, null, annualEvents, rng);
    expect(r3.triggeredEvents.length).toBe(1);
    state = r3.newState;
    expect(state.character.month).toBe(10);
    expect(state.yearSurprises?.remaining).toBe(0);

    // Turn 4 (month 10 -> next year): no more forced surprises this year
    let r4 = resolver.resolve(state, recoveryAction, null, annualEvents, rng);
    expect(r4.triggeredEvents.length).toBe(0);
  });
});
