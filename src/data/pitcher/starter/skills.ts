import type { CardType, SkillGrade, SkillMeta } from "../../../types";

const ALL_CARD_TYPES: CardType[] = ["impact", "signature", "goldenGlove", "national"];
const NATIONAL_ONLY_CARD_TYPES: CardType[] = ["national"];

const STARTER_SKILL_ROWS: Array<{ id: string; name: string }> = [
  { id: "starter_skill_001", name: "좌승사자(좌투)" },
  { id: "starter_skill_002", name: "황금세대" },
  { id: "starter_skill_003", name: "철완(지구력 140~149)" },
  { id: "starter_skill_004", name: "철완(지구력 134~139)" },
  { id: "starter_skill_005", name: "파이어볼" },
  { id: "starter_skill_006", name: "투쟁심" },
  { id: "starter_skill_007", name: "철완(지구력 120~133)" },
  { id: "starter_skill_008", name: "철완(지구력 117~119)" },
  { id: "starter_skill_009", name: "저니맨" },
  { id: "starter_skill_010", name: "패기(임팩)" },
  { id: "starter_skill_011", name: "비FA계약" },
  { id: "starter_skill_012", name: "필승카드" },
  { id: "starter_skill_013", name: "전승우승" },
  { id: "starter_skill_014", name: "빅게임헌터" },
  { id: "starter_skill_015", name: "해결사" },
  { id: "starter_skill_016", name: "긴급투입" },
  { id: "starter_skill_017", name: "구속제어" },
  { id: "starter_skill_018", name: "리그탑플레이어" },
  { id: "starter_skill_019", name: "전천후" },
  { id: "starter_skill_020", name: "철완(지구력 100~116)" },
  { id: "starter_skill_021", name: "순위경쟁" },
  { id: "starter_skill_022", name: "도전정신(4성)" },
  { id: "starter_skill_023", name: "원투펀치(1,2선발)" },
  { id: "starter_skill_024", name: "난세영웅" },
  { id: "starter_skill_025", name: "홈어드밴티지" },
  { id: "starter_skill_026", name: "약속의8회" },
  { id: "starter_skill_027", name: "국대에이스" },
  { id: "starter_skill_028", name: "도전정신(5성)" },
  { id: "starter_skill_029", name: "에이스" },
  { id: "starter_skill_030", name: "가을사나이" },
  { id: "starter_skill_031", name: "부동심" },
  { id: "starter_skill_032", name: "패기(시그/올스타/라이브)" },
  { id: "starter_skill_033", name: "좌승사자(우투)" },
  { id: "starter_skill_034", name: "오버페이스" },
  { id: "starter_skill_035", name: "워크에식" },
  { id: "starter_skill_036", name: "베스트포지션" },
  { id: "starter_skill_038", name: "집중력" },
  { id: "starter_skill_039", name: "집념" },
  { id: "starter_skill_040", name: "패기(골글)" },
  { id: "starter_skill_041", name: "백전노장" },
  { id: "starter_skill_042", name: "아티스트" },
  { id: "starter_skill_043", name: "언터처블" },
  { id: "starter_skill_044", name: "승리의함성" },
  { id: "starter_skill_045", name: "원투펀치(3,4,5선발)" },
  { id: "starter_skill_046", name: "승부사" },
  { id: "starter_skill_047", name: "첫단추" },
  { id: "starter_skill_048", name: "얼리스타트" },
  { id: "starter_skill_049", name: "라이징스타(3,4,5선발)" },
  { id: "starter_skill_050", name: "라이징스타(1,2선발)" },
  { id: "starter_skill_051", name: "평정심" },
  { id: "starter_skill_052", name: "위닝샷" },
  { id: "starter_skill_053", name: "원포인트릴리프" },
  { id: "starter_skill_054", name: "우타킬러" },
  { id: "starter_skill_055", name: "완급조절" },
  { id: "starter_skill_056", name: "클러치피처" },
  { id: "starter_skill_057", name: "좌타킬러" },
  { id: "starter_skill_058", name: "변화구선호" },
  { id: "starter_skill_059", name: "위기관리" },
  { id: "starter_skill_060", name: "더러운볼끝" },
  { id: "starter_skill_061", name: "자신감" },
  { id: "starter_skill_062", name: "흐름끊기" },
  { id: "starter_skill_063", name: "속구선호" },
  { id: "starter_skill_064", name: "수호신" },
  { id: "starter_skill_065", name: "진검승부" },
  { id: "starter_skill_066", name: "기선제압" },
  { id: "starter_skill_067", name: "리그의강자" },
  { id: "starter_skill_068", name: "사고방지" },
  { id: "starter_skill_069", name: "이닝이터" },
  { id: "starter_skill_070", name: "타선지원" },
];

const AMATEUR_SKILLS = new Set([
  "속구선호",
  "변화구선호",
  "진검승부",
  "사고방지",
]);

const ROOKIE_SKILLS = new Set([
  "평정심",
  "이닝이터",
  "기선제압",
  "더러운볼끝",
  "자신감",
]);

const MINOR_SKILLS = new Set([
  "좌타킬러",
  "우타킬러",
  "위기관리",
  "완급조절",
]);

const NATIONAL_ONLY_SKILLS = new Set([
  "황금세대",
  "약속의8회",
  "투쟁심",
  "전승우승",
  "해결사",
  "국대에이스",
]);

function getBaseName(name: string): string {
  return name.split("(")[0].trim();
}

function resolveStarterSkillGrade(name: string): SkillGrade {
  const baseName = getBaseName(name);

  if (NATIONAL_ONLY_SKILLS.has(baseName)) return "nationalOnly";
  if (AMATEUR_SKILLS.has(baseName)) return "amateur";
  if (ROOKIE_SKILLS.has(baseName)) return "rookie";
  if (MINOR_SKILLS.has(baseName)) return "minor";
  return "major";
}

export const STARTER_SKILLS: SkillMeta[] = STARTER_SKILL_ROWS.map((skill) => ({
  ...skill,
  grade: resolveStarterSkillGrade(skill.name),
  availableCardTypes: NATIONAL_ONLY_SKILLS.has(getBaseName(skill.name))
    ? NATIONAL_ONLY_CARD_TYPES
    : ALL_CARD_TYPES,
}));
