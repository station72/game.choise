import type { VisibleStats, HiddenStats } from "../../types/stats.js";
import { getThreshold, getThresholdInverse, INVERSE_STATS } from "../../types/stats.js";

export interface TurnAnimationProps {
  actionName: string;
  passedMonths: number[];          // e.g. [10, 11, 12]
  statsBefore: VisibleStats;
  statsAfter: VisibleStats;
  hiddenBefore: HiddenStats;
  hiddenAfter: HiddenStats;
  onComplete: () => void;
}

const MONTH_NAMES = [
  "", "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const STAT_LABELS: Record<string, string> = {
  money: "Деньги",
  energy: "Энергия",
  health: "Здоровье",
  closeness: "Близость",
  career: "Карьера",
  stress: "Стресс",
};

const HIDDEN_LABELS: Record<string, string> = {
  burnout: "Выгорание",
  vitality: "Живость",
  estrangement: "Отдаление",
  fragility: "Хрупкость",
  defocus: "Расфокус",
};

function formatDelta(key: string, before: number, after: number): string {
  const diff = Math.round(after - before);
  if (Math.abs(diff) < 1) return "";
  const isInverse = INVERSE_STATS.has(key);
  // For inverse stats, an increase is bad (red), decrease is good (green)
  const positive = isInverse ? diff < 0 : diff > 0;
  const sign = diff > 0 ? "+" : "";
  const cls = positive ? "anim-delta--pos" : "anim-delta--neg";
  return `<span class="${cls}">${sign}${diff}</span>`;
}

function getBarClass(key: string, value: number): string {
  const threshold = INVERSE_STATS.has(key)
    ? getThresholdInverse(value)
    : getThreshold(value);
  return `stat--${threshold}`;
}

export class TurnAnimationScreen {
  private el: HTMLElement;
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor(container: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "screen screen--animation";
    container.appendChild(this.el);
  }

  render(props: TurnAnimationProps): void {
    this.clearTimers();
    const { actionName, passedMonths, statsBefore, statsAfter, hiddenBefore, hiddenAfter, onComplete } = props;

    // Build stat rows HTML (start with "before" values; will animate to "after")
    const statRows = (Object.keys(STAT_LABELS) as (keyof VisibleStats)[])
      .map((key) => {
        const before = Math.round(statsBefore[key]);
        const after = Math.round(statsAfter[key]);
        const delta = formatDelta(key, before, after);
        const barCls = getBarClass(key, before);
        return `
          <div class="anim-stat ${barCls}" data-key="${key}" data-before="${before}" data-after="${after}">
            <span class="anim-stat__label">${STAT_LABELS[key]}</span>
            <div class="anim-stat__bar-wrap">
              <div class="anim-stat__bar" style="width:${before}%; transition: width 0.7s ease-out"></div>
            </div>
            <span class="anim-stat__value">${before}</span>
            <span class="anim-stat__delta">${delta}</span>
          </div>`;
      }).join("");

    const hiddenRows = (Object.keys(HIDDEN_LABELS) as (keyof HiddenStats)[])
      .filter((key) => {
        const diff = Math.abs(Math.round(hiddenAfter[key]) - Math.round(hiddenBefore[key]));
        return diff >= 1;
      })
      .map((key) => {
        const before = Math.round(hiddenBefore[key]);
        const after = Math.round(hiddenAfter[key]);
        const delta = formatDelta(key, before, after);
        return `<span class="anim-hidden-hint">${HIDDEN_LABELS[key]} ${delta}</span>`;
      }).join("");

    this.el.innerHTML = `
      <div class="anim-wrap">
        <div class="anim-action-label">${actionName}</div>

        <div class="anim-months">
          ${passedMonths.map((m, i) => `
            <div class="anim-month anim-month--${i}" style="opacity:0">
              ${MONTH_NAMES[m] ?? ""}
            </div>`).join("")}
        </div>

        <div class="anim-stats" style="opacity:0">
          ${statRows}
          ${hiddenRows ? `<div class="anim-hidden-row">${hiddenRows}</div>` : ""}
        </div>

        <button class="btn btn--primary anim-continue" style="opacity:0">Продолжить →</button>
      </div>
    `;

    this.scheduleAnimation(props, onComplete);
  }

  private scheduleAnimation(props: TurnAnimationProps, onComplete: () => void): void {
    const MONTH_DELAY = 380; // ms between each month appearing
    const n = props.passedMonths.length;

    // Phase 1: months appear one by one
    for (let i = 0; i < n; i++) {
      this.timers.push(setTimeout(() => {
        const el = this.el.querySelector(`.anim-month--${i}`) as HTMLElement | null;
        if (el) {
          el.style.transition = "opacity 0.25s ease";
          el.style.opacity = "1";
        }
      }, i * MONTH_DELAY));
    }

    // Phase 2: stats panel fades in
    const statsStart = n * MONTH_DELAY + 100;
    this.timers.push(setTimeout(() => {
      const statsEl = this.el.querySelector(".anim-stats") as HTMLElement | null;
      if (statsEl) {
        statsEl.style.transition = "opacity 0.35s ease";
        statsEl.style.opacity = "1";
      }
    }, statsStart));

    // Phase 3: bars animate to new values (one frame after paint)
    this.timers.push(setTimeout(() => {
      const rows = this.el.querySelectorAll(".anim-stat");
      rows.forEach((row) => {
        const key = (row as HTMLElement).dataset.key as keyof VisibleStats;
        const after = parseFloat((row as HTMLElement).dataset.after ?? "0");
        const bar = row.querySelector(".anim-stat__bar") as HTMLElement | null;
        const valueEl = row.querySelector(".anim-stat__value") as HTMLElement | null;
        if (bar) bar.style.width = `${after}%`;
        // Update bar class to after-state colour
        row.classList.remove("stat--crisis", "stat--weak", "stat--normal", "stat--good", "stat--strong");
        row.classList.add(getBarClass(key, after));
        // Update number after transition
        setTimeout(() => { if (valueEl) valueEl.textContent = String(Math.round(after)); }, 350);
      });
    }, statsStart + 80));

    // Phase 4: continue button appears
    const btnTime = statsStart + 900;
    this.timers.push(setTimeout(() => {
      const btn = this.el.querySelector(".anim-continue") as HTMLElement | null;
      if (btn) {
        btn.style.transition = "opacity 0.3s ease";
        btn.style.opacity = "1";
        btn.addEventListener("click", () => { this.clearTimers(); onComplete(); }, { once: true });
      }
    }, btnTime));

    // Auto-advance after 5s total (safety net)
    this.timers.push(setTimeout(() => {
      this.clearTimers();
      onComplete();
    }, statsStart + 4000));
  }

  private clearTimers(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  show(): void { this.el.style.display = "block"; }
  hide(): void { this.el.style.display = "none"; this.clearTimers(); }
}
