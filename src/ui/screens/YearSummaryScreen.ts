import type { YearSummary } from "../../types/summary.js";

export interface YearSummaryCallbacks {
  onNext: () => void;
}

const PERSONAL_LINE_LABELS = {
  following: "Живёт — ты давал ей место.",
  ignoring: "Еле теплится — редко и мало.",
  lost: "Погасла. Несколько месяцев без неё.",
};

export class YearSummaryScreen {
  private el: HTMLElement;
  private currentPanel = 0;
  private summary: YearSummary | null = null;
  private callbacks: YearSummaryCallbacks | null = null;

  constructor(container: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "screen screen--year-summary";
    container.appendChild(this.el);
  }

  render(summary: YearSummary, callbacks: YearSummaryCallbacks): void {
    this.summary = summary;
    this.callbacks = callbacks;
    this.currentPanel = 0;
    this.renderPanel(0);
  }

  private renderPanel(index: number): void {
    if (!this.summary) return;
    const { panels, year } = this.summary;

    const panelTitles = [
      "Материальная реальность",
      "Тело",
      "Близость",
      "Личная линия",
      "Паттерн года",
    ];

    let content = "";
    switch (index) {
      case 0:
        content = this.renderStats(panels.statsOverview);
        break;
      case 1:
        content = `<ul class="insight-list">${panels.hiddenInsight.map((i) => `<li>${i}</li>`).join("")}</ul>`;
        break;
      case 2:
        content = this.renderCloseness(panels.statsOverview.closeness);
        break;
      case 3:
        content = `<p class="personal-line-status">${PERSONAL_LINE_LABELS[panels.personalLineStatus]}</p>`;
        break;
      case 4:
        content = `<p class="year-pattern">"${panels.yearPattern}"</p>`;
        break;
    }

    const isLast = index === 4;
    this.el.innerHTML = `
      <div class="year-summary__header">Год ${year} — итог</div>
      <div class="year-summary__panel">
        <div class="year-summary__panel-title">${panelTitles[index]}</div>
        <div class="year-summary__panel-content">${content}</div>
      </div>
      <div class="year-summary__nav">
        <span class="year-summary__dots">${Array.from({ length: 5 }, (_, i) => `<span class="dot ${i === index ? "dot--active" : ""}"></span>`).join("")}</span>
        <button class="btn btn--primary" id="btn-panel-next">
          ${isLast ? "Следующий год →" : "Далее →"}
        </button>
      </div>
    `;

    this.el.querySelector("#btn-panel-next")?.addEventListener("click", () => {
      if (index < 4) {
        this.currentPanel++;
        this.renderPanel(this.currentPanel);
      } else {
        this.callbacks?.onNext();
      }
    });
  }

  private renderStats(stats: import("../../types/stats.js").VisibleStats): string {
    const labels: Record<string, string> = {
      money: "Деньги",
      energy: "Энергия",
      health: "Здоровье",
      closeness: "Близость",
      career: "Карьера",
      stress: "Стресс",
    };
    return `<div class="summary-stats">${Object.entries(stats)
      .map(
        ([k, v]) =>
          `<div class="summary-stat"><span>${labels[k] ?? k}</span><span>${Math.round(v as number)}</span></div>`
      )
      .join("")}</div>`;
  }

  private renderCloseness(closeness: number): string {
    let text = "";
    if (closeness >= 70) text = "Тепло. Связь держится.";
    else if (closeness >= 50) text = "Нормально. Нет близости — но нет и отчуждения.";
    else if (closeness >= 30) text = "Отдаление чувствуется. Что-то уходит.";
    else text = "Пустота. Рядом есть люди — но не близкие.";

    return `<p>${text}</p><div class="closeness-bar"><div style="width:${closeness}%"></div></div>`;
  }

  show(): void {
    this.el.style.display = "block";
  }

  hide(): void {
    this.el.style.display = "none";
  }
}
