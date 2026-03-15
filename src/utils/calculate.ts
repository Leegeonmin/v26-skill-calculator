import type { CardType, SkillLevel, SkillScoreTable } from "../types";

interface CalculateParams {
  cardType: CardType;
  skillIds: string[];
  skillLevels: SkillLevel[];
  scoreTable: SkillScoreTable;
}

export function calculateSkillTotal({
  cardType,
  skillIds,
  skillLevels,
  scoreTable,
}: CalculateParams): number {
  const scores = skillIds.map((skillId, index) => {
    const level = skillLevels[index];
    const score = scoreTable[skillId]?.[level];
    return score ?? 0;
  });

  if (cardType === "impact") {
    return Number((scores[1] + scores[2]).toFixed(2));
  }

  return Number((scores[0] + scores[1] + scores[2]).toFixed(2));
}