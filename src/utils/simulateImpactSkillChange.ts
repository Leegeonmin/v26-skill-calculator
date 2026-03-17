import type { CalculatorMode, HitterPositionGroup, SkillMeta } from "../types";
import { getNormalSkillChangeOtherSlotWeights } from "../data/normalSkillChange";
import {
  buildSkillFamilies,
  normalizeSkillBaseName,
  pickSkillFromFamily,
  pickWeightedFamily,
} from "./skillChangeRollCore";

const DEFAULT_MAX_ROLLS = 100000;

interface SimulateImpactSkillChangeParams {
  mode: CalculatorMode;
  skills: SkillMeta[];
  hitterPositionGroup: HitterPositionGroup;
  fixedSkillId: string;
  maxRolls?: number;
}

interface SimulateImpactSkillChangeResult {
  success: boolean;
  rollCount: number;
  skillIds: [string, string, string];
}

export function simulateImpactSkillChangeUntilDoubleMajor({
  mode,
  skills,
  hitterPositionGroup,
  fixedSkillId,
  maxRolls = DEFAULT_MAX_ROLLS,
}: SimulateImpactSkillChangeParams): SimulateImpactSkillChangeResult {
  const impactSkills = skills.filter((skill) => skill.availableCardTypes.includes("impact"));
  const fixedSkill = impactSkills.find((skill) => skill.id === fixedSkillId);

  if (!fixedSkill) {
    return {
      success: false,
      rollCount: 0,
      skillIds: ["", "", ""],
    };
  }

  const otherSlotWeights = getNormalSkillChangeOtherSlotWeights(mode, hitterPositionGroup);
  const skillFamilies = buildSkillFamilies(impactSkills, "impact", hitterPositionGroup);

  let lastRolledSkillIds: [string, string, string] = [fixedSkill.id, "", ""];

  for (let rollCount = 1; rollCount <= maxRolls; rollCount += 1) {
    const excludedBaseNames = new Set<string>([normalizeSkillBaseName(fixedSkill.name)]);
    const rolledOtherSkills: SkillMeta[] = [];

    while (rolledOtherSkills.length < 2) {
      const family = pickWeightedFamily(skillFamilies, otherSlotWeights, excludedBaseNames);

      if (!family) {
        break;
      }

      const skill = pickSkillFromFamily(family);
      rolledOtherSkills.push(skill);
      excludedBaseNames.add(family.baseName);
    }

    const nextSkillIds: [string, string, string] = [
      fixedSkill.id,
      rolledOtherSkills[0]?.id ?? "",
      rolledOtherSkills[1]?.id ?? "",
    ];

    lastRolledSkillIds = nextSkillIds;

    if (
      rolledOtherSkills.length === 2 &&
      rolledOtherSkills.every((skill) => skill.grade === "major")
    ) {
      return {
        success: true,
        rollCount,
        skillIds: nextSkillIds,
      };
    }
  }

  return {
    success: false,
    rollCount: maxRolls,
    skillIds: lastRolledSkillIds,
  };
}
