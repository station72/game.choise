import type { MonthRecord, YearSummary, PersonalLineStatus } from "../types/summary.js";
import type { VisibleStats, HiddenStats } from "../types/stats.js";
import { getThreshold } from "../types/stats.js";

export class SummaryEngine {
  buildYearSummary(
    yearNumber: number,
    monthHistory: MonthRecord[]
  ): YearSummary {
    const last = monthHistory[monthHistory.length - 1];
    const statsOverview: VisibleStats = last.statsAfter;
    const hiddenStats: HiddenStats = last.hiddenStatsAfter;

    // Panel 2: Hidden insights
    const hiddenInsight = this.buildHiddenInsights(hiddenStats, monthHistory);

    // Panel 3: Key events (up to 3 most repeated or impactful)
    const eventCounts: Record<string, number> = {};
    for (const rec of monthHistory) {
      for (const eid of rec.eventIds) {
        eventCounts[eid] = (eventCounts[eid] ?? 0) + 1;
      }
    }
    const keyEvents = Object.entries(eventCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);

    // Panel 4: Personal line status
    const personalLineStatus = this.assessPersonalLine(monthHistory);

    // Panel 5: Year pattern
    const yearPattern = this.buildYearPattern(statsOverview, hiddenStats, monthHistory);

    return {
      year: yearNumber,
      panels: {
        statsOverview,
        hiddenInsight,
        keyEvents,
        personalLineStatus,
        yearPattern,
      },
      monthHistory,
    };
  }

  private buildHiddenInsights(
    hiddenStats: HiddenStats,
    history: MonthRecord[]
  ): string[] {
    const insights: string[] = [];

    if (hiddenStats.burnout >= 60) {
      insights.push("Выгорание накопилось до опасной черты. Тело уже сигналит.");
    } else if (hiddenStats.burnout >= 40) {
      insights.push("Усталость хроническая. Не критично — но близко.");
    }

    if (hiddenStats.fragility >= 60) {
      insights.push("Хрупкость высокая. Следующий серьёзный удар может сломать.");
    }

    if (hiddenStats.estrangement >= 55) {
      insights.push("Отдаление стало фоном. Близость формально есть — но уже без тепла.");
    }

    if (hiddenStats.vitality <= 25) {
      insights.push("Живость почти погасла. Человек внутри не получает ничего своего.");
    } else if (hiddenStats.vitality >= 70) {
      insights.push("Что-то своё живёт. Это важно — даже если незаметно снаружи.");
    }

    // Check burnout trend
    const avgBurnout =
      history.reduce((sum, r) => sum + r.hiddenStatsAfter.burnout, 0) /
      history.length;
    if (avgBurnout > hiddenStats.burnout + 10) {
      insights.push("Выгорание снижалось — что-то изменилось к лучшему.");
    }

    return insights.slice(0, 3);
  }

  private assessPersonalLine(history: MonthRecord[]): PersonalLineStatus {
    let touchedMonths = 0;
    for (const rec of history) {
      // Check if any action this month had personal line tags
      // We infer from action IDs that map to personal line
      if (
        rec.actionId === "personal_line" ||
        rec.actionId === "own_project" ||
        rec.supportActionId === "personal_evening" ||
        rec.supportActionId === "therapy"
      ) {
        touchedMonths++;
      }
      // Also check events
      for (const eid of rec.eventIds) {
        if (
          eid === "creative_opportunity" ||
          eid === "mentor_appears" ||
          eid === "project_invite"
        ) {
          touchedMonths++;
        }
      }
    }

    if (touchedMonths >= 5) return "following";
    if (touchedMonths >= 2) return "ignoring";
    return "lost";
  }

  private buildYearPattern(
    stats: VisibleStats,
    hiddenStats: HiddenStats,
    history: MonthRecord[]
  ): string {
    // Determine most used action
    const actionCounts: Record<string, number> = {};
    for (const rec of history) {
      actionCounts[rec.actionId] = (actionCounts[rec.actionId] ?? 0) + 1;
    }
    const topAction = Object.entries(actionCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    const stressLevel = getThreshold(stats.stress);
    const vitalityLevel = getThreshold(hiddenStats.vitality);
    const burnoutLevel = getThreshold(hiddenStats.burnout);
    const closenessLevel = getThreshold(stats.closeness);

    // Pattern detection
    if (topAction === "career_push" && stressLevel === "crisis") {
      return "Ты весь год называл контроль ответственностью.";
    }
    if (topAction === "career_push" && vitalityLevel === "weak") {
      return "Ты не рухнул. Но в этой жизни тебя стало меньше.";
    }
    if (topAction === "avoidance") {
      return "Ты весь год ждал удобного момента. Он не пришёл.";
    }
    if (topAction === "relationships" && burnoutLevel === "weak") {
      return "Ты был там для других. Себя в этом не было.";
    }
    if (
      topAction === "personal_line" &&
      vitalityLevel !== "crisis" &&
      vitalityLevel !== "weak"
    ) {
      return "Ты не всё удержал. Но впервые не предал своё.";
    }
    if (closenessLevel === "crisis") {
      return "Ты был полезен всем, кроме себя.";
    }
    if (burnoutLevel === "crisis") {
      return "Ты платил за безопасность слишком живой частью себя.";
    }
    if (topAction === "financial_stability" && vitalityLevel === "weak") {
      return "Год прожит в режиме выживания. Устойчивость куплена, но дорого.";
    }
    if (topAction === "own_project") {
      return "Ты рисковал. Это оставляет следы — и шрамы.";
    }
    if (topAction === "recovery") {
      return "Ты остановился. Это тоже решение.";
    }

    return "Год прошёл. Следующий уже начался.";
  }
}
