import type { CardType, SkillGrade } from "../types";

const ALL_CARD_TYPES: CardType[] = ["impact", "signature", "goldenGlove", "national"];
const IMPACT_ONLY_CARD_TYPES: CardType[] = ["impact"];
const SIGNATURE_ONLY_CARD_TYPES: CardType[] = ["signature"];
const GOLDEN_GLOVE_ONLY_CARD_TYPES: CardType[] = ["goldenGlove"];
const NATIONAL_ONLY_CARD_TYPES: CardType[] = ["national"];
const NON_IMPACT_CARD_TYPES: CardType[] = ["signature", "goldenGlove", "national"];

export function resolveAvailableCardTypes(name: string, grade: SkillGrade): CardType[] {
  if (grade === "nationalOnly") {
    return NATIONAL_ONLY_CARD_TYPES;
  }

  if (name === "도전정신(4성)") {
    return IMPACT_ONLY_CARD_TYPES;
  }

  if (name === "도전정신(5성)") {
    return NON_IMPACT_CARD_TYPES;
  }

  if (name.includes("(임팩")) {
    return IMPACT_ONLY_CARD_TYPES;
  }

  if (name.includes("(시그")) {
    return SIGNATURE_ONLY_CARD_TYPES;
  }

  if (name.includes("(골글")) {
    return GOLDEN_GLOVE_ONLY_CARD_TYPES;
  }

  if (name.includes("(국대")) {
    return NATIONAL_ONLY_CARD_TYPES;
  }

  return ALL_CARD_TYPES;
}
