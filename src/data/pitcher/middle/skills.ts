import type { CardType, SkillGrade, SkillMeta, SkillScoreTable } from "../../../types";

const ALL_CARD_TYPES: CardType[] = ["impact", "signature", "goldenGlove", "national"];
const NATIONAL_ONLY_CARD_TYPES: CardType[] = ["national"];

type MiddleSkillRow = {
  id: string;
  rawName: string;
  score: { 5: number; 6: number; 7?: number; 8?: number };
};

const MIDDLE_SKILL_ROWS: MiddleSkillRow[] = [
  { id: "middle_skill_001", rawName: "마당쇠", score: { 5: 22.6, 6: 27.65, 7: 32.3, 8: 36.95 } },
  { id: "middle_skill_002", rawName: "긴급투입(추격조)", score: { 5: 22.69, 6: 26.1, 7: 29.51, 8: 32.92 } },
  { id: "middle_skill_003", rawName: "황금세대", score: { 5: 16.9, 6: 23.75 } },
  { id: "middle_skill_004", rawName: "전승우승(추격조)", score: { 5: 15.71, 6: 22.34 } },
  { id: "middle_skill_005", rawName: "철완(지구력 134~139)", score: { 5: 17.15, 6: 22.05, 7: 22.05, 8: 22.05 } },
  { id: "middle_skill_006", rawName: "투쟁심", score: { 5: 17.15, 6: 22.04 } },
  { id: "middle_skill_007", rawName: "약속의8회(셋업맨2)", score: { 5: 16.91, 6: 21.68 } },
  { id: "middle_skill_008", rawName: "파이어볼", score: { 5: 17.79, 6: 21.17, 7: 24.54, 8: 27.92 } },
  { id: "middle_skill_009", rawName: "약속의8회(승리조)", score: { 5: 15.68, 6: 19.85 } },
  { id: "middle_skill_010", rawName: "철완(지구력 120~133)", score: { 5: 17.15, 6: 19.6, 7: 19.6, 8: 19.6 } },
  { id: "middle_skill_011", rawName: "철완(지구력 117~119)", score: { 5: 14.7, 6: 19.6, 7: 19.6, 8: 19.6 } },
  { id: "middle_skill_012", rawName: "패기(임팩/국대/올스타/라이브)", score: { 5: 17.13, 6: 19.58, 7: 22.03, 8: 24.48 } },
  { id: "middle_skill_013", rawName: "저니맨", score: { 5: 15.48, 6: 19.55, 7: 23.61, 8: 27.68 } },
  { id: "middle_skill_014", rawName: "비FA계약", score: { 5: 15.8, 6: 19.36, 7: 21.81, 8: 24.26 } },
  { id: "middle_skill_015", rawName: "필승카드(승리조,셋업맨)", score: { 5: 14.95, 6: 19.3, 7: 23.65, 8: 28 } },
  { id: "middle_skill_016", rawName: "필승카드(롱릴리프)", score: { 5: 14.95, 6: 19.3, 7: 23.65, 8: 28 } },
  { id: "middle_skill_017", rawName: "필승카드(추격조)", score: { 5: 14.95, 6: 19.3, 7: 23.65, 8: 28 } },
  { id: "middle_skill_018", rawName: "긴급투입(롱릴리프)", score: { 5: 16.8, 6: 19.16, 7: 21.53, 8: 23.89 } },
  { id: "middle_skill_019", rawName: "전승우승(롱릴리프)", score: { 5: 13.51, 6: 19.04 } },
  { id: "middle_skill_020", rawName: "빅게임헌터", score: { 5: 17.4, 6: 18.68, 7: 22.16, 8: 23.43 } },
  { id: "middle_skill_021", rawName: "패기(시그)", score: { 5: 15.78, 6: 18.03, 7: 20.29, 8: 22.54 } },
  { id: "middle_skill_022", rawName: "해결사", score: { 5: 14.82, 6: 17.81 } },
  { id: "middle_skill_023", rawName: "약속의8회(추격조,롱릴리프)", score: { 5: 13.97, 6: 17.27 } },
  { id: "middle_skill_024", rawName: "워크에식", score: { 5: 17.23, 6: 17.23, 7: 19.68, 8: 19.68 } },
  { id: "middle_skill_025", rawName: "구속제어", score: { 5: 14.7, 6: 17.15, 7: 22.05, 8: 26.95 } },
  { id: "middle_skill_026", rawName: "리그탑플레이어", score: { 5: 14.7, 6: 17.15, 7: 19.6, 8: 22.05 } },
  { id: "middle_skill_027", rawName: "전천후", score: { 5: 14.7, 6: 17.15, 7: 19.6, 8: 22.05 } },
  { id: "middle_skill_028", rawName: "철완(지구력 100~116)", score: { 5: 14.7, 6: 17.15, 7: 17.15, 8: 17.15 } },
  { id: "middle_skill_029", rawName: "국민계투(셋업맨)", score: { 5: 14.51, 6: 17.04 } },
  { id: "middle_skill_030", rawName: "순위경쟁", score: { 5: 14.33, 6: 16.78, 7: 19.23, 8: 21.68 } },
  { id: "middle_skill_031", rawName: "도전정신(4성)", score: { 5: 14.09, 6: 16.54, 7: 18.99, 8: 21.44 } },
  { id: "middle_skill_032", rawName: "수호신(셋업맨2)", score: { 5: 13.97, 6: 16.29, 7: 18.62, 8: 20.95 } },
  { id: "middle_skill_033", rawName: "약속의8회(셋업맨1)", score: { 5: 12.5, 6: 15.07 } },
  { id: "middle_skill_034", rawName: "홈어드밴티지", score: { 5: 12.62, 6: 15.07, 7: 17.52, 8: 19.97 } },
  { id: "middle_skill_035", rawName: "국대에이스", score: { 5: 12.25, 6: 14.7 } },
  { id: "middle_skill_036", rawName: "도전정신(5성)", score: { 5: 12.25, 6: 14.7, 7: 17.15, 8: 19.6 } },
  { id: "middle_skill_037", rawName: "에이스", score: { 5: 12.25, 6: 14.7, 7: 17.15, 8: 19.6 } },
  { id: "middle_skill_038", rawName: "가을사나이", score: { 5: 12.38, 6: 14.64, 7: 16.9, 8: 19.15 } },
  { id: "middle_skill_039", rawName: "부동심", score: { 5: 12.47, 6: 14.48, 7: 17.12, 8: 19.75 } },
  { id: "middle_skill_040", rawName: "국민계투(셋업맨X)", score: { 5: 12.36, 6: 14.33 } },
  { id: "middle_skill_041", rawName: "승리의함성(승리조,셋업맨)", score: { 5: 12.12, 6: 14.19, 7: 16.26, 8: 18.33 } },
  { id: "middle_skill_042", rawName: "전승우승(승리조,셋업맨)", score: { 5: 9.99, 6: 13.76 } },
  { id: "middle_skill_043", rawName: "라이징스타(셋업맨/3,4,5중계)", score: { 5: 11.65, 6: 13.74, 7: 15.84, 8: 17.93 } },
  { id: "middle_skill_044", rawName: "수호신(승리조)", score: { 5: 11.76, 6: 13.72, 7: 15.68, 8: 17.64 } },
  { id: "middle_skill_045", rawName: "난세의영웅", score: { 5: 9.8, 6: 13.72, 7: 15.19, 8: 19.11 } },
  { id: "middle_skill_046", rawName: "원포인트릴리프(셋업맨)", score: { 5: 11.07, 6: 12.83, 7: 14.6, 8: 16.36 } },
  { id: "middle_skill_047", rawName: "라이징스타(셋업맨X/3,4,5중계)", score: { 5: 10.62, 6: 12.51, 7: 14.4, 8: 16.29 } },
  { id: "middle_skill_048", rawName: "베스트포지션", score: { 5: 9.8, 6: 12.25, 7: 17.15, 8: 22.05 } },
  { id: "middle_skill_049", rawName: "흐름끊기(셋업맨)", score: { 5: 10.14, 6: 11.83, 7: 13.52, 8: 15.21 } },
  { id: "middle_skill_050", rawName: "집중력", score: { 5: 9.4, 6: 11.74, 7: 12.92, 8: 15.26 } },
  { id: "middle_skill_051", rawName: "얼리스타트(셋업맨)", score: { 5: 9.62, 6: 11.7, 7: 13.79, 8: 15.87 } },
  { id: "middle_skill_052", rawName: "원포인트릴리프(셋업맨X)", score: { 5: 9.94, 6: 11.58, 7: 13.21, 8: 14.85 } },
  { id: "middle_skill_053", rawName: "얼리스타트(셋업맨X)", score: { 5: 8.89, 6: 10.8, 7: 12.7, 8: 14.61 } },
  { id: "middle_skill_054", rawName: "백전노장", score: { 5: 8.6, 6: 10.69, 7: 12.32, 8: 13.95 } },
  { id: "middle_skill_055", rawName: "아티스트", score: { 5: 9.4, 6: 10.58, 7: 11.75, 8: 12.93 } },
  { id: "middle_skill_056", rawName: "언터쳐블", score: { 5: 9.4, 6: 10.58, 7: 11.75, 8: 12.93 } },
  { id: "middle_skill_057", rawName: "원투펀치", score: { 5: 7.65, 6: 10.2, 7: 12.75, 8: 15.3 } },
  { id: "middle_skill_058", rawName: "승리의함성(롱릴리프)", score: { 5: 8.55, 6: 10.11, 7: 11.67, 8: 13.23 } },
  { id: "middle_skill_059", rawName: "승부사", score: { 5: 8.77, 6: 10.04, 7: 11.32, 8: 12.59 } },
  { id: "middle_skill_060", rawName: "오버페이스", score: { 5: 9.9, 6: 9.9, 7: 12.35, 8: 12.35 } },
  { id: "middle_skill_061", rawName: "흐름끊기(셋업맨X)", score: { 5: 7.88, 6: 9.19, 7: 10.5, 8: 11.81 } },
  { id: "middle_skill_062", rawName: "긴급투입(승리조,셋업맨)", score: { 5: 8.04, 6: 8.83, 7: 9.63, 8: 10.42 } },
  { id: "middle_skill_063", rawName: "라이징스타(1,2,6중계)", score: { 5: 7.05, 6: 8.23, 7: 9.4, 8: 10.58 } },
  { id: "middle_skill_064", rawName: "수호신(추격조,롱릴리프)", score: { 5: 6.62, 6: 7.72, 7: 8.82, 8: 9.92 } },
  { id: "middle_skill_065", rawName: "평정심", score: { 5: 6.38, 6: 7.65, 7: 8.93, 8: 10.2 } },
  { id: "middle_skill_066", rawName: "첫단추", score: { 5: 6.38, 6: 7.65, 7: 8.93, 8: 10.2 } },
  { id: "middle_skill_067", rawName: "승리의함성(추격조)", score: { 5: 6.32, 6: 7.56, 7: 8.8, 8: 10.04 } },
  { id: "middle_skill_068", rawName: "위닝샷", score: { 5: 4.64, 6: 7.45, 7: 7.82, 8: 8.18 } },
  { id: "middle_skill_069", rawName: "우타킬러", score: { 5: 5.7, 6: 6.84, 7: 7.98, 8: 9.12 } },
  { id: "middle_skill_070", rawName: "완급조절", score: { 5: 4.53, 6: 5.44, 7: 6.35, 8: 7.25 } },
  { id: "middle_skill_071", rawName: "클러치피처", score: { 5: 3.99, 6: 4.79, 7: 5.59, 8: 6.39 } },
  { id: "middle_skill_072", rawName: "좌타킬러", score: { 5: 3.8, 6: 4.56, 7: 5.32, 8: 6.08 } },
  { id: "middle_skill_073", rawName: "변화구선호", score: { 5: 3.41, 6: 4.09, 7: 4.77, 8: 5.45 } },
  { id: "middle_skill_074", rawName: "위기관리", score: { 5: 2.84, 6: 3.32, 7: 3.79, 8: 4.27 } },
  { id: "middle_skill_075", rawName: "기선제압(셋업맨)", score: { 5: 2.53, 6: 3.03, 7: 3.54, 8: 4.05 } },
  { id: "middle_skill_076", rawName: "더러운볼끝", score: { 5: 2.07, 6: 2.41, 7: 2.75, 8: 3.1 } },
  { id: "middle_skill_077", rawName: "기선제압(셋업맨X)", score: { 5: 1.96, 6: 2.36, 7: 2.75, 8: 3.14 } },
  { id: "middle_skill_078", rawName: "자신감", score: { 5: 1.57, 6: 1.83, 7: 2.09, 8: 2.36 } },
  { id: "middle_skill_079", rawName: "속구선호", score: { 5: 1.61, 6: 1.61, 7: 2.14, 8: 2.14 } },
  { id: "middle_skill_080", rawName: "수호신(셋업맨1)", score: { 5: 0.74, 6: 0.86, 7: 0.98, 8: 1.1 } },
  { id: "middle_skill_081", rawName: "진검승부", score: { 5: 0.59, 6: 0.71, 7: 0.82, 8: 0.94 } },
  { id: "middle_skill_082", rawName: "리그의강자", score: { 5: 0, 6: 0, 7: 0, 8: 0 } },
  { id: "middle_skill_083", rawName: "사고방지", score: { 5: 0, 6: 0, 7: 0, 8: 0 } },
  { id: "middle_skill_084", rawName: "이닝이터", score: { 5: 0, 6: 0, 7: 0, 8: 0 } },
  { id: "middle_skill_085", rawName: "타선지원", score: { 5: 5, 6: 6, 7: 7, 8: 8 } },
];

const AMATEUR_SKILLS = new Set(["속구선호", "변화구선호", "진검승부", "사고방지"]);
const ROOKIE_SKILLS = new Set(["평정심", "이닝이터", "기선제압", "더러운볼끝", "자신감"]);
const MINOR_SKILLS = new Set(["좌타킬러", "우타킬러", "위기관리", "완급조절"]);
const NATIONAL_ONLY_SKILLS = new Set([
  "황금세대",
  "약속의8회",
  "투쟁심",
  "전승우승",
  "해결사",
  "국민계투",
  "국대에이스",
]);

function cleanDisplayName(rawName: string): string {
  return rawName.replace(/★\d+/g, "").replace(/(셋업맨)\d+/g, "$1").trim();
}

function getBaseName(name: string): string {
  return name.split("(")[0].trim();
}

function resolveSkillGrade(baseName: string): SkillGrade {
  if (NATIONAL_ONLY_SKILLS.has(baseName)) return "nationalOnly";
  if (AMATEUR_SKILLS.has(baseName)) return "amateur";
  if (ROOKIE_SKILLS.has(baseName)) return "rookie";
  if (MINOR_SKILLS.has(baseName)) return "minor";
  return "major";
}

export const MIDDLE_SKILLS: SkillMeta[] = MIDDLE_SKILL_ROWS.map((row) => {
  const cleanedName = cleanDisplayName(row.rawName);
  const baseName = getBaseName(cleanedName);
  const grade = resolveSkillGrade(baseName);

  return {
    id: row.id,
    name: cleanedName,
    grade,
    availableCardTypes: grade === "nationalOnly" ? NATIONAL_ONLY_CARD_TYPES : ALL_CARD_TYPES,
  };
});

export const MIDDLE_SKILL_SCORES: SkillScoreTable = Object.fromEntries(
  MIDDLE_SKILL_ROWS.map((row) => [row.id, row.score])
);
