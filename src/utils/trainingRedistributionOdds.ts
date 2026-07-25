export type TrainingPlayerType = "hitter" | "pitcher";

export type TrainingCardType =
  | "impact"
  | "national"
  | "signature"
  | "goldenGlove"
  | "allStarLive";

export type TrainingStatKey =
  | "power"
  | "contact"
  | "discipline"
  | "patience"
  | "speed"
  | "defense"
  | "breaking"
  | "stuff"
  | "velocity"
  | "control"
  | "stamina";

export type TrainingCardRule = {
  label: string;
  trainingCount: number;
  lowPickCount: 1 | 2;
};

export type TrainingOddsInput = {
  cardType: TrainingCardType;
  playerType: TrainingPlayerType;
  lowStats: TrainingStatKey[];
  targetSum: number;
};

export type TrainingOddsResult = {
  totalPoints: number;
  exactProbability: number;
  atLeastProbability: number;
  expectedAttempts: number | null;
  maxTargetSum: number;
};

export const TRAINING_CARD_RULES: Record<TrainingCardType, TrainingCardRule> = {
  impact: {
    label: "임팩트",
    trainingCount: 18,
    lowPickCount: 1,
  },
  national: {
    label: "국가대표",
    trainingCount: 20,
    lowPickCount: 1,
  },
  signature: {
    label: "시그니처",
    trainingCount: 25,
    lowPickCount: 2,
  },
  goldenGlove: {
    label: "골든글러브",
    trainingCount: 25,
    lowPickCount: 1,
  },
  allStarLive: {
    label: "올스타/라이브",
    trainingCount: 30,
    lowPickCount: 1,
  },
};

export const HITTER_TRAINING_STATS: Array<{
  key: TrainingStatKey;
  label: string;
  target: boolean;
}> = [
  { key: "power", label: "파워", target: true },
  { key: "contact", label: "정확", target: true },
  { key: "discipline", label: "선구", target: true },
  { key: "patience", label: "인내", target: false },
  { key: "speed", label: "주루", target: false },
  { key: "defense", label: "수비", target: false },
];

export const PITCHER_TRAINING_STATS: Array<{
  key: TrainingStatKey;
  label: string;
  target: boolean;
}> = [
  { key: "breaking", label: "변화", target: true },
  { key: "stuff", label: "구위", target: true },
  { key: "velocity", label: "구속", target: false },
  { key: "control", label: "제구", target: false },
  { key: "defense", label: "수비", target: false },
  { key: "stamina", label: "지구력", target: false },
];

const distributionCache = new Map<string, Map<number, number>>();

function getLogFactorials(maxValue: number) {
  const values = [0];

  for (let value = 1; value <= maxValue; value += 1) {
    values[value] = values[value - 1] + Math.log(value);
  }

  return values;
}

function getCombinationCount(n: number, r: number) {
  if (r < 0 || r > n) return 0;
  if (r === 0 || r === n) return 1;

  const nextR = Math.min(r, n - r);
  let result = 1;

  for (let index = 1; index <= nextR; index += 1) {
    result = (result * (n - nextR + index)) / index;
  }

  return result;
}

function getPermutationCountForSortedValues(values: number[]) {
  const counts = new Map<number, number>();

  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  let duplicateFactorial = 1;
  counts.forEach((count) => {
    for (let value = 2; value <= count; value += 1) {
      duplicateFactorial *= value;
    }
  });

  return 720 / duplicateFactorial;
}

function enumerateSortedCompositions(
  total: number,
  parts: number,
  minValue: number,
  current: number[],
  visit: (values: number[]) => void
) {
  if (parts === 0) {
    if (total === 0) {
      visit(current);
    }
    return;
  }

  const maxValue = Math.floor(total / parts);

  for (let value = minValue; value <= maxValue; value += 1) {
    current.push(value);
    enumerateSortedCompositions(total - value, parts - 1, value, current, visit);
    current.pop();
  }
}

function getSubsetSumDistribution(values: number[], chooseCount: number) {
  const distribution = new Map<number, number>();

  const visit = (startIndex: number, remaining: number, sum: number) => {
    if (remaining === 0) {
      distribution.set(sum, (distribution.get(sum) ?? 0) + 1);
      return;
    }

    for (let index = startIndex; index <= values.length - remaining; index += 1) {
      visit(index + 1, remaining - 1, sum + values[index]);
    }
  };

  visit(0, chooseCount, 0);
  return distribution;
}

function getTargetDistribution(totalPoints: number, lowPickCount: number, targetCount: number) {
  const cacheKey = `${totalPoints}:${lowPickCount}:${targetCount}`;
  const cached = distributionCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const distribution = new Map<number, number>();
  const logFactorials = getLogFactorials(totalPoints);
  const logBaseProbability = -totalPoints * Math.log(6);
  const remainingCount = 6 - lowPickCount;
  const subsetTotalCount = getCombinationCount(remainingCount, targetCount);

  enumerateSortedCompositions(totalPoints, 6, 0, [], (sortedValues) => {
    const logMultinomial =
      logFactorials[totalPoints] -
      sortedValues.reduce((sum, value) => sum + logFactorials[value], 0);
    const permutationCount = getPermutationCountForSortedValues(sortedValues);
    const sortedProbability = permutationCount * Math.exp(logMultinomial + logBaseProbability);
    const remainingValues = sortedValues.slice(lowPickCount);
    const subsetDistribution = getSubsetSumDistribution(remainingValues, targetCount);

    subsetDistribution.forEach((subsetCount, targetSum) => {
      const probability = sortedProbability * (subsetCount / subsetTotalCount);
      distribution.set(targetSum, (distribution.get(targetSum) ?? 0) + probability);
    });
  });

  distributionCache.set(cacheKey, distribution);
  return distribution;
}

export function calculateTrainingRedistributionOdds(input: TrainingOddsInput): TrainingOddsResult {
  const rule = TRAINING_CARD_RULES[input.cardType];
  const totalPoints = rule.trainingCount * 3;
  const statList = input.playerType === "hitter" ? HITTER_TRAINING_STATS : PITCHER_TRAINING_STATS;
  const targetStatKeys = new Set(statList.filter((stat) => stat.target).map((stat) => stat.key));
  const lowTargetCount = input.lowStats.filter((statKey) => targetStatKeys.has(statKey)).length;
  const targetCount = Math.max(0, [...targetStatKeys].length - lowTargetCount);
  const distribution = getTargetDistribution(totalPoints, rule.lowPickCount, targetCount);
  let exactProbability = 0;
  let atLeastProbability = 0;
  let maxTargetSum = 0;

  distribution.forEach((probability, targetSum) => {
    if (targetSum === input.targetSum) {
      exactProbability += probability;
    }
    if (targetSum >= input.targetSum) {
      atLeastProbability += probability;
    }
    maxTargetSum = Math.max(maxTargetSum, targetSum);
  });

  return {
    totalPoints,
    exactProbability,
    atLeastProbability,
    expectedAttempts: atLeastProbability > 0 ? 1 / atLeastProbability : null,
    maxTargetSum,
  };
}
