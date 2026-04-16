import type { ParentRelationType } from "../../types/parentRelations.js";
import type {
  FearType,
  CompensationType,
  PersonalLineId,
} from "../../types/character.js";
import type { OnboardingResult } from "../../engine/CharacterBuilder.js";
import type { DataRegistry } from "../../data/registry/DataRegistry.js";

export interface OnboardingWizardCallbacks {
  onComplete: (result: OnboardingResult) => void;
  onCancel: () => void;
}

type WizardStep = "name" | "childhood" | "parent_relations" | "internal" | "personal_line" | "preview";

const FEAR_LABELS: Record<FearType, string> = {
  fear_of_poverty: "Страх бедности",
  fear_of_loneliness: "Страх одиночества",
  fear_of_failure: "Страх провала",
  fear_of_meaninglessness: "Страх бессмысленности",
  fear_of_dependence: "Страх зависимости",
  fear_of_loss_of_control: "Страх потери контроля",
};

const COMPENSATION_LABELS: Record<CompensationType, string> = {
  overwork: "Перегружаю себя работой",
  people_pleasing: "Угождаю другим",
  isolation: "Ухожу в себя",
  consumerism: "Трачу деньги, шопинг",
  perfectionism: "Всё должно быть идеально",
  cynicism: "Иронизирую и обесцениваю",
  risk_seeking: "Ищу острых ощущений",
};

const PERSONAL_LINE_LABELS: Record<PersonalLineId, { name: string; desc: string }> = {
  create: { name: "Создавать", desc: "Тебе важно делать что-то своими руками — рисовать, писать, строить." },
  express: { name: "Выражать себя", desc: "Тебе важно быть видимым, понятым, услышанным." },
  explore: { name: "Познавать мир", desc: "Тебя тянет к новому — местам, идеям, людям." },
  build_own: { name: "Строить своё", desc: "Тебе важно иметь что-то, что принадлежит только тебе." },
  be_free: { name: "Быть свободным", desc: "Тебе важно, чтобы никто не решал за тебя." },
  leave_a_mark: { name: "Оставить след", desc: "Тебе важно, чтобы твоё существование имело значение." },
  be_needed: { name: "Быть нужным", desc: "Тебе важно, что ты что-то значишь для конкретных людей." },
};

const PARENT_TYPE_LABELS: Record<ParentRelationType, { name: string; desc: string }> = {
  warm: { name: "Тёплые", desc: "Между вами есть настоящий контакт и принятие." },
  distant_no_conflict: { name: "Дистанция без конфликта", desc: "Не ссоритесь, но и не близки. Просто каждый сам по себе." },
  tense: { name: "Напряжённые", desc: "Много несказанного, претензий, обид." },
  control_and_expectations: { name: "Контроль и ожидания", desc: "Родители ждут от тебя определённого и дают понять, когда разочарованы." },
  barely_any_contact: { name: "Почти нет контакта", desc: "Вы практически не общаетесь — по разным причинам." },
  role_inversion: { name: "Инверсия ролей", desc: "Ты несёшь их — эмоционально, финансово или физически." },
};

interface WizardState {
  playerName: string;
  backgroundId: string;
  childhoodCardId: string;
  parentType: ParentRelationType;
  fatherPresent: boolean;
  motherPresent: boolean;
  carryingParents: boolean;
  fear: FearType;
  compensation: CompensationType;
  personalLine: PersonalLineId;
  personalDreamName: string;
  otherLifeName: string;
}

export class OnboardingWizard {
  private el: HTMLElement;
  private step: WizardStep = "name";
  private registry: DataRegistry;
  private state: WizardState = {
    playerName: "",
    backgroundId: "",
    childhoodCardId: "",
    parentType: "distant_no_conflict",
    fatherPresent: true,
    motherPresent: true,
    carryingParents: false,
    fear: "fear_of_failure",
    compensation: "overwork",
    personalLine: "create",
    personalDreamName: "",
    otherLifeName: "",
  };

  constructor(container: HTMLElement, registry: DataRegistry) {
    this.el = document.createElement("div");
    this.el.className = "screen screen--onboarding";
    container.appendChild(this.el);
    this.registry = registry;
  }

  render(callbacks: OnboardingWizardCallbacks): void {
    this.el.innerHTML = "";
    switch (this.step) {
      case "name":          this.renderName(callbacks); break;
      case "childhood":     this.renderChildhood(callbacks); break;
      case "parent_relations": this.renderParentRelations(callbacks); break;
      case "internal":      this.renderInternal(callbacks); break;
      case "personal_line": this.renderPersonalLine(callbacks); break;
      case "preview":       this.renderPreview(callbacks); break;
    }
  }

  // ── Step 1: Name & Background ──────────────────────────────────────────────
  private renderName(callbacks: OnboardingWizardCallbacks): void {
    const backgrounds = [...this.registry.backgrounds.values()];
    const bgCards = backgrounds.map((bg) => `
      <label class="archetype-card">
        <input type="radio" name="bg" value="${bg.id}" ${this.state.backgroundId === bg.id ? "checked" : ""} />
        <div class="archetype-card__inner">
          <div class="archetype-card__name">${bg.name}</div>
          <div class="archetype-card__sub">${bg.description}</div>
        </div>
      </label>`).join("");

    this.el.innerHTML = `
      <div class="wizard">
        <div class="wizard__step-label">Шаг 1 из 6 — Кто ты</div>
        <h2 class="wizard__title">Введи имя и выбери стартовые условия</h2>
        <div class="start__name-row">
          <label class="start__name-label">Имя персонажа
            <input type="text" id="wiz-name" class="start__name-input" value="${this.state.playerName}" placeholder="Алексей" maxlength="30" />
          </label>
        </div>
        <div class="start__archetypes">${bgCards}</div>
        <div class="wizard__nav">
          <button id="wiz-cancel" class="btn btn--ghost">Отмена</button>
          <button id="wiz-next" class="btn btn--primary" disabled>Дальше →</button>
        </div>
      </div>`;

    const nameInput = this.el.querySelector("#wiz-name") as HTMLInputElement;
    const nextBtn = this.el.querySelector("#wiz-next") as HTMLButtonElement;
    const check = () => {
      nextBtn.disabled = !nameInput.value.trim() || !this.state.backgroundId;
    };
    nameInput.addEventListener("input", () => {
      this.state.playerName = nameInput.value;
      check();
    });
    this.el.querySelectorAll('input[name="bg"]').forEach((r) => {
      r.addEventListener("change", (e) => {
        this.state.backgroundId = (e.target as HTMLInputElement).value;
        check();
      });
    });
    check();
    nextBtn.addEventListener("click", () => { this.step = "childhood"; this.render(callbacks); });
    this.el.querySelector("#wiz-cancel")!.addEventListener("click", callbacks.onCancel);
  }

  // ── Step 2: Childhood card ─────────────────────────────────────────────────
  private renderChildhood(callbacks: OnboardingWizardCallbacks): void {
    const cards = [...this.registry.childhoodCards.values()];
    const cardItems = cards.map((c) => `
      <label class="archetype-card archetype-card--wide">
        <input type="radio" name="childhood" value="${c.id}" ${this.state.childhoodCardId === c.id ? "checked" : ""} />
        <div class="archetype-card__inner">
          <div class="archetype-card__name">${c.name}</div>
          <div class="archetype-card__sub">${c.subtitle}</div>
          <div class="archetype-card__desc">${c.description}</div>
        </div>
      </label>`).join("");

    this.el.innerHTML = `
      <div class="wizard">
        <div class="wizard__step-label">Шаг 2 из 6 — Детство</div>
        <h2 class="wizard__title">Каким было твоё детство?</h2>
        <div class="wizard__cards">${cardItems}</div>
        <div class="wizard__nav">
          <button id="wiz-back" class="btn btn--ghost">← Назад</button>
          <button id="wiz-next" class="btn btn--primary" ${this.state.childhoodCardId ? "" : "disabled"}>Дальше →</button>
        </div>
      </div>`;

    this.el.querySelectorAll('input[name="childhood"]').forEach((r) => {
      r.addEventListener("change", (e) => {
        this.state.childhoodCardId = (e.target as HTMLInputElement).value;
        const card = this.registry.childhoodCards.get(this.state.childhoodCardId);
        if (card?.suggestedFear) this.state.fear = card.suggestedFear;
        if (card?.suggestedCompensation) this.state.compensation = card.suggestedCompensation;
        (this.el.querySelector("#wiz-next") as HTMLButtonElement).disabled = false;
      });
    });
    this.el.querySelector("#wiz-back")!.addEventListener("click", () => { this.step = "name"; this.render(callbacks); });
    this.el.querySelector("#wiz-next")!.addEventListener("click", () => { this.step = "parent_relations"; this.render(callbacks); });
  }

  // ── Step 3: Parent relations ───────────────────────────────────────────────
  private renderParentRelations(callbacks: OnboardingWizardCallbacks): void {
    const typeItems = (Object.keys(PARENT_TYPE_LABELS) as ParentRelationType[]).map((t) => `
      <label class="archetype-card">
        <input type="radio" name="parent-type" value="${t}" ${this.state.parentType === t ? "checked" : ""} />
        <div class="archetype-card__inner">
          <div class="archetype-card__name">${PARENT_TYPE_LABELS[t].name}</div>
          <div class="archetype-card__sub">${PARENT_TYPE_LABELS[t].desc}</div>
        </div>
      </label>`).join("");

    this.el.innerHTML = `
      <div class="wizard">
        <div class="wizard__step-label">Шаг 3 из 6 — Родители</div>
        <h2 class="wizard__title">Как обстоят дела с родителями сейчас?</h2>
        <div class="start__archetypes">${typeItems}</div>
        <div class="wizard__checkboxes">
          <label class="checkbox-item">
            <input type="checkbox" id="wiz-father" ${this.state.fatherPresent ? "checked" : ""} />
            Отец присутствует в жизни
          </label>
          <label class="checkbox-item">
            <input type="checkbox" id="wiz-mother" ${this.state.motherPresent ? "checked" : ""} />
            Мать присутствует в жизни
          </label>
          <label class="checkbox-item">
            <input type="checkbox" id="wiz-carrying" ${this.state.carryingParents ? "checked" : ""} />
            Я несу их на себе (финансово или эмоционально)
          </label>
        </div>
        <div class="wizard__nav">
          <button id="wiz-back" class="btn btn--ghost">← Назад</button>
          <button id="wiz-next" class="btn btn--primary">Дальше →</button>
        </div>
      </div>`;

    this.el.querySelectorAll('input[name="parent-type"]').forEach((r) => {
      r.addEventListener("change", (e) => {
        this.state.parentType = (e.target as HTMLInputElement).value as ParentRelationType;
      });
    });
    (this.el.querySelector("#wiz-father") as HTMLInputElement).addEventListener("change", (e) => {
      this.state.fatherPresent = (e.target as HTMLInputElement).checked;
    });
    (this.el.querySelector("#wiz-mother") as HTMLInputElement).addEventListener("change", (e) => {
      this.state.motherPresent = (e.target as HTMLInputElement).checked;
    });
    (this.el.querySelector("#wiz-carrying") as HTMLInputElement).addEventListener("change", (e) => {
      this.state.carryingParents = (e.target as HTMLInputElement).checked;
    });
    this.el.querySelector("#wiz-back")!.addEventListener("click", () => { this.step = "childhood"; this.render(callbacks); });
    this.el.querySelector("#wiz-next")!.addEventListener("click", () => { this.step = "internal"; this.render(callbacks); });
  }

  // ── Step 4: Internal profile (fear + compensation) ─────────────────────────
  private renderInternal(callbacks: OnboardingWizardCallbacks): void {
    const fearItems = (Object.keys(FEAR_LABELS) as FearType[]).map((f) => `
      <label class="action-item">
        <input type="radio" name="fear" value="${f}" ${this.state.fear === f ? "checked" : ""} />
        <div class="action-item__inner">
          <div class="action-item__name">${FEAR_LABELS[f]}</div>
        </div>
      </label>`).join("");

    const compItems = (Object.keys(COMPENSATION_LABELS) as CompensationType[]).map((c) => `
      <label class="action-item">
        <input type="radio" name="compensation" value="${c}" ${this.state.compensation === c ? "checked" : ""} />
        <div class="action-item__inner">
          <div class="action-item__name">${COMPENSATION_LABELS[c]}</div>
        </div>
      </label>`).join("");

    this.el.innerHTML = `
      <div class="wizard">
        <div class="wizard__step-label">Шаг 4 из 6 — Внутренний стержень</div>
        <h2 class="wizard__title">Что тебя движет изнутри?</h2>
        <div class="wizard__columns">
          <div class="wizard__col">
            <div class="wizard__col-title">Глубинный страх</div>
            <div class="month__actions">${fearItems}</div>
          </div>
          <div class="wizard__col">
            <div class="wizard__col-title">Способ справляться</div>
            <div class="month__actions">${compItems}</div>
          </div>
        </div>
        <div class="wizard__nav">
          <button id="wiz-back" class="btn btn--ghost">← Назад</button>
          <button id="wiz-next" class="btn btn--primary">Дальше →</button>
        </div>
      </div>`;

    this.el.querySelectorAll('input[name="fear"]').forEach((r) => {
      r.addEventListener("change", (e) => {
        this.state.fear = (e.target as HTMLInputElement).value as FearType;
      });
    });
    this.el.querySelectorAll('input[name="compensation"]').forEach((r) => {
      r.addEventListener("change", (e) => {
        this.state.compensation = (e.target as HTMLInputElement).value as CompensationType;
      });
    });
    this.el.querySelector("#wiz-back")!.addEventListener("click", () => { this.step = "parent_relations"; this.render(callbacks); });
    this.el.querySelector("#wiz-next")!.addEventListener("click", () => { this.step = "personal_line"; this.render(callbacks); });
  }

  // ── Step 5: Personal line + custom dream names ────────────────────────────
  private renderPersonalLine(callbacks: OnboardingWizardCallbacks): void {
    const items = (Object.keys(PERSONAL_LINE_LABELS) as PersonalLineId[]).map((pl) => `
      <label class="archetype-card archetype-card--compact">
        <input type="radio" name="personal-line" value="${pl}" ${this.state.personalLine === pl ? "checked" : ""} />
        <div class="archetype-card__inner">
          <div class="archetype-card__name">${PERSONAL_LINE_LABELS[pl].name}</div>
          <div class="archetype-card__sub">${PERSONAL_LINE_LABELS[pl].desc}</div>
        </div>
      </label>`).join("");

    this.el.innerHTML = `
      <div class="wizard">
        <div class="wizard__step-label">Шаг 5 из 6 — Личная линия и мечты</div>
        <h2 class="wizard__title">Что для тебя по-настоящему важно?</h2>
        <p class="wizard__hint">Личная линия — то, от чего нельзя отказываться слишком долго, иначе теряется смысл.</p>
        <div class="start__archetypes">${items}</div>

        <div class="wizard__dream-section">
          <div class="wizard__dream-block">
            <label class="wizard__dream-label" for="wiz-dream">
              Твоя личная мечта — назови конкретно
            </label>
            <input
              type="text" id="wiz-dream"
              class="wizard__dream-input"
              value="${this.state.personalDreamName}"
              placeholder="например: Написать альбом"
              maxlength="60"
            />
            <div class="wizard__dream-examples">
              Примеры: <em>Написать роман · Запустить свой подкаст · Выступить на сцене · Объехать Японию · Нарисовать серию работ · Открыть кафе</em>
            </div>
            <p class="wizard__dream-hint">
              Это твоя «Личная мечта» — жизненная линия, которая есть у каждого. Если долго её игнорировать, падает живость. Если отказаться навсегда — больно, но освобождает.
            </p>
          </div>

          <div class="wizard__dream-block">
            <label class="wizard__dream-label" for="wiz-other-life">
              Какая жизнь снится тебе в параллельной вселенной?
            </label>
            <input
              type="text" id="wiz-other-life"
              class="wizard__dream-input"
              value="${this.state.otherLifeName}"
              placeholder="например: Стать музыкантом"
              maxlength="60"
            />
            <div class="wizard__dream-examples">
              Примеры: <em>Стать музыкантом · Жить у моря · Уехать в другую страну · Работать руками · Быть художником · Путешествовать постоянно</em>
            </div>
            <p class="wizard__dream-hint">
              Это «Иллюзия другой жизни» — фантазия о пути, который ты не выбрал. Она тихо тянет назад. Можно отпустить её навсегда — или нести с собой.
            </p>
          </div>
        </div>

        <div class="wizard__nav">
          <button id="wiz-back" class="btn btn--ghost">← Назад</button>
          <button id="wiz-next" class="btn btn--primary">Дальше →</button>
        </div>
      </div>`;

    this.el.querySelectorAll('input[name="personal-line"]').forEach((r) => {
      r.addEventListener("change", (e) => {
        this.state.personalLine = (e.target as HTMLInputElement).value as PersonalLineId;
      });
    });

    const dreamInput = this.el.querySelector("#wiz-dream") as HTMLInputElement;
    const otherInput = this.el.querySelector("#wiz-other-life") as HTMLInputElement;
    dreamInput.addEventListener("input", () => { this.state.personalDreamName = dreamInput.value; });
    otherInput.addEventListener("input", () => { this.state.otherLifeName = otherInput.value; });

    this.el.querySelector("#wiz-back")!.addEventListener("click", () => { this.step = "internal"; this.render(callbacks); });
    this.el.querySelector("#wiz-next")!.addEventListener("click", () => { this.step = "preview"; this.render(callbacks); });
  }

  // ── Step 6: Preview & confirm ──────────────────────────────────────────────
  private renderPreview(callbacks: OnboardingWizardCallbacks): void {
    const card = this.registry.childhoodCards.get(this.state.childhoodCardId);
    const bg = this.registry.backgrounds.get(this.state.backgroundId);
    const activeLines = card?.initialActiveLines
      .map((id) => this.registry.lifeLineConfigs.get(id)?.name ?? id)
      .join(", ") ?? "—";

    this.el.innerHTML = `
      <div class="wizard">
        <div class="wizard__step-label">Шаг 6 из 6 — Портрет</div>
        <h2 class="wizard__title">${this.state.playerName}</h2>
        <div class="preview-card">
          <div class="preview-row"><span class="preview-label">Старт</span><span>${bg?.name ?? "—"}</span></div>
          <div class="preview-row"><span class="preview-label">Детство</span><span>${card?.name ?? "—"} — ${card?.subtitle ?? ""}</span></div>
          <div class="preview-row"><span class="preview-label">Родители</span><span>${PARENT_TYPE_LABELS[this.state.parentType].name}</span></div>
          <div class="preview-row"><span class="preview-label">Страх</span><span>${FEAR_LABELS[this.state.fear]}</span></div>
          <div class="preview-row"><span class="preview-label">Компенсация</span><span>${COMPENSATION_LABELS[this.state.compensation]}</span></div>
          <div class="preview-row"><span class="preview-label">Личная линия</span><span>${PERSONAL_LINE_LABELS[this.state.personalLine].name}</span></div>
          <div class="preview-row"><span class="preview-label">Активные линии</span><span>${activeLines}</span></div>
          ${this.state.personalDreamName ? `<div class="preview-row"><span class="preview-label">Личная мечта</span><span>${this.state.personalDreamName}</span></div>` : ""}
          ${this.state.otherLifeName ? `<div class="preview-row"><span class="preview-label">Другая жизнь</span><span>${this.state.otherLifeName}</span></div>` : ""}
        </div>
        <div class="wizard__nav">
          <button id="wiz-back" class="btn btn--ghost">← Назад</button>
          <button id="wiz-start" class="btn btn--primary">Начать жизнь →</button>
        </div>
      </div>`;

    this.el.querySelector("#wiz-back")!.addEventListener("click", () => { this.step = "personal_line"; this.render(callbacks); });
    this.el.querySelector("#wiz-start")!.addEventListener("click", () => {
      if (!card) return;
      const result: OnboardingResult = {
        playerName: this.state.playerName.trim() || "Без имени",
        backgroundId: this.state.backgroundId,
        childhoodCard: card,
        parentRelations: {
          currentType: this.state.parentType,
          fatherPresent: this.state.fatherPresent,
          motherPresent: this.state.motherPresent,
          carryingParents: this.state.carryingParents,
        },
        internalProfile: {
          fear: this.state.fear,
          compensation: this.state.compensation,
          personalLine: this.state.personalLine,
        },
        personalDreamName: this.state.personalDreamName.trim(),
        otherLifeName: this.state.otherLifeName.trim(),
      };
      callbacks.onComplete(result);
    });
  }

  show(): void { this.el.style.display = "block"; }
  hide(): void { this.el.style.display = "none"; }

  reset(): void {
    this.step = "name";
    this.state = {
      playerName: "",
      backgroundId: "",
      childhoodCardId: "",
      parentType: "distant_no_conflict",
      fatherPresent: true,
      motherPresent: true,
      carryingParents: false,
      fear: "fear_of_failure",
      compensation: "overwork",
      personalLine: "create",
      personalDreamName: "",
      otherLifeName: "",
    };
  }
}
