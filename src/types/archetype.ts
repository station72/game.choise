import type { FearType, CompensationType, PersonalLineId, RelationshipStateId } from "./character.js";

export interface Archetype {
  id: string;
  name: string;
  subtitle: string;
  backgroundId: string;
  internalProfile: {
    fear: FearType;
    compensation: CompensationType;
    personalLine: PersonalLineId;
  };
  startingRelationship: RelationshipStateId;
  hasChild: boolean;
  startingTraits: string[];
}
