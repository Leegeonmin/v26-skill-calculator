import type {
  CardType,
  CalculatorMode,
  HitterPositionGroup,
  SkillMeta,
} from "../types";
import { getAdvancedSkillChangeProfileByCard } from "../data/advancedSkillChange";
import {
  buildSkillFamilies,
  normalizeSkillBaseName,
  pickSkillFromFamily,
  pickWeightedFamily,
} from "./skillChangeRollCore";

interface SimulateAdvancedSkillChangeParams {
  mode: CalculatorMode;
  cardType: CardType;
  skills: SkillMeta[];
  hitterPositionGroup: HitterPositionGroup;
  fixedSkillId?: string;
}

interface SimulateAdvancedSkillChangeResult {
  skillIds: [string, string, string];
}

export function simulateAdvancedSkillChange({
  mode,
  cardType,
  skills,
  hitterPositionGroup,
  fixedSkillId,
}: SimulateAdvancedSkillChangeParams): SimulateAdvancedSkillChangeResult {
  const profile = getAdvancedSkillChangeProfileByCard(
    mode,
    hitterPositionGroup,
    cardType === "national"
  );

  const skillFamilies = buildSkillFamilies(skills, cardType, hitterPositionGroup);
  const excludedBaseNames = new Set<string>();
  const rolledSkillIds: string[] = [];

  if (cardType === "impact" && fixedSkillId) {
    const fixedSkill = skills.find((skill) => skill.id === fixedSkillId);

    if (fixedSkill) {
      rolledSkillIds.push(fixedSkill.id);
      excludedBaseNames.add(normalizeSkillBaseName(fixedSkill.name));
    }
  } else {
    const firstFamily = pickWeightedFamily(skillFamilies, profile.firstSlot, excludedBaseNames);

    if (firstFamily) {
      const firstSkill = pickSkillFromFamily(firstFamily);
      rolledSkillIds.push(firstSkill.id);
      excludedBaseNames.add(firstFamily.baseName);
    }
  }

  while (rolledSkillIds.length < 3) {
    const family = pickWeightedFamily(skillFamilies, profile.otherSlots, excludedBaseNames);

    if (!family) {
      break;
    }

    const skill = pickSkillFromFamily(family);
    rolledSkillIds.push(skill.id);
    excludedBaseNames.add(family.baseName);
  }

  while (rolledSkillIds.length < 3) {
    rolledSkillIds.push("");
  }

  return {
    skillIds: rolledSkillIds as [string, string, string],
  };
}
