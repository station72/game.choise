import type { GameState } from "../state/GameState.js";
import type { EndingProfile } from "../types/summary.js";
import { getThreshold } from "../types/stats.js";

export class EndingEngine {
  buildEnding(state: GameState): EndingProfile {
    const { stats, hiddenStats } = state.character;

    const archetypeTitle = this.determineArchetype(state);
    const narrative = this.buildNarrative(state);
    const keyChoices = this.findKeyChoices(state);

    return {
      totalYears: state.character.year - 1,
      finalStats: { ...stats },
      finalHiddenStats: { ...hiddenStats },
      archetypeTitle,
      narrative,
      keyChoices,
    };
  }

  private determineArchetype(state: GameState): string {
    const { stats, hiddenStats } = state.character;
    const careerT = getThreshold(stats.career);
    const vitalityT = getThreshold(hiddenStats.vitality);
    const closenessT = getThreshold(stats.closeness);
    const burnoutT = getThreshold(hiddenStats.burnout);
    const moneyT = getThreshold(stats.money);

    if (
      (careerT === "good" || careerT === "strong") &&
      (vitalityT === "crisis" || vitalityT === "weak")
    ) {
      return "Успешный, но пустой";
    }
    if (closenessT === "crisis" && moneyT !== "crisis") {
      return "Устойчивый, но чужой";
    }
    if (
      vitalityT === "good" || vitalityT === "strong"
    ) {
      return "Рискованный, но живой";
    }
    if (
      burnoutT === "crisis" &&
      (careerT === "good" || careerT === "strong")
    ) {
      return "Надёжный, но угасший";
    }
    if (
      stats.health <= 30 ||
      stats.money <= 20
    ) {
      return "Разбитый, но честный";
    }
    if (
      (careerT === "normal" || careerT === "good") &&
      (closenessT === "normal" || closenessT === "good") &&
      hiddenStats.vitality >= 40
    ) {
      return "Собранный без величия";
    }
    if (vitalityT === "weak" || vitalityT === "normal") {
      return "Поздно проснувшийся";
    }

    return "Так и не начавший";
  }

  private buildNarrative(state: GameState): string {
    const { age } = state.character;
    const title = this.determineArchetype(state);

    const narratives: Record<string, string> = {
      "Успешный, но пустой": `К ${age} годам карьера выстроена, деньги есть. Но в зеркале — человек, который давно не помнит, зачем всё это начинал.`,
      "Устойчивый, но чужой": `Всё держится. Квартира, работа, формально — семья. Только рядом нет никого, кто знает, что происходит внутри.`,
      "Рискованный, но живой": `Многое не получилось. Были провалы, были долги. Но что-то своё — живёт. И это не маленькая победа.`,
      "Надёжный, но угасший": `Ни разу не подвёл. Был надёжным, ответственным, стабильным. Только себя в этом нет уже давно.`,
      "Разбитый, но честный": `Жизнь побила. Деньги, здоровье, отношения — много потеряно. Но ни разу не соврал себе о том, что происходит.`,
      "Собранный без величия": `Не герой. Не катастрофа. Обычный человек, который делал что мог — и иногда это было достаточно.`,
      "Поздно проснувшийся": `Долго жил не своим. Но в какой-то момент — остановился. И начал возвращать себя. Поздно. Но не слишком.`,
      "Так и не начавший": `Были планы. Были мечты. Были причины подождать. К ${age} годам причины кончились, а жизнь — нет.`,
    };

    return narratives[title] ?? "Жизнь прожита. Это уже что-то.";
  }

  private findKeyChoices(state: GameState): string[] {
    const choices: string[] = [];

    // Find years with most dramatic stat changes
    for (const summary of state.yearSummaries) {
      if (summary.panels.yearPattern && summary.panels.yearPattern !== "Год прошёл. Следующий уже начался.") {
        choices.push(`Год ${summary.year}: ${summary.panels.yearPattern}`);
      }
      if (choices.length >= 3) break;
    }

    if (choices.length === 0) {
      choices.push("Жизнь без резких поворотов.");
    }

    return choices.slice(0, 3);
  }
}
