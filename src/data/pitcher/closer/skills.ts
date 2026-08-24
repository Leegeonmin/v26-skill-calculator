import type { SkillGrade, SkillMeta, SkillScoreByLevel, SkillScoreTable } from "../../../types";
import { resolveAvailableCardTypes } from "../../cardAvailability";

type CloserSkillRow = {
  id: string;
  rawName: string;
  score: SkillScoreByLevel;
};

const CLOSER_SKILL_ROWS: CloserSkillRow[] = [
  { id: "closer_skill_001", rawName: "마당쇠(불펜)", score: { 5: 24.45, 6: 29.33, 7: 34.2, 8: 39.08, 9: 43.96, 10: 48.84 } },
  { id: "closer_skill_002", rawName: "황금세대", score: { 5: 17.04, 6: 24.72 } },
  { id: "closer_skill_003", rawName: "철완(지구력 134~139)", score: { 5: 16.8, 6: 21.6, 7: 21.6, 8: 21.6, 9: 21.6, 10: 21.6 } },
  { id: "closer_skill_004", rawName: "빅게임헌터", score: { 5: 18.75, 6: 20.1, 7: 23.85, 8: 25.2, 9: 27.95, 10: 29.3 } },
  { id: "closer_skill_005", rawName: "저니맨", score: { 5: 16.07, 6: 20.51, 7: 24.94, 8: 29.38, 9: 33.82, 10: 38.26 } },
  { id: "closer_skill_006", rawName: "파이어볼", score: { 5: 17, 6: 20.23, 7: 23.45, 8: 26.68, 9: 29.91, 10: 33.14 } },
  { id: "closer_skill_007", rawName: "투쟁심", score: { 5: 15.26, 6: 19.3 } },
  { id: "closer_skill_008", rawName: "철완(지구력 120~133)", score: { 5: 16.8, 6: 19.2, 7: 19.2, 8: 19.2, 9: 19.2, 10: 19.2 } },
  { id: "closer_skill_009", rawName: "철완(지구력 117~119)", score: { 5: 14.4, 6: 19.2, 7: 19.2, 8: 19.2, 9: 19.2, 10: 19.2 } },
  { id: "closer_skill_010", rawName: "패기(임팩불펜)", score: { 5: 16.8, 6: 19.2, 7: 21.6, 8: 24, 9: 26.4, 10: 28.8 } },
  { id: "closer_skill_059", rawName: "필승카드", score: { 5: 14.23, 6: 18.39, 7: 22.55, 8: 26.7, 9: 30.85, 10: 35 } },
  { id: "closer_skill_011", rawName: "해결사", score: { 5: 15.65, 6: 19.03 } },
  { id: "closer_skill_012", rawName: "전승우승", score: { 5: 12.86, 6: 18.1 } },
  { id: "closer_skill_013", rawName: "비FA계약", score: { 5: 14.4, 6: 16.8, 7: 19.2, 8: 21.6, 9: 24, 10: 26.4 } },
  { id: "closer_skill_014", rawName: "리그탑플레이어", score: { 5: 14.4, 6: 16.8, 7: 19.2, 8: 21.6, 9: 24, 10: 26.4 } },
  { id: "closer_skill_015", rawName: "구속제어", score: { 5: 14.4, 6: 16.8, 7: 21.6, 8: 26.4, 9: 31.2, 10: 36 } },
  { id: "closer_skill_016", rawName: "전천후", score: { 5: 14.4, 6: 16.8, 7: 19.2, 8: 21.6, 9: 24, 10: 26.4 } },
  { id: "closer_skill_061", rawName: "순위경쟁", score: { 5: 14.4, 6: 16.8, 7: 19.2, 8: 21.6, 9: 24, 10: 26.4 } },
  { id: "closer_skill_017", rawName: "수호신(마무리)", score: { 5: 14.4, 6: 16.8, 7: 19.2, 8: 21.6, 9: 24, 10: 26.4 } },
  { id: "closer_skill_018", rawName: "철완(지구력 100~116)", score: { 5: 14.4, 6: 16.8, 7: 16.8, 8: 16.8, 9: 16.8, 10: 16.8 } },
  { id: "closer_skill_019", rawName: "워크에식(마무리)", score: { 5: 13.68, 6: 13.68, 7: 16.08, 8: 16.08, 9: 18.48, 10: 18.48 } },
  { id: "closer_skill_020", rawName: "도전정신(4성)", score: { 5: 13.8, 6: 16.2, 7: 18.6, 8: 21, 9: 23.4, 10: 25.8 } },
  { id: "closer_skill_021", rawName: "가을사나이", score: { 5: 13.35, 6: 15.75, 7: 18.15, 8: 20.55, 9: 22.95, 10: 25.35 } },
  { id: "closer_skill_022", rawName: "패기(시그/올스타불펜)", score: { 5: 13.61, 6: 15.55, 7: 17.5, 8: 19.44, 9: 21.38, 10: 23.32 } },
  { id: "closer_skill_023", rawName: "약속의8회", score: { 5: 12.48, 6: 15.12 } },
  { id: "closer_skill_024", rawName: "국대에이스(버프o)", score: { 5: 12, 6: 14.4 } },
  { id: "closer_skill_065", rawName: "국대에이스(버프x)", score: { 5: 12, 6: 14.4 } },
  { id: "closer_skill_025", rawName: "도전정신(5성)", score: { 5: 12, 6: 14.4, 7: 16.8, 8: 19.2, 9: 21.6, 10: 24 } },
  { id: "closer_skill_026", rawName: "홈어드밴티지", score: { 5: 12, 6: 14.4, 7: 16.8, 8: 19.2, 9: 21.6, 10: 24 } },
  { id: "closer_skill_027", rawName: "에이스", score: { 5: 12, 6: 14.4, 7: 16.8, 8: 19.2, 9: 21.6, 10: 24 } },
  { id: "closer_skill_028", rawName: "승리의함성(마무리)", score: { 5: 11.68, 6: 13.64, 7: 15.61, 8: 17.58, 9: 19.55, 10: 21.52 } },
  { id: "closer_skill_029", rawName: "국민계투", score: { 5: 12.32, 6: 14.3 } },
  { id: "closer_skill_030", rawName: "부동심", score: { 5: 11.4, 6: 13.32, 7: 15.67, 8: 18.01, 9: 20.35, 10: 22.69 } },
  { id: "closer_skill_031", rawName: "베스트포지션", score: { 5: 9.6, 6: 12, 7: 16.8, 8: 21.6, 9: 26.4, 10: 31.2 } },
  { id: "closer_skill_032", rawName: "원포인트릴리프(셋업/마무리)", score: { 5: 10.85, 6: 12.67, 7: 14.48, 8: 16.3, 9: 18.12, 10: 19.94 } },
  { id: "closer_skill_033", rawName: "난세의영웅(불펜)", score: { 5: 6.24, 6: 9.41, 7: 10.18, 8: 13.34, 9: 14.11, 10: 17.27 } },
  { id: "closer_skill_034", rawName: "집중력", score: { 5: 8.45, 6: 10.57, 7: 11.62, 8: 13.74, 9: 15.86, 10: 17.98 } },
  { id: "closer_skill_035", rawName: "얼리스타트(셋업/마무리)", score: { 5: 9.07, 6: 11, 7: 12.93, 8: 14.86, 9: 16.79, 10: 18.72 } },
  { id: "closer_skill_036", rawName: "승부사", score: { 5: 8.77, 6: 10.12, 7: 11.47, 8: 12.82, 9: 14.17, 10: 15.52 } },
  { id: "closer_skill_037", rawName: "오버페이스(마무리)", score: { 5: 9.5, 6: 9.5, 7: 11.9, 8: 11.9, 9: 14.3, 10: 14.3 } },
  { id: "closer_skill_038", rawName: "아티스트", score: { 5: 8.4, 6: 9.45, 7: 10.5, 8: 11.55, 9: 12.6, 10: 13.65 } },
  { id: "closer_skill_039", rawName: "언터쳐블", score: { 5: 8.4, 6: 9.45, 7: 10.5, 8: 11.55, 9: 12.6, 10: 13.65 } },
  { id: "closer_skill_040", rawName: "흐름끊기(셋업/마무리)", score: { 5: 7.95, 6: 9.27, 7: 10.6, 8: 11.92, 9: 13.24, 10: 14.56 } },
  { id: "closer_skill_041", rawName: "백전노장", score: { 5: 7.32, 6: 9.05, 7: 10.45, 8: 11.84, 9: 13.23, 10: 14.62 } },
  { id: "closer_skill_042", rawName: "첫단추(불펜)", score: { 5: 6.75, 6: 8.1, 7: 9.45, 8: 10.8, 9: 12.15, 10: 13.5 } },
  { id: "closer_skill_043", rawName: "평정심", score: { 5: 6.75, 6: 8.1, 7: 9.45, 8: 10.8, 9: 12.15, 10: 13.5 } },
  { id: "closer_skill_060", rawName: "긴급투입(필승조/마무리)", score: { 5: 6.59, 6: 7.28, 7: 7.89, 8: 8.51, 9: 9.13, 10: 9.75 } },
  { id: "closer_skill_044", rawName: "라이징스타(배치X)", score: { 5: 6.3, 6: 7.35, 7: 8.4, 8: 9.45, 9: 10.5, 10: 11.55 } },
  { id: "closer_skill_045", rawName: "위닝샷", score: { 5: 4.34, 6: 7.07, 7: 7.39, 8: 7.72, 9: 8.05, 10: 8.38 } },
  { id: "closer_skill_046", rawName: "타선지원", score: { 5: 4.5, 6: 5.4, 7: 6.3, 8: 7.2, 9: 8.1, 10: 9 } },
  { id: "closer_skill_047", rawName: "우타킬러(좌투)", score: { 5: 5.29, 6: 6.35, 7: 7.4, 8: 8.47, 9: 9.54, 10: 10.61 } },
  { id: "closer_skill_066", rawName: "우타킬러(우투)", score: { 5: 4.48, 6: 5.37, 7: 6.27, 8: 7.16, 9: 8.05, 10: 8.94 } },
  { id: "closer_skill_048", rawName: "완급조절", score: { 5: 3.84, 6: 4.61, 7: 5.38, 8: 6.14, 9: 6.9, 10: 7.66 } },
  { id: "closer_skill_049", rawName: "클러치피처", score: { 5: 3.36, 6: 4.03, 7: 4.7, 8: 5.38, 9: 6.06, 10: 6.74 } },
  { id: "closer_skill_050", rawName: "좌타킬러(우투)", score: { 5: 3.66, 6: 4.4, 7: 5.13, 8: 5.86, 9: 6.59, 10: 7.32 } },
  { id: "closer_skill_067", rawName: "좌타킬러(좌투)", score: { 5: 2.85, 6: 3.42, 7: 3.99, 8: 4.55, 9: 5.11, 10: 5.67 } },
  { id: "closer_skill_051", rawName: "위기관리", score: { 5: 2.86, 6: 3.33, 7: 3.81, 8: 4.29, 9: 4.77, 10: 5.25 } },
  { id: "closer_skill_052", rawName: "변화구선호", score: { 5: 2.44, 6: 2.92, 7: 3.45, 8: 3.9, 9: 4.35, 10: 4.8 } },
  { id: "closer_skill_053", rawName: "기선제압(셋업/마무리)", score: { 5: 2.43, 6: 2.92, 7: 3.4, 8: 3.88, 9: 4.36, 10: 4.84 } },
  { id: "closer_skill_054", rawName: "더러운볼끝", score: { 5: 1.76, 6: 2.05, 7: 2.34, 8: 2.63, 9: 2.92, 10: 3.21 } },
  { id: "closer_skill_055", rawName: "속구선호", score: { 5: 1.36, 6: 1.36, 7: 1.81, 8: 1.81, 9: 1.81, 10: 1.81 } },
  { id: "closer_skill_056", rawName: "자신감", score: { 5: 1.16, 6: 1.35, 7: 1.55, 8: 1.74, 9: 1.93, 10: 2.12 } },
  { id: "closer_skill_057", rawName: "수호신(셋업1)", score: { 5: 0.58, 6: 0.67, 7: 0.77, 8: 0.86, 9: 0.95, 10: 1.04 } },
  { id: "closer_skill_058", rawName: "진검승부", score: { 5: 0.48, 6: 0.58, 7: 0.67, 8: 0.77, 9: 0.87, 10: 0.97 } },
  { id: "closer_skill_062", rawName: "사고방지", score: { 5: 0, 6: 0, 7: 0, 8: 0 } },
  { id: "closer_skill_063", rawName: "이닝이터", score: { 5: 0, 6: 0, 7: 0, 8: 0 } },
  { id: "closer_skill_064", rawName: "리그의강자", score: { 5: 0, 6: 0, 7: 0, 8: 0 } },
];

const AMATEUR_SKILLS = new Set(["속구선호", "변화구선호", "진검승부", "사고방지"]);
const ROOKIE_SKILLS = new Set(["평정심", "이닝이터", "기선제압", "더러운볼끝", "자신감"]);
const MINOR_SKILLS = new Set(["좌타킬러", "우타킬러", "위기관리", "완급조절"]);
const NATIONAL_ONLY_SKILLS = new Set(["황금세대", "약속의8회", "투쟁심", "전승우승", "해결사", "국민계투", "국대에이스"]);

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
  const baseName = getBaseName(row.rawName);
  const grade = resolveSkillGrade(baseName);

  return {
    id: row.id,
    name: row.rawName,
    grade,
    availableCardTypes: resolveAvailableCardTypes(row.rawName, grade),
  };
});

export const CLOSER_SKILL_SCORES: SkillScoreTable = Object.fromEntries(
  CLOSER_SKILL_ROWS.map((row) => [row.id, row.score])
);
