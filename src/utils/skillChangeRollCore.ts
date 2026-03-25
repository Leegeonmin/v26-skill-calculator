import type { CardType, HitterPositionGroup, SkillGrade, SkillGradeWeights, SkillMeta } from "../types";

export interface SkillFamily {
  key: string;
  baseName: string;
  grade: SkillGrade;
  members: SkillMeta[];
}

const FAMILY_ALIAS_RULES: Array<[RegExp, string]> = [
  [/^철완/, "철완"],
  [/^좌승사자/, "좌승사자"],
  [/^원투펀치/, "원투펀치"],
  [/^라이징스타/, "라이징스타"],
  [/^도전정신/, "도전정신"],
  [/^패기/, "패기"],
  [/^5툴플레이어/, "5툴플레이어"],
  [/^컨택트히터/, "컨택트히터"],
  [/^공포의하위타선/, "공포의하위타선"],
  [/^리드오프/, "리드오프"],
  [/^선봉장/, "선봉장"],
  [/^수비안정성/, "수비안정성"],
  [/^핵타선/, "핵타선"],
  [/^좌타해결사/, "좌타해결사"],
];

export function normalizeSkillBaseName(name: string): string {
  const compactName = name.replace(/\s+/g, "");
  const aliasRule = FAMILY_ALIAS_RULES.find(([pattern]) => pattern.test(compactName));

  if (aliasRule) {
    return aliasRule[1];
  }

  return compactName;
}

export function buildSkillFamilies(
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

export function pickWeightedFamily(
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

export function pickSkillFromFamily(family: SkillFamily): SkillMeta {
  const randomIndex = Math.floor(Math.random() * family.members.length);
  return family.members[randomIndex] ?? family.members[0];
}
