import type { CardType, SkillGrade } from "../types";

const ALL_CARD_TYPES: CardType[] = ["impact", "signature", "goldenGlove", "allStar", "national"];
const IMPACT_ONLY_CARD_TYPES: CardType[] = ["impact"];
const SIGNATURE_ONLY_CARD_TYPES: CardType[] = ["signature"];
const GOLDEN_GLOVE_ONLY_CARD_TYPES: CardType[] = ["goldenGlove"];
const ALL_STAR_ONLY_CARD_TYPES: CardType[] = ["allStar"];
const NATIONAL_ONLY_CARD_TYPES: CardType[] = ["national"];
const NON_IMPACT_CARD_TYPES: CardType[] = ["signature", "goldenGlove", "allStar", "national"];

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
    return name.includes("올스타") ? ["signature", "allStar"] : SIGNATURE_ONLY_CARD_TYPES;
  }

  if (name.includes("(골글")) {
    return GOLDEN_GLOVE_ONLY_CARD_TYPES;
  }

  if (name.includes("(올스타")) {
    return ALL_STAR_ONLY_CARD_TYPES;
  }

  if (name.includes("(국대")) {
    return NATIONAL_ONLY_CARD_TYPES;
  }

  return ALL_CARD_TYPES;
}
