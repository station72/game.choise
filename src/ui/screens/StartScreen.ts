import { hasSave } from "../../state/SaveLoad.js";

export interface StartScreenCallbacks {
  onNewGame: () => void;
  onContinue: () => void;
}

export class StartScreen {
  private el: HTMLElement;

  constructor(container: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "screen screen--start";
    container.appendChild(this.el);
  }

  render(callbacks: StartScreenCallbacks): void {
    const canContinue = hasSave();

    this.el.innerHTML = `
      <div class="start__hero">
        <div class="start__title">ВЫБОР</div>
        <div class="start__subtitle">Атмосферный симулятор взрослой жизни</div>
        <div class="start__tagline">10 лет. 120 месяцев. Одна жизнь.</div>
        <div class="start__buttons">
          <button id="btn-new-game" class="btn btn--primary btn--large">Новая игра</button>
          ${canContinue ? '<button id="btn-continue" class="btn btn--secondary btn--large">Продолжить</button>' : ""}
        </div>
      </div>
    `;

    this.el.querySelector("#btn-new-game")!.addEventListener("click", callbacks.onNewGame);
    this.el.querySelector("#btn-continue")?.addEventListener("click", callbacks.onContinue);
  }

  show(): void {
    this.el.style.display = "block";
  }

  hide(): void {
    this.el.style.display = "none";
  }
}
