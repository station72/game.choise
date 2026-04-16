import type { DataRegistry } from "../registry/DataRegistry.js";
import type { Background } from "../../types/character.js";
import type { MonthlyAction, SupportAction } from "../../types/actions.js";
import type { EventCard } from "../../types/events.js";
import type { Archetype } from "../../types/archetype.js";
import type { LifeLineConfig } from "../../types/lifelines.js";
import type { ChildhoodCard } from "../../types/childhood.js";

// Vite's glob import — loads all JSON files under data/
const backgroundFiles = import.meta.glob("/data/backgrounds/*.json", {
  eager: true,
});
const archetypeFiles = import.meta.glob("/data/archetypes/*.json", {
  eager: true,
});
const monthlyActionsFile = import.meta.glob("/data/actions/monthly-actions.json", {
  eager: true,
});
const supportActionsFile = import.meta.glob("/data/actions/support-actions.json", {
  eager: true,
});
const eventFiles = import.meta.glob("/data/events/*.json", {
  eager: true,
});
const lifeLineConfigFile = import.meta.glob("/data/lifelines/lifelines-config.json", {
  eager: true,
});
const childhoodCardsFile = import.meta.glob("/data/childhood/childhood-cards.json", {
  eager: true,
});

export function loadAllData(registry: DataRegistry): void {
  // Backgrounds
  for (const path in backgroundFiles) {
    const bg = (backgroundFiles[path] as { default: Background }).default;
    registry.backgrounds.set(bg.id, bg);
  }

  // Archetypes
  for (const path in archetypeFiles) {
    const list = (archetypeFiles[path] as { default: Archetype[] }).default;
    for (const a of list) {
      registry.archetypes.set(a.id, a);
    }
  }

  // Monthly actions
  for (const path in monthlyActionsFile) {
    const list = (monthlyActionsFile[path] as { default: MonthlyAction[] }).default;
    for (const a of list) {
      registry.monthlyActions.set(a.id, a);
    }
  }

  // Support actions
  for (const path in supportActionsFile) {
    const list = (supportActionsFile[path] as { default: SupportAction[] }).default;
    for (const a of list) {
      registry.supportActions.set(a.id, a);
    }
  }

  // Events (all files merged)
  for (const path in eventFiles) {
    const list = (eventFiles[path] as { default: EventCard[] }).default;
    registry.events.push(...list);
  }

  // Life line configs
  for (const path in lifeLineConfigFile) {
    const list = (lifeLineConfigFile[path] as { default: LifeLineConfig[] }).default;
    for (const cfg of list) {
      registry.lifeLineConfigs.set(cfg.id, cfg);
    }
  }

  // Childhood cards
  for (const path in childhoodCardsFile) {
    const list = (childhoodCardsFile[path] as { default: ChildhoodCard[] }).default;
    for (const card of list) {
      registry.childhoodCards.set(card.id, card);
    }
  }
}
