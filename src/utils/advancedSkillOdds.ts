import { getAdvancedSkillChangeProfileByCard } from "../data/advancedSkillChange";
import type {
  CalculatorMode,
  CardType,
  HitterPositionGroup,
  SkillLevel,
  SkillMeta,
  SkillScoreTable,
} from "../types";
import {
  buildSkillFamilies,
  normalizeSkillBaseName,
  type SkillFamily,
} from "./skillChangeRollCore";

type RollState = {
  probability: number;
  score: number;
  excludedBaseNames: Set<string>;
};

type SkillOddsParams = {
  mode: CalculatorMode;
  cardType: CardType;
  hitterPositionGroup: HitterPositionGroup;
  skills: SkillMeta[];
  scoreTable: SkillScoreTable;
  skillIds: [string, string, string];
  skillLevels: [SkillLevel, SkillLevel, SkillLevel];
  targetScore: number;
};

export type SkillOddsResult = {
  scoreAtLeastProbability: number;
  expectedRollsForScoreAtLeast: number | null;
  evaluatedCombinationCount: number;
};

function getFamilyWeight(family: SkillFamily, weights: Partial<Record<SkillFamily["grade"], number>>) {
  return weights[family.grade] ?? 0;
}

function expandSlotStates(
  states: RollState[],
  families: SkillFamily[],
  weights: Partial<Record<SkillFamily["grade"], number>>,
  scoreTable: SkillScoreTable,
  level: SkillLevel,
  includeScore: boolean
): RollState[] {
  const nextStates: RollState[] = [];

  states.forEach((state) => {
    const candidates = families
      .map((family) => ({
        family,
        weight: state.excludedBaseNames.has(family.baseName) ? 0 : getFamilyWeight(family, weights),
      }))
      .filter((candidate) => candidate.weight > 0);
    const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);

    if (totalWeight <= 0) {
      return;
    }

    candidates.forEach(({ family, weight }) => {
      const familyProbability = state.probability * (weight / totalWeight);
      const memberProbability = familyProbability / family.members.length;

      family.members.forEach((skill) => {
        const nextExcludedBaseNames = new Set(state.excludedBaseNames);
        nextExcludedBaseNames.add(family.baseName);
        nextStates.push({
          probability: memberProbability,
          score: includeScore ? state.score + (scoreTable[skill.id]?.[level] ?? 0) : state.score,
          excludedBaseNames: nextExcludedBaseNames,
        });
      });
    });
  });

  return nextStates;
}

export function calculateAdvancedSkillOdds({
  mode,
  cardType,
  hitterPositionGroup,
  skills,
  scoreTable,
  skillIds,
  skillLevels,
  targetScore,
}: SkillOddsParams): SkillOddsResult | null {
  if (!Number.isFinite(targetScore) || targetScore <= 0 || skillIds.some((skillId) => !skillId)) {
    return null;
  }

  const isImpact = cardType === "impact";
  const profile = getAdvancedSkillChangeProfileByCard(
    mode,
    hitterPositionGroup,
    cardType === "national"
  );
  const families = buildSkillFamilies(skills, cardType, hitterPositionGroup);

  let states: RollState[] = [
    {
      probability: 1,
      score: 0,
      excludedBaseNames: new Set<string>(),
    },
  ];

  if (isImpact) {
    const fixedSkill = skills.find((skill) => skill.id === skillIds[0]);

    if (!fixedSkill) {
      return null;
    }

    states[0].excludedBaseNames.add(normalizeSkillBaseName(fixedSkill.name));
  } else {
    states = expandSlotStates(
      states,
      families,
      profile.firstSlot,
      scoreTable,
      skillLevels[0],
      true
    );
  }

  states = expandSlotStates(states, families, profile.otherSlots, scoreTable, skillLevels[1], true);
  states = expandSlotStates(states, families, profile.otherSlots, scoreTable, skillLevels[2], true);

  if (states.length === 0) {
    return null;
  }

  const normalizedTargetScore = Number(targetScore.toFixed(2));
  const scoreAtLeastProbability = states.reduce((sum, state) => {
    const score = Number(state.score.toFixed(2));
    return score + 1e-9 >= normalizedTargetScore ? sum + state.probability : sum;
  }, 0);

  return {
    scoreAtLeastProbability,
    expectedRollsForScoreAtLeast:
      scoreAtLeastProbability > 0 ? 1 / scoreAtLeastProbability : null,
    evaluatedCombinationCount: states.length,
  };
}
