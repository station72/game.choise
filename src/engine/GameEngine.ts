import type { DataRegistry } from "../data/registry/DataRegistry.js";
import type { GameState } from "../state/GameState.js";
import type { MonthlyAction, SupportAction } from "../types/actions.js";
import type { YearSummary, EndingProfile } from "../types/summary.js";
import type { Archetype } from "../types/archetype.js";
import type { Background } from "../types/character.js";
import type { LifeComposition } from "../types/composition.js";
import type { LifeLineId } from "../types/lifelines.js";
import { TurnResolver, type TurnResult } from "./TurnResolver.js";
import { SummaryEngine } from "./SummaryEngine.js";
import { EndingEngine } from "./EndingEngine.js";
import { CharacterBuilder, type OnboardingResult } from "./CharacterBuilder.js";
import { makeRNG, type RNG } from "../utils/rng.js";

export interface GameEngineEvents {
  onYearComplete?: (summary: YearSummary) => void;
  onGameComplete?: (ending: EndingProfile) => void;
}

export class GameEngine {
  private resolver = new TurnResolver();
  private summaryEngine = new SummaryEngine();
  private endingEngine = new EndingEngine();
  private builder = new CharacterBuilder();
  private rng: RNG;

  constructor(
    private registry: DataRegistry,
    private listeners: GameEngineEvents = {}
  ) {
    this.rng = makeRNG();
  }

  /**
   * Start a new game from the OnboardingWizard result.
   * This is the primary path after the wizard is implemented.
   */
  startNewGame(onboarding: OnboardingResult, seed?: number): GameState {
    const background = this.registry.backgrounds.get(onboarding.backgroundId);
    if (!background) throw new Error(`Unknown background: ${onboarding.backgroundId}`);

    this.rng = makeRNG(seed);
    const rngSeed = this.rng.getSeed();

    const character = this.builder.buildFromOnboarding(onboarding, background);

    const flags: string[] = [];
    if (character.relationshipState === "single") flags.push("relationship_single");
    if (character.parentRelations.carryingParents) flags.push("carrying_parents");

    const composition: LifeComposition = {
      jobTitle: "Начало карьеры",
      livingArrangement: "renting",
      activeGoals: [],
    };

    return {
      character,
      composition,
      flags,
      actionRepeatCounts: {},
      supportActionYearCounts: {},
      eventCooldowns: {},
      history: [],
      yearSummaries: [],
      rngSeed,
      closedLineHistory: [],
    };
  }

  /**
   * Legacy path for the archetype-based start screen (used until OnboardingWizard is wired up).
   */
  startNewGameLegacy(archetypeId: string, playerName: string, seed?: number): GameState {
    const archetype = this.registry.archetypes.get(archetypeId);
    if (!archetype) throw new Error(`Unknown archetype: ${archetypeId}`);

    const background = this.registry.backgrounds.get(archetype.backgroundId);
    if (!background) throw new Error(`Unknown background: ${archetype.backgroundId}`);

    this.rng = makeRNG(seed);
    const rngSeed = this.rng.getSeed();

    const character = this.builder.buildLegacy(
      background,
      playerName,
      archetype.internalProfile,
      archetype.startingRelationship,
      archetype.hasChild
    );

    // Merge archetype's startingTraits into the character
    character.traits = [...character.traits, ...archetype.startingTraits];

    const flags: string[] = [];
    if (archetype.startingRelationship === "single") flags.push("relationship_single");
    if (archetype.hasChild) flags.push("has_child");

    const composition: LifeComposition = {
      jobTitle: "Начало карьеры",
      livingArrangement: "renting",
      activeGoals: [],
    };

    return {
      character,
      composition,
      flags,
      actionRepeatCounts: {},
      supportActionYearCounts: {},
      eventCooldowns: {},
      history: [],
      yearSummaries: [],
      rngSeed,
      closedLineHistory: [],
    };
  }

  /**
   * Permanently close a life line. Returns the updated GameState.
   * This is separate from processMonth — doesn't consume the turn.
   */
  closeLifeLine(state: GameState, lineId: LifeLineId): GameState {
    const config = this.registry.lifeLineConfigs.get(lineId);
    if (!config) {
      // No config registered yet — just close without effects
      const updatedLines = state.character.lifeLines.map((l) =>
        l.id === lineId ? { ...l, state: "closed_forever" as const } : l
      );
      return {
        ...state,
        character: { ...state.character, lifeLines: updatedLines },
        closedLineHistory: [
          ...state.closedLineHistory,
          { lineId, closedAtMonth: state.character.totalMonths },
        ],
      };
    }
    return this.resolver.resolveLineClose(state, lineId, config);
  }

  processMonth(
    state: GameState,
    actionId: string,
    supportActionId: string | null,
    playerChoiceOptionId?: "optionA" | "optionB"
  ): TurnResult {
    const action = this.registry.monthlyActions.get(actionId);
    if (!action) throw new Error(`Unknown action: ${actionId}`);

    const support = supportActionId
      ? (this.registry.supportActions.get(supportActionId) ?? null)
      : null;

    const result = this.resolver.resolve(
      state,
      action,
      support,
      this.registry.events,
      this.rng,
      playerChoiceOptionId
    );

    // Emit year complete
    if (result.yearComplete && this.listeners.onYearComplete) {
      const yearHistory = result.newState.history.slice(-12);
      const summary = this.summaryEngine.buildYearSummary(
        state.character.year,
        yearHistory
      );
      result.newState.yearSummaries.push(summary);
      this.listeners.onYearComplete(summary);
    }

    // Emit game complete
    if (result.gameComplete && this.listeners.onGameComplete) {
      const ending = this.endingEngine.buildEnding(result.newState);
      this.listeners.onGameComplete(ending);
    }

    return result;
  }

  getYearSummary(state: GameState): YearSummary | null {
    return state.yearSummaries[state.yearSummaries.length - 1] ?? null;
  }

  buildEnding(state: GameState): EndingProfile {
    return this.endingEngine.buildEnding(state);
  }

  getAllActions(): MonthlyAction[] {
    return [...this.registry.monthlyActions.values()];
  }

  getAllSupportActions(): SupportAction[] {
    return [...this.registry.supportActions.values()];
  }

  getArchetypes(): Archetype[] {
    return [...this.registry.archetypes.values()];
  }

  getBackground(id: string): Background | undefined {
    return this.registry.backgrounds.get(id);
  }

  getLifeLineConfigs(): Map<LifeLineId, import("../types/lifelines.js").LifeLineConfig> {
    return this.registry.lifeLineConfigs;
  }

  getRegistry(): import("../data/registry/DataRegistry.js").DataRegistry {
    return this.registry;
  }

  /**
   * Suspend an active life line (reversible — can be resumed or closed later).
   */
  suspendLifeLine(state: GameState, lineId: LifeLineId): GameState {
    const updatedLines = state.character.lifeLines.map((l) =>
      l.id === lineId && l.state === "active"
        ? { ...l, state: "suspended" as const }
        : l
    );
    return {
      ...state,
      character: { ...state.character, lifeLines: updatedLines },
    };
  }

  /**
   * Resume a suspended life line.
   */
  resumeLifeLine(state: GameState, lineId: LifeLineId): GameState {
    const updatedLines = state.character.lifeLines.map((l) =>
      l.id === lineId && l.state === "suspended"
        ? { ...l, state: "active" as const, suspendedMonths: 0 }
        : l
    );
    return {
      ...state,
      character: { ...state.character, lifeLines: updatedLines },
    };
  }
}
