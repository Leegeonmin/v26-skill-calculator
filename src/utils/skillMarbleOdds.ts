import type {
  CalculatorMode,
  HitterPositionGroup,
  SkillGradeWeights,
  SkillLevel,
  SkillMeta,
  SkillScoreTable,
} from "../types";
import { getNormalSkillChangeOtherSlotWeights } from "../data/normalSkillChange";
import { buildSkillFamilies, normalizeSkillBaseName, type SkillFamily } from "./skillChangeRollCore";

export type SkillMarbleMode = "oneMajor" | "twoMajor";

export interface SkillMarbleOutcome {
  skill2: SkillMeta;
  skill3: SkillMeta;
  score: number;
  probability: number;
}

export interface SkillMarbleOddsResult {
  currentScore: number;
  marbleLevelLabel: string;
  similarScoreRangeLabel: string;
  betterProbability: number;
  similarProbability: number;
  worseProbability: number;
  expectedScore: number;
  outcomeCount: number;
  betterExamples: SkillMarbleOutcome[];
  worseExamples: SkillMarbleOutcome[];
}

interface CalculateSkillMarbleOddsParams {
  skills: SkillMeta[];
  scoreTable: SkillScoreTable;
  calculatorMode: CalculatorMode;
  fixedSkillId: string;
  currentSkill2Id: string;
  currentSkill3Id: string;
  level2: SkillLevel;
  level3: SkillLevel;
  hitterPositionGroup: HitterPositionGroup;
  mode: SkillMarbleMode;
}

function getSkillScore(scoreTable: SkillScoreTable, skillId: string, level: SkillLevel) {
  return scoreTable[skillId]?.[level] ?? 0;
}

function getRepresentativeExamples(outcomes: SkillMarbleOutcome[], direction: "better" | "worse") {
  if (outcomes.length <= 3) {
    return outcomes;
  }

  const sortedOutcomes = [...outcomes].sort((a, b) =>
    direction === "better"
      ? a.score - b.score || b.probability - a.probability
      : b.score - a.score || b.probability - a.probability
  );
  const indexes = [0.28, 0.52, 0.76].map((ratio) =>
    Math.min(sortedOutcomes.length - 1, Math.max(0, Math.floor((sortedOutcomes.length - 1) * ratio)))
  );

  return indexes.map((index) => sortedOutcomes[index]).filter(Boolean);
}

function getEligibleImpactSkills(skills: SkillMeta[], hitterPositionGroup: HitterPositionGroup) {
  return skills.filter((skill) => {
    if (!skill.availableCardTypes.includes("impact")) {
      return false;
    }
    if (skill.name === "도전정신(5성)") {
      return false;
    }

    void hitterPositionGroup;
    return normalizeSkillBaseName(skill.name) !== "포수리드";
  });
}

function buildWeightedOptions(
  families: SkillFamily[],
  weights: SkillGradeWeights,
  excludedBaseNames: Set<string>
) {
  const weightedFamilies = families
    .filter((family) => !excludedBaseNames.has(family.baseName))
    .map((family) => ({
      family,
      weight: weights[family.grade] ?? 0,
    }))
    .filter((entry) => entry.weight > 0);
  const totalWeight = weightedFamilies.reduce((sum, entry) => sum + entry.weight, 0);

  if (totalWeight <= 0) {
    return [];
  }

  return weightedFamilies.flatMap(({ family, weight }) => {
    const familyProbability = weight / totalWeight;
    const memberProbability = familyProbability / family.members.length;

    return family.members.map((skill) => ({
      skill,
      family,
      probability: memberProbability,
    }));
  });
}

export function calculateSkillMarbleOdds({
  skills,
  scoreTable,
  calculatorMode,
  fixedSkillId,
  currentSkill2Id,
  currentSkill3Id,
  level2,
  level3,
  hitterPositionGroup,
  mode,
}: CalculateSkillMarbleOddsParams): SkillMarbleOddsResult | null {
  const marbleResultLevel: SkillLevel = 5;
  const impactSkills = getEligibleImpactSkills(skills, hitterPositionGroup);
  const skillFamilies = buildSkillFamilies(impactSkills, "impact", hitterPositionGroup);
  const fixedSkill = impactSkills.find((skill) => skill.id === fixedSkillId);
  const currentSkill2 = impactSkills.find((skill) => skill.id === currentSkill2Id);
  const currentSkill3 = impactSkills.find((skill) => skill.id === currentSkill3Id);

  if (!fixedSkill || !currentSkill2 || !currentSkill3) {
    return null;
  }

  const fixedBaseName = normalizeSkillBaseName(fixedSkill.name);
  const currentScore = Number(
    (
      getSkillScore(scoreTable, currentSkill2.id, level2) +
      getSkillScore(scoreTable, currentSkill3.id, level3)
    ).toFixed(2)
  );
  const majorOnlyWeights: SkillGradeWeights = { major: 1 };
  const normalSlotWeights = getNormalSkillChangeOtherSlotWeights(calculatorMode, hitterPositionGroup);
  const secondSlotOptions = buildWeightedOptions(
    skillFamilies,
    majorOnlyWeights,
    new Set([fixedBaseName])
  );

  let betterProbability = 0;
  let similarProbability = 0;
  let worseProbability = 0;
  let expectedScore = 0;
  const outcomes: SkillMarbleOutcome[] = [];
  const betterOutcomes: SkillMarbleOutcome[] = [];
  const worseOutcomes: SkillMarbleOutcome[] = [];

  secondSlotOptions.forEach(({ skill: skill2, family: skill2Family, probability: secondProbability }) => {
    const thirdSlotOptions = buildWeightedOptions(
      skillFamilies,
      mode === "twoMajor" ? majorOnlyWeights : normalSlotWeights,
      new Set([fixedBaseName, skill2Family.baseName])
    );

    if (thirdSlotOptions.length === 0) {
      return;
    }

    thirdSlotOptions.forEach(({ skill: skill3, probability: thirdProbability }) => {
      const probability = secondProbability * thirdProbability;
      const score = Number(
        (
          getSkillScore(scoreTable, skill2.id, marbleResultLevel) +
          getSkillScore(scoreTable, skill3.id, marbleResultLevel)
        ).toFixed(2)
      );

      expectedScore += score * probability;

      const outcome = {
        skill2,
        skill3,
        score,
        probability,
      };

      if (score > currentScore + 1) {
        betterProbability += probability;
        betterOutcomes.push(outcome);
      } else if (score < currentScore - 1) {
        worseProbability += probability;
        worseOutcomes.push(outcome);
      } else {
        similarProbability += probability;
      }

      outcomes.push(outcome);
    });
  });

  return {
    currentScore,
    marbleLevelLabel: "Lv.5 + Lv.5",
    similarScoreRangeLabel: "현재 점수 ±1점",
    betterProbability,
    similarProbability,
    worseProbability,
    expectedScore: Number(expectedScore.toFixed(2)),
    outcomeCount: outcomes.length,
    betterExamples: getRepresentativeExamples(betterOutcomes, "better"),
    worseExamples: getRepresentativeExamples(worseOutcomes, "worse"),
  };
}
