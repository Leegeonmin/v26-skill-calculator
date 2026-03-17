import type {
  CardType,
  CalculatorMode,
  HitterPositionGroup,
  SkillGrade,
  SkillGradeWeights,
  SkillMeta,
} from "../types";
import { getAdvancedSkillChangeProfileByCard } from "../data/advancedSkillChange";

interface SkillFamily {
  key: string;
  baseName: string;
  grade: SkillGrade;
  members: SkillMeta[];
}

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

const FAMILY_ALIAS_RULES: Array<[RegExp, string]> = [
  [/^철완/, "철완"],
  [/^좌승사자/, "좌승사자"],
  [/^원투펀치/, "원투펀치"],
  [/^라이징스타/, "라이징스타"],
  [/^도전정신/, "도전정신"],
  [/^패기/, "패기"],
];

function normalizeSkillBaseName(name: string): string {
  const compactName = name.replace(/\s+/g, "");
  const aliasRule = FAMILY_ALIAS_RULES.find(([pattern]) => pattern.test(compactName));

  if (aliasRule) {
    return aliasRule[1];
  }

  return compactName;
}

function buildSkillFamilies(
  skills: SkillMeta[],
  cardType: CardType,
  hitterPositionGroup: HitterPositionGroup
): SkillFamily[] {
  const families = new Map<string, SkillFamily>();

  skills.forEach((skill) => {
    if (!skill.availableCardTypes.includes(cardType)) {
      return;
    }

    const baseName = normalizeSkillBaseName(skill.name);

    if (hitterPositionGroup === "fielder" && baseName === "포수리드") {
      return;
    }

    const key = `${baseName}::${skill.grade}`;
    const existingFamily = families.get(key);

    if (existingFamily) {
      existingFamily.members.push(skill);
      return;
    }

    families.set(key, {
      key,
      baseName,
      grade: skill.grade,
      members: [skill],
    });
  });

  return [...families.values()];
}

function pickWeightedFamily(
  families: SkillFamily[],
  weights: SkillGradeWeights,
  excludedBaseNames: Set<string>
): SkillFamily | null {
  const weightedFamilies = families
    .filter((family) => !excludedBaseNames.has(family.baseName))
    .map((family) => ({
      family,
      weight: weights[family.grade] ?? 0,
    }))
    .filter((entry) => entry.weight > 0);

  const totalWeight = weightedFamilies.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) {
    return null;
  }

  let random = Math.random() * totalWeight;

  for (const entry of weightedFamilies) {
    random -= entry.weight;
    if (random <= 0) {
      return entry.family;
    }
  }

  return weightedFamilies[weightedFamilies.length - 1]?.family ?? null;
}

function pickSkillFromFamily(family: SkillFamily): SkillMeta {
  const randomIndex = Math.floor(Math.random() * family.members.length);
  return family.members[randomIndex] ?? family.members[0];
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
