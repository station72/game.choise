import type { VisibleStats, HiddenStats } from "../../types/stats.js";
import { getThreshold, getThresholdInverse, INVERSE_STATS } from "../../types/stats.js";

const STAT_LABELS: Record<string, string> = {
  money: "Деньги",
  energy: "Энергия",
  health: "Здоровье",
  closeness: "Близость",
  career: "Карьера",
  stress: "Стресс",
};

const HIDDEN_HINTS: Record<string, string> = {
  burnout: "Выгорание",
  vitality: "Живость",
  estrangement: "Отдаление",
  fragility: "Хрупкость",
  defocus: "Расфокус",
};

const DEFOCUS_LABELS: Array<[number, string]> = [
  [70, "критический расфокус — эффективность −40%"],
  [50, "сильный расфокус — эффективность −25%"],
  [30, "лёгкий расфокус — эффективность −10%"],
  [0,  "фокус в норме"],
];

const THRESHOLD_CLASSES: Record<string, string> = {
  crisis: "stat--crisis",
  weak: "stat--weak",
  normal: "stat--normal",
  good: "stat--good",
  strong: "stat--strong",
};

export class StatsPanel {
  private el: HTMLElement;

  constructor(container: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "stats-panel";
    container.appendChild(this.el);
  }

  render(stats: VisibleStats, hiddenStats: HiddenStats): void {
    const visibleHtml = (Object.keys(STAT_LABELS) as (keyof VisibleStats)[])
      .map((key) => {
        const value = stats[key];
        const threshold = INVERSE_STATS.has(key)
          ? getThresholdInverse(value)
          : getThreshold(value);
        const cls = THRESHOLD_CLASSES[threshold];
        return `<div class="stat ${cls}">
          <span class="stat__label">${STAT_LABELS[key]}</span>
          <div class="stat__bar-wrap">
            <div class="stat__bar" style="width:${value}%"></div>
          </div>
          <span class="stat__value">${Math.round(value)}</span>
        </div>`;
      })
      .join("");

    // Hidden stats hints (no exact numbers, just visual cues)
    const hiddenHtml = (Object.keys(HIDDEN_HINTS) as (keyof HiddenStats)[])
      .map((key) => {
        const value = hiddenStats[key];
        const threshold = INVERSE_STATS.has(key)
          ? getThresholdInverse(value)
          : getThreshold(value);
        const cls = THRESHOLD_CLASSES[threshold];
        const dot = threshold === "crisis" ? "●" : threshold === "weak" ? "◕" : "○";
        // Defocus gets a special tooltip explaining the effectiveness penalty
        let title = `${HIDDEN_HINTS[key]}: ${Math.round(value)}`;
        if (key === "defocus") {
          const label = DEFOCUS_LABELS.find(([min]) => value >= min)?.[1] ?? "";
          title = `Расфокус: ${Math.round(value)} — ${label}`;
        }
        return `<span class="hidden-hint ${cls}" title="${title}">${dot} ${HIDDEN_HINTS[key]}</span>`;
      })
      .join(" ");

    this.el.innerHTML = `
      <div class="stats-visible">${visibleHtml}</div>
      <div class="stats-hidden">${hiddenHtml}</div>
    `;
  }
}
