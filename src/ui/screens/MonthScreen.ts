import type { GameState } from "../../state/GameState.js";
import type { MonthlyAction, SupportAction } from "../../types/actions.js";
import type { LifeLineConfig, LifeLineId } from "../../types/lifelines.js";
import { StatsPanel } from "../components/StatsPanel.js";
import { evaluate, type EvalContext } from "../../utils/conditionEvaluator.js";
import type { ConditionExpression } from "../../types/events.js";
import { MONTHS_PER_TURN } from "../../engine/TurnResolver.js";

export interface MonthScreenCallbacks {
  onConfirm: (actionId: string, supportActionId: string | null) => void;
  onCloseLifeLine?: (lineId: LifeLineId) => void;
  onSuspendLifeLine?: (lineId: LifeLineId) => void;
}

const MONTH_NAMES = [
  "", "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const LINE_STATE_LABELS: Record<string, string> = {
  active: "активна",
  suspended: "на паузе",
  closed_forever: "закрыта",
};

export class MonthScreen {
  private el: HTMLElement;
  private statsPanel: StatsPanel;
  private lifeLineConfigs: Map<LifeLineId, LifeLineConfig>;

  constructor(container: HTMLElement, lifeLineConfigs: Map<LifeLineId, LifeLineConfig>) {
    this.el = document.createElement("div");
    this.el.className = "screen screen--month";
    container.appendChild(this.el);
    this.lifeLineConfigs = lifeLineConfigs;
    this.statsPanel = new StatsPanel(this.el);
  }

  render(
    state: GameState,
    actions: MonthlyAction[],
    supportActions: SupportAction[],
    callbacks: MonthScreenCallbacks
  ): void {
    // Render stats panel first
    this.statsPanel.render(state.character.stats, state.character.hiddenStats);

    // Build eval context for availability checks
    const ctx: EvalContext = {
      stats: state.character.stats,
      hiddenStats: state.character.hiddenStats,
      flags: new Set(state.flags),
      activeTags: new Set(),
    };

    const isAvailable = (cond: ConditionExpression | null | undefined): boolean => {
      if (!cond) return true;
      return evaluate(cond, ctx);
    };

    const actionItems = actions
      .map((a) => {
        const available = isAvailable(a.availableIf);
        return `<label class="action-item ${available ? "" : "action-item--disabled"}">
          <input type="radio" name="monthly-action" value="${a.id}" ${available ? "" : "disabled"} />
          <div class="action-item__inner">
            <div class="action-item__name">${a.name}</div>
            <div class="action-item__desc">${a.description}</div>
          </div>
        </label>`;
      })
      .join("");

    const supportItems = supportActions
      .map((a) => {
        const yearCount = state.supportActionYearCounts[a.id] ?? 0;
        const underLimit = a.maxPerYear === undefined || yearCount < a.maxPerYear;
        const hasEnergy = a.energyCost === undefined || state.character.stats.energy >= a.energyCost;
        const hasMoney = a.moneyCost === undefined || state.character.stats.money >= a.moneyCost;

        const available =
          isAvailable(a.availableIf) &&
          underLimit &&
          hasEnergy &&
          hasMoney;

        const reasons: string[] = [];
        if (!underLimit && a.maxPerYear !== undefined) reasons.push(`Лимит: ${yearCount}/${a.maxPerYear} в этом году`);
        if (!hasEnergy && a.energyCost !== undefined) reasons.push(`Нужно энергии: ${a.energyCost}`);
        if (!hasMoney && a.moneyCost !== undefined) reasons.push(`Нужно денег: ${a.moneyCost}`);
        const title = reasons.join(" | ");

        const metaParts: string[] = [];
        if (a.energyCost) metaParts.push(`−${a.energyCost} энергии`);
        if (a.moneyCost) metaParts.push(`−${a.moneyCost} денег`);
        if (a.maxPerYear !== undefined) metaParts.push(`${yearCount}/${a.maxPerYear} в год`);
        const metaHtml = metaParts.length
          ? `<div class="action-item__meta">${metaParts.join(" · ")}</div>`
          : "";

        return `<label class="action-item action-item--support ${available ? "" : "action-item--disabled"}" ${title ? `title="${title}"` : ""}>
          <input type="radio" name="support-action" value="${a.id}" ${available ? "" : "disabled"} />
          <div class="action-item__inner">
            <div class="action-item__name">${a.name}</div>
            <div class="action-item__desc">${a.description}</div>
            ${metaHtml}
          </div>
        </label>`;
      })
      .join("");

    // Build month range label: "Январь–Март" (current month through +MONTHS_PER_TURN-1)
    const startM = state.character.month;
    const endM = ((startM - 1 + MONTHS_PER_TURN - 1) % 12) + 1;
    const monthRangeLabel = startM === endM
      ? (MONTH_NAMES[startM] ?? "")
      : `${MONTH_NAMES[startM] ?? ""} – ${MONTH_NAMES[endM] ?? ""}`;

    const { year, age } = state.character;
    const childNote = state.character.hasChild
      ? `<span class="badge">Ребёнок</span>`
      : "";

    const energy = state.character.stats.energy;
    const energyStatus =
      energy <= 0
        ? `<div class="month__status month__status--exhausted">
            Истощение: полезные приросты становятся слабее, а в конце хода растёт стресс и падает здоровье. Найди способ восстановиться.
          </div>`
        : energy <= 10
          ? `<div class="month__status month__status--tired">
              Усталость: полезные приросты слабее, стресс растёт быстрее. Лучше сперва восстановить энергию.
            </div>`
          : "";

    // Life lines panel (only show if there are any lines)
    const visibleLines = state.character.lifeLines.filter(
      (l) => l.state !== "closed_forever"
    );
    const lifeLinesHtml = visibleLines.length > 0
      ? `<div class="month__section month__section--lifelines">
          <div class="month__section-title">Жизненные линии</div>
          <div class="lifelines-list">
            ${visibleLines.map((line) => {
              const cfg = this.lifeLineConfigs.get(line.id);
              const name = line.customName ?? cfg?.name ?? line.id;
              const stateLabel = LINE_STATE_LABELS[line.state] ?? line.state;
              const isSuspended = line.state === "suspended";
              return `<div class="lifeline-item lifeline-item--${line.state}" data-line-id="${line.id}">
                <div class="lifeline-item__info">
                  <span class="lifeline-item__name">${name}</span>
                  <span class="lifeline-item__state">${stateLabel}</span>
                </div>
                <div class="lifeline-item__actions">
                  ${!isSuspended
                    ? `<button class="btn btn--small btn--ghost btn-suspend-line" data-line-id="${line.id}">На паузу</button>`
                    : `<button class="btn btn--small btn--ghost btn-resume-line" data-line-id="${line.id}">Возобновить</button>`
                  }
                  <button class="btn btn--small btn--danger btn-close-line" data-line-id="${line.id}">
                    Отказаться навсегда
                  </button>
                </div>
              </div>`;
            }).join("")}
          </div>
        </div>`
      : "";

    const content = document.createElement("div");
    content.className = "month__content";
    content.innerHTML = `
      <div class="month__header">
        <span class="month__date">${monthRangeLabel} · Год ${year} · ${age} лет</span>
        ${childNote}
      </div>
      ${energyStatus}
      <div class="month__sections">
        <div class="month__section">
          <div class="month__section-title">Главная ставка — <span class="hint">на следующие 3 месяца</span></div>
          <div class="month__actions">${actionItems}</div>
        </div>
        <div class="month__section">
          <div class="month__section-title">Малое действие <span class="hint">(необязательно)</span></div>
          <div class="month__actions">
            <label class="action-item">
              <input type="radio" name="support-action" value="" checked />
              <div class="action-item__inner">
                <div class="action-item__name">Пропустить</div>
                <div class="action-item__desc">Никакого поддерживающего действия в этот месяц.</div>
              </div>
            </label>
            ${supportItems}
          </div>
        </div>
        ${lifeLinesHtml}
      </div>
      <button id="btn-confirm-month" class="btn btn--primary" disabled>Прожить месяц →</button>
    `;

    this.el.appendChild(content);
    this.bindEvents(callbacks);
  }

  private bindEvents(callbacks: MonthScreenCallbacks): void {
    const btn = this.el.querySelector("#btn-confirm-month") as HTMLButtonElement;
    const actionRadios = this.el.querySelectorAll('input[name="monthly-action"]');
    const supportRadios = this.el.querySelectorAll('input[name="support-action"]');

    let selectedAction = "";
    let selectedSupport: string | null = null;

    actionRadios.forEach((r) => {
      r.addEventListener("change", (e) => {
        selectedAction = (e.target as HTMLInputElement).value;
        btn.disabled = !selectedAction;
      });
    });

    supportRadios.forEach((r) => {
      r.addEventListener("change", (e) => {
        const val = (e.target as HTMLInputElement).value;
        selectedSupport = val === "" ? null : val;
      });
    });

    btn.addEventListener("click", () => {
      if (!selectedAction) return;
      callbacks.onConfirm(selectedAction, selectedSupport);
    });

    // Life line: suspend
    this.el.querySelectorAll(".btn-suspend-line").forEach((btn) => {
      btn.addEventListener("click", () => {
        const lineId = (btn as HTMLElement).dataset.lineId as LifeLineId;
        callbacks.onSuspendLifeLine?.(lineId);
      });
    });

    // Life line: close forever — show confirmation dialog
    this.el.querySelectorAll(".btn-close-line").forEach((closeBtn) => {
      closeBtn.addEventListener("click", () => {
        const lineId = (closeBtn as HTMLElement).dataset.lineId as LifeLineId;
        const cfg = this.lifeLineConfigs.get(lineId);
        const name = cfg?.name ?? lineId;
        const confirmed = window.confirm(
          `Отказаться от линии «${name}» навсегда?\n\nЭто необратимо. Линия будет закрыта, и вернуться к ней будет нельзя.`
        );
        if (confirmed) {
          callbacks.onCloseLifeLine?.(lineId);
        }
      });
    });
  }

  show(): void {
    this.el.style.display = "block";
  }

  hide(): void {
    this.el.style.display = "none";
  }

  clear(): void {
    // Remove content but keep stats panel
    const content = this.el.querySelector(".month__content");
    content?.remove();
  }
}
