import type { CharacterProfile, Background, InternalProfile } from "../types/character.js";
import type { ChildhoodCard, ChildhoodProfile } from "../types/childhood.js";
import type { ParentRelations } from "../types/parentRelations.js";
import type { LifeLine, LifeLineId } from "../types/lifelines.js";
// LifeLineId used in Partial<Record<LifeLineId, string>> — re-exported via types/index.js
import type { HiddenStats, VisibleStats } from "../types/stats.js";
import { clamp } from "../utils/clamp.js";

/** Result returned by the OnboardingWizard to GameEngine.startNewGame */
export interface OnboardingResult {
  playerName: string;
  backgroundId: string;
  childhoodCard: ChildhoodCard;
  parentRelations: ParentRelations;
  internalProfile: Pick<InternalProfile, "fear" | "compensation" | "personalLine">;
  /** Player's specific name for their personal dream, e.g. "Написать альбом" */
  personalDreamName: string;
  /** Player's specific "other life" fantasy, e.g. "Стать музыкантом" */
  otherLifeName: string;
}

const ALL_LINE_IDS: LifeLineId[] = [
  "own_business",
  "personal_dream",
  "career_race",
  "family_dream",
  "child_dream",
  "parent_reconciliation",
  "parent_approval_father",
  "parent_approval_mother",
  "another_life_illusion",
];

/** IDs that always exist from game start, carrying player-provided custom names */
const ALWAYS_PRESENT_LINES: LifeLineId[] = ["personal_dream", "another_life_illusion"];

function buildLifeLines(
  initialActiveLines: LifeLineId[],
  initialSuspendedLines: LifeLineId[],
  customNames: Partial<Record<LifeLineId, string>>
): LifeLine[] {
  const activeSet = new Set(initialActiveLines);
  const suspendedSet = new Set(initialSuspendedLines);

  // Lines from the childhood card + always-present lines
  const included = new Set([
    ...ALL_LINE_IDS.filter((id) => activeSet.has(id) || suspendedSet.has(id)),
    ...ALWAYS_PRESENT_LINES,
  ]);

  return ALL_LINE_IDS
    .filter((id) => included.has(id))
    .map((id) => ({
      id,
      // always-present lines that aren't in active/suspended start as suspended
      state: activeSet.has(id) ? "active" : "suspended",
      lastActedMonth: 0,
      suspendedMonths: 0,
      ...(customNames[id] ? { customName: customNames[id] } : {}),
    }));
}

function applyStatModifiers(
  base: VisibleStats,
  hiddenBase: HiddenStats,
  modifiers: Partial<VisibleStats & HiddenStats>
): { stats: VisibleStats; hiddenStats: HiddenStats } {
  const s: VisibleStats = { ...base };
  const h: HiddenStats = { ...hiddenBase };
  if (modifiers.money      !== undefined) s.money      = clamp(s.money      + modifiers.money);
  if (modifiers.energy     !== undefined) s.energy     = clamp(s.energy     + modifiers.energy);
  if (modifiers.health     !== undefined) s.health     = clamp(s.health     + modifiers.health);
  if (modifiers.closeness  !== undefined) s.closeness  = clamp(s.closeness  + modifiers.closeness);
  if (modifiers.career     !== undefined) s.career     = clamp(s.career     + modifiers.career);
  if (modifiers.stress     !== undefined) s.stress     = clamp(s.stress     + modifiers.stress);
  if (modifiers.burnout    !== undefined) h.burnout    = clamp(h.burnout    + modifiers.burnout);
  if (modifiers.fragility  !== undefined) h.fragility  = clamp(h.fragility  + modifiers.fragility);
  if (modifiers.estrangement !== undefined) h.estrangement = clamp(h.estrangement + modifiers.estrangement);
  if (modifiers.vitality   !== undefined) h.vitality   = clamp(h.vitality   + modifiers.vitality);
  if (modifiers.defocus    !== undefined) h.defocus    = clamp(h.defocus    + modifiers.defocus);
  return { stats: s, hiddenStats: h };
}

export class CharacterBuilder {
  /**
   * Full onboarding path — childhood card, parent relations, internal profile chosen.
   */
  buildFromOnboarding(result: OnboardingResult, background: Background): CharacterProfile {
    const card = result.childhoodCard;

    const { stats, hiddenStats } = applyStatModifiers(
      background.startingStats,
      background.startingHiddenStats,
      card.statModifiers
    );

    const childhoodProfile: ChildhoodProfile = {
      cardId: card.id,
      ...card.profile,
    };

    const customNames: Partial<Record<LifeLineId, string>> = {};
    if (result.personalDreamName.trim()) {
      customNames["personal_dream"] = result.personalDreamName.trim();
    }
    if (result.otherLifeName.trim()) {
      customNames["another_life_illusion"] = result.otherLifeName.trim();
    }

    const lifeLines = buildLifeLines(
      card.initialActiveLines,
      card.initialSuspendedLines,
      customNames
    );

    const traits = [...background.traits, ...card.traits];

    return {
      backgroundId: background.id,
      name: result.playerName,
      age: background.startingAge,
      stats,
      hiddenStats,
      internalProfile: {
        ...result.internalProfile,
        personalLineIgnoredMonths: 0,
      },
      relationshipState: background.startingRelationshipState,
      hasChild: false,
      childAgeMonths: 0,
      month: 1,
      year: 1,
      totalMonths: 0,
      traits,
      childhoodProfile,
      parentRelations: result.parentRelations,
      lifeLines,
    };
  }

  /**
   * Legacy path — used until the OnboardingWizard is complete.
   * Provides sensible defaults for all new fields.
   */
  buildLegacy(
    background: Background,
    playerName: string,
    internalProfile: Omit<InternalProfile, "personalLineIgnoredMonths">,
    relationshipState: import("../types/character.js").RelationshipStateId,
    hasChild: boolean
  ): CharacterProfile {
    const defaultChildhoodProfile: ChildhoodProfile = {
      cardId: "default",
      whoWasPresent: "both_parents",
      homeAtmosphere: "normal_but_empty",
      motherModel: "warm_accepting",
      fatherModel: "cold_distant",
      mainLesson: "cant_relax",
    };

    const defaultParentRelations: ParentRelations = {
      currentType: "distant_no_conflict",
      fatherPresent: true,
      motherPresent: true,
      carryingParents: false,
    };

    return {
      backgroundId: background.id,
      name: playerName,
      age: background.startingAge,
      stats: { ...background.startingStats },
      hiddenStats: { ...background.startingHiddenStats },
      internalProfile: { ...internalProfile, personalLineIgnoredMonths: 0 },
      relationshipState,
      hasChild,
      childAgeMonths: 0,
      month: 1,
      year: 1,
      totalMonths: 0,
      traits: [...background.traits],
      childhoodProfile: defaultChildhoodProfile,
      parentRelations: defaultParentRelations,
      lifeLines: [],
    };
  }
}
