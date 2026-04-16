import type { Background } from "../../types/character.js";
import type { MonthlyAction, SupportAction } from "../../types/actions.js";
import type { EventCard } from "../../types/events.js";
import type { Archetype } from "../../types/archetype.js";
import type { LifeLineConfig, LifeLineId } from "../../types/lifelines.js";
import type { ChildhoodCard } from "../../types/childhood.js";

export interface DataRegistry {
  backgrounds: Map<string, Background>;
  monthlyActions: Map<string, MonthlyAction>;
  supportActions: Map<string, SupportAction>;
  events: EventCard[];
  archetypes: Map<string, Archetype>;
  lifeLineConfigs: Map<LifeLineId, LifeLineConfig>;
  childhoodCards: Map<string, ChildhoodCard>;
}

export function createDataRegistry(): DataRegistry {
  return {
    backgrounds: new Map(),
    monthlyActions: new Map(),
    supportActions: new Map(),
    events: [],
    archetypes: new Map(),
    lifeLineConfigs: new Map(),
    childhoodCards: new Map(),
  };
}
