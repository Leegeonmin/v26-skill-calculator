import type { CalculatorMode, HitterPositionGroup, SkillGradeWeights } from "../types";

type CardGroup = "normal" | "national";

interface AdvancedSkillChangeProfile {
  firstSlot: SkillGradeWeights;
  otherSlots: SkillGradeWeights;
}

const HITTER_PROFILE_BY_POSITION: Record<
  HitterPositionGroup,
  Record<CardGroup, AdvancedSkillChangeProfile>
> = {
  catcher: {
    normal: {
      firstSlot: { major: 2.5641 },
      otherSlots: { amateur: 4.1667, rookie: 5.6, minor: 6, major: 0.4359 },
    },
    national: {
      firstSlot: { major: 2.3077, nationalOnly: 1.6667 },
      otherSlots: {
        amateur: 4.1667,
        rookie: 5.6,
        minor: 6,
        major: 0.1795,
        nationalOnly: 1.6667,
      },
    },
  },
  fielder: {
    normal: {
      firstSlot: { major: 2.6316 },
      otherSlots: { amateur: 4.1667, rookie: 5.6, minor: 6, major: 0.4474 },
    },
    national: {
      firstSlot: { major: 2.3684, nationalOnly: 1.6667 },
      otherSlots: {
        amateur: 4.1667,
        rookie: 5.6,
        minor: 6,
        major: 0.1842,
        nationalOnly: 1.6667,
      },
    },
  },
};

const PITCHER_PROFILE_BY_MODE: Record<
  Exclude<CalculatorMode, "hitter">,
  Record<CardGroup, AdvancedSkillChangeProfile>
> = {
  starter: {
    normal: {
      firstSlot: { major: 2.5641 },
      otherSlots: { amateur: 6.25, rookie: 5.6, minor: 7.5, major: 0.4359 },
    },
    national: {
      firstSlot: { major: 2.3077, nationalOnly: 1.6667 },
      otherSlots: {
        amateur: 6.25,
        rookie: 5.6,
        minor: 7.5,
        major: 0.1795,
        nationalOnly: 1.6667,
      },
    },
  },
  middle: {
    normal: {
      firstSlot: { major: 2.7027 },
      otherSlots: { amateur: 6.25, rookie: 5.6, minor: 7.5, major: 0.4595 },
    },
    national: {
      firstSlot: { major: 2.4324, nationalOnly: 1.4286 },
      otherSlots: {
        amateur: 6.25,
        rookie: 5.6,
        minor: 7.5,
        major: 0.1892,
        nationalOnly: 1.4286,
      },
    },
  },
  closer: {
    normal: {
      firstSlot: { major: 2.7778 },
      otherSlots: { amateur: 6.25, rookie: 5.6, minor: 7.5, major: 0.4722 },
    },
    national: {
      firstSlot: { major: 2.5, nationalOnly: 1.4286 },
      otherSlots: {
        amateur: 6.25,
        rookie: 5.6,
        minor: 7.5,
        major: 0.1944,
        nationalOnly: 1.4286,
      },
    },
  },
};

export function getAdvancedSkillChangeProfile(
  mode: CalculatorMode,
  hitterPositionGroup: HitterPositionGroup
): AdvancedSkillChangeProfile {
  if (mode === "hitter") {
    return HITTER_PROFILE_BY_POSITION[hitterPositionGroup].normal;
  }

  return PITCHER_PROFILE_BY_MODE[mode].normal;
}

export function getAdvancedSkillChangeProfileByCard(
  mode: CalculatorMode,
  hitterPositionGroup: HitterPositionGroup,
  isNational: boolean
): AdvancedSkillChangeProfile {
  const cardGroup: CardGroup = isNational ? "national" : "normal";

  if (mode === "hitter") {
    return HITTER_PROFILE_BY_POSITION[hitterPositionGroup][cardGroup];
  }

  return PITCHER_PROFILE_BY_MODE[mode][cardGroup];
}

