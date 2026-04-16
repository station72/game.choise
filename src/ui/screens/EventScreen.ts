import type { EventCard, EventOutcome } from "../../types/events.js";
import type { StatDelta } from "../../types/stats.js";

export interface EventScreenCallbacks {
  onChoice: (optionId: "optionA" | "optionB") => void;
  onContinue: () => void;
}

export class EventScreen {
  private el: HTMLElement;

  constructor(container: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "screen screen--event";
    container.appendChild(this.el);
  }

  renderPendingChoice(
    event: EventCard,
    outcome: EventOutcome,
    callbacks: EventScreenCallbacks
  ): void {
    const choice = outcome.playerChoice!;
    this.el.innerHTML = `
      <div class="event__card">
        <div class="event__title">${event.title}</div>
        <div class="event__desc">${event.description}</div>
        <div class="event__choices">
          <button class="btn btn--choice" data-option="optionA">${choice.optionA.text}</button>
          <button class="btn btn--choice" data-option="optionB">${choice.optionB.text}</button>
        </div>
      </div>
    `;

    this.el.querySelectorAll("[data-option]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const optionId = (e.currentTarget as HTMLElement).dataset.option as
          | "optionA"
          | "optionB";
        callbacks.onChoice(optionId);
      });
    });
  }

  renderOutcome(
    event: EventCard,
    outcome: EventOutcome,
    delta: StatDelta,
    callbacks: EventScreenCallbacks
  ): void {
    const deltaHtml = this.renderDelta(delta);
    this.el.innerHTML = `
      <div class="event__card">
        <div class="event__title">${event.title}</div>
        <div class="event__outcome">${outcome.description}</div>
        <div class="event__delta">${deltaHtml}</div>
        <button class="btn btn--primary" id="btn-continue-event">Продолжить</button>
      </div>
    `;

    this.el.querySelector("#btn-continue-event")?.addEventListener("click", callbacks.onContinue);
  }

  private renderDelta(delta: StatDelta): string {
    const labels: Record<string, string> = {
      money: "Деньги",
      energy: "Энергия",
      health: "Здоровье",
      closeness: "Близость",
      career: "Карьера",
      stress: "Стресс",
      burnout: "Выгорание",
      vitality: "Живость",
      fragility: "Хрупкость",
      estrangement: "Отдаление",
    };

    const parts: string[] = [];
    for (const [key, val] of Object.entries(delta)) {
      if (val === 0 || val === undefined) continue;
      const sign = val > 0 ? "+" : "";
      const cls = val > 0 ? "delta--pos" : "delta--neg";
      parts.push(
        `<span class="${cls}">${labels[key] ?? key} ${sign}${val}</span>`
      );
    }

    return parts.length ? parts.join(" · ") : "";
  }

  show(): void {
    this.el.style.display = "block";
  }

  hide(): void {
    this.el.style.display = "none";
  }
}
