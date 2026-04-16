import type { GameEngine } from "../engine/GameEngine.js";
import type { GameState } from "../state/GameState.js";
import type { TurnResult } from "../engine/TurnResolver.js";
import type { LifeLineId } from "../types/lifelines.js";
import { StatsEngine } from "../engine/StatsEngine.js";
import { Router } from "./Router.js";
import { StartScreen } from "./screens/StartScreen.js";
import { OnboardingWizard } from "./screens/OnboardingWizard.js";
import { MonthScreen } from "./screens/MonthScreen.js";
import { TurnAnimationScreen } from "./screens/TurnAnimationScreen.js";
import { EventScreen } from "./screens/EventScreen.js";
import { YearSummaryScreen } from "./screens/YearSummaryScreen.js";
import { EndingScreen } from "./screens/EndingScreen.js";
import { saveGame, loadGame, clearSave } from "../state/SaveLoad.js";

export class GameUI {
  private router = new Router();
  private startScreen: StartScreen;
  private onboardingWizard: OnboardingWizard;
  private monthScreen: MonthScreen;
  private animationScreen: TurnAnimationScreen;
  private eventScreen: EventScreen;
  private yearSummaryScreen: YearSummaryScreen;
  private endingScreen: EndingScreen;

  private state: GameState | null = null;
  private pendingTurnResult: TurnResult | null = null;
  private eventCursor = 0;

  constructor(
    container: HTMLElement,
    private engine: GameEngine
  ) {
    this.startScreen = new StartScreen(container);
    this.onboardingWizard = new OnboardingWizard(container, engine.getRegistry());
    this.monthScreen = new MonthScreen(container, engine.getLifeLineConfigs());
    this.animationScreen = new TurnAnimationScreen(container);
    this.eventScreen = new EventScreen(container);
    this.yearSummaryScreen = new YearSummaryScreen(container);
    this.endingScreen = new EndingScreen(container);

    this.hideAllScreens();
    this.router.on((screen) => this.onNavigate(screen));
  }

  start(): void {
    this.router.navigate("start");
  }

  private onNavigate(screen: import("./Router.js").ScreenId): void {
    this.hideAllScreens();
    switch (screen) {
      case "start":        return this.showStart();
      case "onboarding":   return this.showOnboarding();
      case "animation":    return this.showAnimation();
      case "month":        return this.showMonth();
      case "event":        return this.showEvent();
      case "year_summary": return this.showYearSummary();
      case "ending":       return this.showEnding();
    }
  }

  // ---- SCREENS ----

  private showStart(): void {
    this.startScreen.render({
      onNewGame: () => {
        clearSave();
        this.onboardingWizard.reset();
        this.router.navigate("onboarding");
      },
      onContinue: () => {
        const saved = loadGame();
        if (saved) {
          this.state = saved;
          this.router.navigate("month");
        }
      },
    });
    this.startScreen.show();
  }

  private showOnboarding(): void {
    this.onboardingWizard.render({
      onComplete: (result) => {
        this.state = this.engine.startNewGame(result);
        saveGame(this.state);
        this.router.navigate("month");
      },
      onCancel: () => {
        this.router.navigate("start");
      },
    });
    this.onboardingWizard.show();
  }

  private showMonth(): void {
    if (!this.state) return;
    const actions = this.engine.getAllActions();
    const supports = this.engine.getAllSupportActions();

    this.monthScreen.clear();
    this.monthScreen.render(this.state, actions, supports, {
      onConfirm: (actionId, supportActionId) => {
        this.processMonth(actionId, supportActionId);
      },
      onSuspendLifeLine: (lineId: LifeLineId) => {
        if (!this.state) return;
        this.state = this.engine.suspendLifeLine(this.state, lineId);
        saveGame(this.state);
        // Re-render month screen to reflect change
        this.monthScreen.clear();
        this.monthScreen.render(this.state, actions, supports, {
          onConfirm: (actionId, supportActionId) => {
            this.processMonth(actionId, supportActionId);
          },
          onSuspendLifeLine: (id) => this.handleSuspend(id),
          onCloseLifeLine: (id) => this.handleClose(id),
        });
      },
      onCloseLifeLine: (lineId: LifeLineId) => {
        this.handleClose(lineId);
      },
    });
    this.monthScreen.show();
  }

  private handleSuspend(lineId: LifeLineId): void {
    if (!this.state) return;
    this.state = this.engine.suspendLifeLine(this.state, lineId);
    saveGame(this.state);
    this.showMonth();
  }

  private handleClose(lineId: LifeLineId): void {
    if (!this.state) return;
    this.state = this.engine.closeLifeLine(this.state, lineId);
    saveGame(this.state);
    this.showMonth();
  }

  private showAnimation(): void {
    const result = this.pendingTurnResult;
    if (!result) { this.router.navigate("month"); return; }

    // Find the action name for display
    const action = this.engine.getAllActions().find((a) => a.id === result.newState.history.at(-1)?.actionId);

    this.animationScreen.render({
      actionName: action?.name ?? "",
      passedMonths: result.passedMonths,
      statsBefore: result.statsBefore,
      statsAfter: result.newState.character.stats,
      hiddenBefore: result.hiddenStatsBefore,
      hiddenAfter: result.newState.character.hiddenStats,
      onComplete: () => {
        if (result.pendingChoice || result.triggeredEvents.length > 0) {
          this.router.navigate("event");
        } else {
          this.state = result.newState;
          saveGame(this.state!);
          this.afterTurn(result);
        }
      },
    });
    this.animationScreen.show();
  }

  private processMonth(
    actionId: string,
    supportActionId: string | null,
    playerChoiceOptionId?: "optionA" | "optionB"
  ): void {
    if (!this.state) return;

    const result = this.engine.processMonth(
      this.state,
      actionId,
      supportActionId,
      playerChoiceOptionId
    );

    this.pendingTurnResult = result;
    this.eventCursor = 0;

    // Always show animation first, then proceed to events / next month
    this.router.navigate("animation");
  }

  private showEvent(): void {
    if (!this.pendingTurnResult) return;
    const result = this.pendingTurnResult;

    const resolvedCount = result.resolvedOutcomes.length;
    const pendingIndex = result.pendingChoice ? resolvedCount : -1;

    // 1) Show already-resolved outcomes in order.
    if (this.eventCursor < resolvedCount) {
      const event = result.triggeredEvents[this.eventCursor];
      const outcome = result.resolvedOutcomes[this.eventCursor];
      const delta = outcome.effects;
      this.eventScreen.renderOutcome(event, outcome, delta, {
        onChoice: () => { /* Not used here */ },
        onContinue: () => {
          this.eventCursor++;
          this.showEvent();
        },
      });
      this.eventScreen.show();
      return;
    }

    // 2) Then show the pending player choice (if any).
    if (result.pendingChoice && this.eventCursor === pendingIndex) {
      const { event, outcome } = result.pendingChoice;
      this.eventScreen.renderPendingChoice(event, outcome, {
        onChoice: (optionId) => {
          this.applyPlayerChoice(optionId, result);
        },
        onContinue: () => { /* Not used here */ },
      });
      this.eventScreen.show();
      return;
    }

    // 3) All events are done — now we can commit the turn state and advance.
    this.state = result.newState;
    saveGame(this.state);
    this.afterTurn(result);
  }

  private applyPlayerChoice(
    optionId: "optionA" | "optionB",
    pendingResult: TurnResult
  ): void {
    if (!this.state) return;
    const { event, outcome } = pendingResult.pendingChoice!;
    const choice = outcome.playerChoice![optionId];

    const se = new StatsEngine();
    const { stats, hiddenStats } = se.applyDelta(
      pendingResult.newState.character.stats,
      pendingResult.newState.character.hiddenStats,
      choice.effects
    );

    const choiceState: GameState = {
      ...pendingResult.newState,
      character: {
        ...pendingResult.newState.character,
        stats,
        hiddenStats,
      },
    };

    this.pendingTurnResult = { ...pendingResult, pendingChoice: null, newState: choiceState };

    this.eventScreen.renderOutcome(event, outcome, choice.effects, {
      onChoice: () => {},
      onContinue: () => {
        this.eventCursor++;
        this.showEvent();
      },
    });
  }

  private afterTurn(result: TurnResult): void {
    if (result.gameComplete) {
      this.router.navigate("ending");
    } else if (result.yearComplete) {
      this.router.navigate("year_summary");
    } else {
      this.router.navigate("month");
    }
  }

  private showYearSummary(): void {
    if (!this.state) return;
    const summary = this.engine.getYearSummary(this.state);
    if (!summary) {
      this.router.navigate("month");
      return;
    }

    this.yearSummaryScreen.render(summary, {
      onNext: () => {
        this.router.navigate("month");
      },
    });
    this.yearSummaryScreen.show();
  }

  private showEnding(): void {
    if (!this.state) return;
    const ending = this.engine.buildEnding(this.state);
    clearSave();

    this.endingScreen.render(ending, {
      onNewGame: () => {
        this.state = null;
        this.router.navigate("start");
      },
    });
    this.endingScreen.show();
  }

  // ---- HELPERS ----

  private hideAllScreens(): void {
    this.startScreen.hide();
    this.onboardingWizard.hide();
    this.monthScreen.hide();
    this.animationScreen.hide();
    this.eventScreen.hide();
    this.yearSummaryScreen.hide();
    this.endingScreen.hide();
  }
}
