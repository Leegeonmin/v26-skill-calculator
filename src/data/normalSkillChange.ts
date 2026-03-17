import type { CalculatorMode, HitterPositionGroup, SkillGradeWeights } from "../types";

const HITTER_OTHER_SLOT_WEIGHTS: Record<HitterPositionGroup, SkillGradeWeights> = {
  catcher: {
    amateur: 5,
    rookie: 8,
    minor: 4.6,
    major: 0.1795,
  },
  fielder: {
    amateur: 5,
    rookie: 8,
    minor: 4.6,
    major: 0.1842,
  },
};

const PITCHER_OTHER_SLOT_WEIGHTS: Record<Exclude<CalculatorMode, "hitter">, SkillGradeWeights> = {
  starter: {
    amateur: 7.5,
    rookie: 8,
    minor: 5.75,
    major: 0.1795,
  },
  middle: {
    amateur: 7.5,
    rookie: 8,
    minor: 5.75,
    major: 0.1892,
  },
  closer: {
    amateur: 7.5,
    rookie: 8,
    minor: 5.75,
    major: 0.1944,
  },
};

export function getNormalSkillChangeOtherSlotWeights(
  mode: CalculatorMode,
  hitterPositionGroup: HitterPositionGroup
): SkillGradeWeights {
  if (mode === "hitter") {
    return HITTER_OTHER_SLOT_WEIGHTS[hitterPositionGroup];
  }

  return PITCHER_OTHER_SLOT_WEIGHTS[mode];
}
