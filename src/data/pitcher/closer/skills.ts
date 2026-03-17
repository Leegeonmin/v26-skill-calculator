import type { CardType, SkillGrade, SkillMeta, SkillScoreTable } from "../../../types";

const ALL_CARD_TYPES: CardType[] = ["impact", "signature", "goldenGlove", "national"];
const NATIONAL_ONLY_CARD_TYPES: CardType[] = ["national"];

type CloserSkillRow = {
  id: string;
  rawName: string;
  score: { 5: number; 6: number; 7?: number; 8?: number };
};

const CLOSER_SKILL_ROWS: CloserSkillRow[] = [
  { id: "closer_skill_001", rawName: "마당쇠", score: { 5: 22.6, 6: 27.65, 7: 32.3, 8: 36.95 } },
  { id: "closer_skill_002", rawName: "황금세대", score: { 5: 16.9, 6: 23.75 } },
  { id: "closer_skill_003", rawName: "철완(지구력 134~139)", score: { 5: 17.15, 6: 22.05, 7: 22.05, 8: 22.05 } },
  { id: "closer_skill_004", rawName: "투쟁심", score: { 5: 16.91, 6: 21.68 } },
  { id: "closer_skill_005", rawName: "파이어볼", score: { 5: 17.79, 6: 21.17, 7: 24.54, 8: 27.92 } },
  { id: "closer_skill_006", rawName: "철완(지구력 120~133)", score: { 5: 17.15, 6: 19.6, 7: 19.6, 8: 19.6 } },
  { id: "closer_skill_007", rawName: "철완(지구력 117~119)", score: { 5: 14.7, 6: 19.6, 7: 19.6, 8: 19.6 } },
  { id: "closer_skill_008", rawName: "저니맨", score: { 5: 15.48, 6: 19.55, 7: 23.61, 8: 27.68 } },
  { id: "closer_skill_009", rawName: "패기(임팩)", score: { 5: 16.98, 6: 19.4, 7: 21.83, 8: 24.26 } },
  { id: "closer_skill_010", rawName: "비FA계약", score: { 5: 15.8, 6: 19.36, 7: 21.81, 8: 24.26 } },
  { id: "closer_skill_011", rawName: "빅게임헌터", score: { 5: 17.4, 6: 18.68, 7: 22.16, 8: 23.43 } },
  { id: "closer_skill_012", rawName: "패기(국대)", score: { 5: 16.29, 6: 18.62, 7: 20.95, 8: 23.28 } },
  { id: "closer_skill_013", rawName: "필승카드", score: { 5: 14.19, 6: 18.35, 7: 22.51, 8: 26.67 } },
  { id: "closer_skill_014", rawName: "해결사", score: { 5: 14.82, 6: 17.81 } },
  { id: "closer_skill_015", rawName: "패기(시그/올스타/라이브)", score: { 5: 15.35, 6: 17.54, 7: 19.73, 8: 21.93 } },
  { id: "closer_skill_016", rawName: "구속제어", score: { 5: 14.7, 6: 17.15, 7: 22.05, 8: 26.95 } },
  { id: "closer_skill_017", rawName: "리그탑플레이어", score: { 5: 14.7, 6: 17.15, 7: 19.6, 8: 22.05 } },
  { id: "closer_skill_018", rawName: "전천후", score: { 5: 14.7, 6: 17.15, 7: 19.6, 8: 22.05 } },
  { id: "closer_skill_019", rawName: "수호신", score: { 5: 14.7, 6: 17.15, 7: 19.6, 8: 22.05 } },
  { id: "closer_skill_020", rawName: "철완(지구력 100~116)", score: { 5: 14.7, 6: 17.15, 7: 17.15, 8: 17.15 } },
  { id: "closer_skill_021", rawName: "국민계투", score: { 5: 14.51, 6: 17.04 } },
  { id: "closer_skill_022", rawName: "순위경쟁", score: { 5: 14.33, 6: 16.78, 7: 19.23, 8: 21.68 } },
  { id: "closer_skill_023", rawName: "도전정신(4성)", score: { 5: 14.09, 6: 16.54, 7: 18.99, 8: 21.44 } },
  { id: "closer_skill_024", rawName: "워크에식", score: { 5: 16.53, 6: 16.53, 7: 18.98, 8: 18.98 } },
  { id: "closer_skill_025", rawName: "승리의함성", score: { 5: 13.91, 6: 16.23, 7: 18.55, 8: 20.88 } },
  { id: "closer_skill_026", rawName: "홈어드밴티지", score: { 5: 12.62, 6: 15.07, 7: 17.52, 8: 19.97 } },
  { id: "closer_skill_027", rawName: "국대에이스", score: { 5: 12.25, 6: 14.7 } },
  { id: "closer_skill_028", rawName: "도전정신(5성)", score: { 5: 12.25, 6: 14.7, 7: 17.15, 8: 19.6 } },
  { id: "closer_skill_029", rawName: "에이스", score: { 5: 12.25, 6: 14.7, 7: 17.15, 8: 19.6 } },
  { id: "closer_skill_030", rawName: "약속의8회", score: { 5: 12.25, 6: 14.7 } },
  { id: "closer_skill_031", rawName: "가을사나이", score: { 5: 12.38, 6: 14.64, 7: 16.9, 8: 19.15 } },
  { id: "closer_skill_032", rawName: "부동심★1", score: { 5: 12.47, 6: 14.48, 7: 17.12, 8: 19.75 } },
  { id: "closer_skill_033", rawName: "난세의영웅", score: { 5: 9.8, 6: 13.72, 7: 15.19, 8: 19.11 } },
  { id: "closer_skill_034", rawName: "원포인트릴리프", score: { 5: 11.07, 6: 12.83, 7: 14.6, 8: 16.36 } },
  { id: "closer_skill_035", rawName: "베스트포지션", score: { 5: 9.8, 6: 12.25, 7: 17.15, 8: 22.05 } },
  { id: "closer_skill_036", rawName: "흐름끊기", score: { 5: 10.14, 6: 11.83, 7: 13.52, 8: 15.21 } },
  { id: "closer_skill_037", rawName: "집중력", score: { 5: 9.4, 6: 11.74, 7: 12.92, 8: 15.26 } },
  { id: "closer_skill_038", rawName: "얼리스타트", score: { 5: 9.62, 6: 11.7, 7: 13.79, 8: 15.87 } },
  { id: "closer_skill_039", rawName: "전승우승", score: { 5: 8.23, 6: 11.12 } },
  { id: "closer_skill_040", rawName: "백전노장", score: { 5: 8.6, 6: 10.69, 7: 12.32, 8: 13.95 } },
  { id: "closer_skill_041", rawName: "아티스트", score: { 5: 9.4, 6: 10.58, 7: 11.75, 8: 12.93 } },
  { id: "closer_skill_042", rawName: "언터쳐블", score: { 5: 9.4, 6: 10.58, 7: 11.75, 8: 12.93 } },
  { id: "closer_skill_043", rawName: "원투펀치", score: { 5: 7.65, 6: 10.2, 7: 12.75, 8: 15.3 } },
  { id: "closer_skill_044", rawName: "승부사", score: { 5: 8.77, 6: 10.04, 7: 11.32, 8: 12.59 } },
  { id: "closer_skill_045", rawName: "오버페이스", score: { 5: 9.65, 6: 9.65, 7: 12.1, 8: 12.1 } },
  { id: "closer_skill_046", rawName: "라이징스타", score: { 5: 7.05, 6: 8.23, 7: 9.4, 8: 10.58 } },
  { id: "closer_skill_047", rawName: "평정심", score: { 5: 6.38, 6: 7.65, 7: 8.93, 8: 10.2 } },
  { id: "closer_skill_048", rawName: "첫단추", score: { 5: 6.38, 6: 7.65, 7: 8.93, 8: 10.2 } },
  { id: "closer_skill_049", rawName: "위닝샷★1", score: { 5: 4.64, 6: 7.45, 7: 7.82, 8: 8.18 } },
  { id: "closer_skill_050", rawName: "우타킬러", score: { 5: 5.7, 6: 6.84, 7: 7.98, 8: 9.12 } },
  { id: "closer_skill_051", rawName: "완급조절", score: { 5: 4.53, 6: 5.44, 7: 6.35, 8: 7.25 } },
  { id: "closer_skill_052", rawName: "긴급투입", score: { 5: 4.8, 6: 5.04, 7: 5.29, 8: 5.53 } },
  { id: "closer_skill_053", rawName: "클러치피처", score: { 5: 3.99, 6: 4.79, 7: 5.59, 8: 6.39 } },
  { id: "closer_skill_054", rawName: "좌타킬러", score: { 5: 3.8, 6: 4.56, 7: 5.32, 8: 6.08 } },
  { id: "closer_skill_055", rawName: "변화구선호", score: { 5: 3.41, 6: 4.09, 7: 4.77, 8: 5.45 } },
  { id: "closer_skill_056", rawName: "위기관리", score: { 5: 2.84, 6: 3.32, 7: 3.79, 8: 4.27 } },
  { id: "closer_skill_057", rawName: "기선제압", score: { 5: 2.53, 6: 3.03, 7: 3.54, 8: 4.05 } },
  { id: "closer_skill_058", rawName: "더러운볼끝", score: { 5: 2.07, 6: 2.41, 7: 2.75, 8: 3.1 } },
  { id: "closer_skill_059", rawName: "자신감", score: { 5: 1.57, 6: 1.83, 7: 2.09, 8: 2.36 } },
  { id: "closer_skill_060", rawName: "속구선호", score: { 5: 1.61, 6: 1.61, 7: 2.14, 8: 2.14 } },
  { id: "closer_skill_061", rawName: "진검승부", score: { 5: 0.59, 6: 0.71, 7: 0.82, 8: 0.94 } },
  { id: "closer_skill_062", rawName: "리그의강자", score: { 5: 0, 6: 0, 7: 0, 8: 0 } },
  { id: "closer_skill_063", rawName: "타선지원", score: { 5: 0, 6: 0, 7: 0, 8: 0 } },
  { id: "closer_skill_064", rawName: "사고방지★2", score: { 5: 0, 6: 0, 7: 0, 8: 0 } },
  { id: "closer_skill_065", rawName: "이닝이터", score: { 5: 0, 6: 0, 7: 0, 8: 0 } },
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
  return rawName.replace(/★\d+/g, "").trim();
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

export const CLOSER_SKILLS: SkillMeta[] = CLOSER_SKILL_ROWS.map((row) => {
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

export const CLOSER_SKILL_SCORES: SkillScoreTable = Object.fromEntries(
  CLOSER_SKILL_ROWS.map((row) => [row.id, row.score])
);
