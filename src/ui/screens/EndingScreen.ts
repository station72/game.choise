import type { EndingProfile } from "../../types/summary.js";

export interface EndingScreenCallbacks {
  onNewGame: () => void;
}

export class EndingScreen {
  private el: HTMLElement;

  constructor(container: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "screen screen--ending";
    container.appendChild(this.el);
  }

  render(ending: EndingProfile, callbacks: EndingScreenCallbacks): void {
    const statsHtml = Object.entries(ending.finalStats)
      .map(([k, v]) => {
        const labels: Record<string, string> = {
          money: "Деньги", energy: "Энергия", health: "Здоровье",
          closeness: "Близость", career: "Карьера", stress: "Стресс",
        };
        return `<div class="ending-stat"><span>${labels[k] ?? k}</span><span>${Math.round(v as number)}</span></div>`;
      })
      .join("");

    const choicesHtml = ending.keyChoices
      .map((c) => `<li>${c}</li>`)
      .join("");

    this.el.innerHTML = `
      <div class="ending__title">${ending.archetypeTitle}</div>
      <div class="ending__narrative">${ending.narrative}</div>
      <div class="ending__section-title">Ключевые моменты</div>
      <ul class="ending__choices">${choicesHtml}</ul>
      <div class="ending__section-title">Итог жизни</div>
      <div class="ending__stats">${statsHtml}</div>
      <div class="ending__years">Прожито лет: ${ending.totalYears}</div>
      <button class="btn btn--primary" id="btn-new-game">Сыграть снова</button>
    `;

    this.el.querySelector("#btn-new-game")?.addEventListener("click", callbacks.onNewGame);
  }

  show(): void {
    this.el.style.display = "block";
  }

  hide(): void {
    this.el.style.display = "none";
  }
}
