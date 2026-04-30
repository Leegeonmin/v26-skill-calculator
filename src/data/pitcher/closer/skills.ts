import type { SkillGrade, SkillMeta, SkillScoreTable } from "../../../types";
import { resolveAvailableCardTypes } from "../../cardAvailability";

type CloserSkillRow = {
  id: string;
  rawName: string;
  score: { 5?: number; 6?: number; 7?: number; 8?: number };
};

const CLOSER_SKILL_ROWS: CloserSkillRow[] = [
  { id: "closer_skill_001", rawName: "마당쇠(불펜)", score: { 5: 23.1, 6: 27.75, 7: 32.4, 8: 37.05 } },
  { id: "closer_skill_002", rawName: "황금세대", score: { 5: 16.8, 6: 24 } },
  { id: "closer_skill_003", rawName: "철완(지구력 134~139)", score: { 5: 16.8, 6: 21.6, 7: 21.6, 8: 21.6 } },
  { id: "closer_skill_004", rawName: "빅게임헌터", score: { 5: 18.75, 6: 20.1, 7: 23.85, 8: 25.2 } },
  { id: "closer_skill_005", rawName: "저니맨", score: { 5: 15.7, 6: 19.95, 7: 24.2, 8: 28.45 } },
  { id: "closer_skill_006", rawName: "파이어볼", score: { 5: 16.54, 6: 19.69, 7: 22.85, 8: 26 } },
  { id: "closer_skill_007", rawName: "투쟁심", score: { 5: 15.26, 6: 19.3 } },
  { id: "closer_skill_008", rawName: "철완(지구력 120~133)", score: { 5: 16.8, 6: 19.2, 7: 19.2, 8: 19.2 } },
  { id: "closer_skill_009", rawName: "철완(지구력 117~119)", score: { 5: 14.4, 6: 19.2, 7: 19.2, 8: 19.2 } },
  { id: "closer_skill_010", rawName: "패기(임팩불펜)", score: { 5: 16.8, 6: 19.2, 7: 21.6, 8: 24 } },
  { id: "closer_skill_059", rawName: "필승카드", score: { 5: 14.6, 6: 18.85, 7: 23.1, 8: 27.35 } },
  { id: "closer_skill_011", rawName: "해결사", score: { 5: 14.86, 6: 17.93 } },
  { id: "closer_skill_012", rawName: "전승우승", score: { 5: 12.35, 6: 17.32 } },
  { id: "closer_skill_013", rawName: "비FA계약", score: { 5: 14.4, 6: 16.8, 7: 19.2, 8: 21.6 } },
  { id: "closer_skill_014", rawName: "리그탑플레이어", score: { 5: 14.4, 6: 16.8, 7: 19.2, 8: 21.6 } },
  { id: "closer_skill_015", rawName: "구속제어", score: { 5: 14.4, 6: 16.8, 7: 21.6, 8: 26.4 } },
  { id: "closer_skill_016", rawName: "전천후", score: { 5: 14.4, 6: 16.8, 7: 19.2, 8: 21.6 } },
  { id: "closer_skill_061", rawName: "순위경쟁", score: { 5: 14.4, 6: 16.8, 7: 19.2, 8: 21.6 } },
  { id: "closer_skill_017", rawName: "수호신(마무리)", score: { 5: 14.4, 6: 16.8, 7: 19.2, 8: 21.6 } },
  { id: "closer_skill_018", rawName: "철완(지구력 100~116)", score: { 5: 14.4, 6: 16.8, 7: 16.8, 8: 16.8 } },
  { id: "closer_skill_019", rawName: "워크에식(마무리)", score: { 5: 16.38, 6: 16.38, 7: 18.78, 8: 18.78 } },
  { id: "closer_skill_020", rawName: "도전정신(4성)", score: { 5: 13.63, 6: 16.08, 7: 18.43, 8: 20.83 } },
  { id: "closer_skill_021", rawName: "가을사나이", score: { 5: 13.35, 6: 15.75, 7: 18.15, 8: 20.55 } },
  { id: "closer_skill_022", rawName: "패기(시그/올스타불펜)", score: { 5: 13.61, 6: 15.55, 7: 17.5, 8: 19.44 } },
  { id: "closer_skill_023", rawName: "약속의8회", score: { 5: 12.48, 6: 15.12 } },
  { id: "closer_skill_024", rawName: "국대에이스", score: { 5: 12, 6: 14.4 } },
  { id: "closer_skill_025", rawName: "도전정신(5성)", score: { 5: 12, 6: 14.4, 7: 16.8, 8: 19.2 } },
  { id: "closer_skill_026", rawName: "홈어드밴티지", score: { 5: 12, 6: 14.4, 7: 16.8, 8: 19.2 } },
  { id: "closer_skill_027", rawName: "에이스", score: { 5: 12, 6: 14.4, 7: 16.8, 8: 19.2 } },
  { id: "closer_skill_028", rawName: "승리의함성(마무리)", score: { 5: 11.68, 6: 13.64, 7: 15.61, 8: 17.58 } },
  { id: "closer_skill_029", rawName: "국민계투", score: { 5: 11.64, 6: 13.44 } },
  { id: "closer_skill_030", rawName: "부동심", score: { 5: 11.29, 6: 13.11, 7: 15.5, 8: 17.9 } },
  { id: "closer_skill_031", rawName: "베스트포지션", score: { 5: 9.6, 6: 12, 7: 16.8, 8: 21.6 } },
  { id: "closer_skill_032", rawName: "원포인트릴리프(셋업/마무리)", score: { 5: 10.23, 6: 11.92, 7: 13.61, 8: 15.3 } },
  { id: "closer_skill_033", rawName: "난세의영웅(불펜)", score: { 5: 7.68, 6: 11.14, 7: 12.19, 8: 15.65 } },
  { id: "closer_skill_034", rawName: "집중력", score: { 5: 8.45, 6: 10.57, 7: 11.62, 8: 13.74 } },
  { id: "closer_skill_035", rawName: "얼리스타트(셋업/마무리)", score: { 5: 9.07, 6: 11, 7: 12.93, 8: 14.86 } },
  { id: "closer_skill_036", rawName: "승부사", score: { 5: 8.77, 6: 10.12, 7: 11.47, 8: 12.82 } },
  { id: "closer_skill_037", rawName: "오버페이스(마무리)", score: { 5: 9.5, 6: 9.5, 7: 11.9, 8: 11.9 } },
  { id: "closer_skill_038", rawName: "아티스트", score: { 5: 8.4, 6: 9.45, 7: 10.5, 8: 11.55 } },
  { id: "closer_skill_039", rawName: "언터쳐블", score: { 5: 8.4, 6: 9.45, 7: 10.5, 8: 11.55 } },
  { id: "closer_skill_040", rawName: "흐름끊기(셋업/마무리)", score: { 5: 7.95, 6: 9.27, 7: 10.6, 8: 11.92 } },
  { id: "closer_skill_041", rawName: "백전노장", score: { 5: 7.32, 6: 9.05, 7: 10.45, 8: 11.84 } },
  { id: "closer_skill_042", rawName: "첫단추(불펜)", score: { 5: 6.75, 6: 8.1, 7: 9.45, 8: 10.8 } },
  { id: "closer_skill_043", rawName: "평정심", score: { 5: 6.75, 6: 8.1, 7: 9.45, 8: 10.8 } },
  { id: "closer_skill_060", rawName: "긴급투입(필승조/마무리)", score: { 5: 6.78, 6: 7.4, 7: 8.03, 8: 8.66 } },
  { id: "closer_skill_044", rawName: "라이징스타(배치X)", score: { 5: 6.3, 6: 7.35, 7: 8.4, 8: 9.45 } },
  { id: "closer_skill_045", rawName: "위닝샷", score: { 5: 4.34, 6: 7.07, 7: 7.39, 8: 7.72 } },
  { id: "closer_skill_046", rawName: "타선지원", score: { 5: 5, 6: 6, 7: 7, 8: 8 } },
  { id: "closer_skill_047", rawName: "우타킬러", score: { 5: 4.07, 6: 4.88, 7: 5.7, 8: 6.51 } },
  { id: "closer_skill_048", rawName: "완급조절", score: { 5: 3.84, 6: 4.61, 7: 5.38, 8: 6.14 } },
  { id: "closer_skill_049", rawName: "클러치피처", score: { 5: 3.36, 6: 4.03, 7: 4.7, 8: 5.38 } },
  { id: "closer_skill_050", rawName: "좌타킬러", score: { 5: 3.33, 6: 4, 7: 4.66, 8: 5.33 } },
  { id: "closer_skill_051", rawName: "위기관리", score: { 5: 2.6, 6: 3.03, 7: 3.46, 8: 3.9 } },
  { id: "closer_skill_052", rawName: "변화구선호", score: { 5: 2.44, 6: 2.92, 7: 3.45, 8: 3.9 } },
  { id: "closer_skill_053", rawName: "기선제압(셋업/마무리)", score: { 5: 2.21, 6: 2.65, 7: 3.09, 8: 3.53 } },
  { id: "closer_skill_054", rawName: "더러운볼끝", score: { 5: 1.6, 6: 1.86, 7: 2.13, 8: 2.39 } },
  { id: "closer_skill_055", rawName: "속구선호", score: { 5: 1.36, 6: 1.36, 7: 1.81, 8: 1.81 } },
  { id: "closer_skill_056", rawName: "자신감", score: { 5: 1.16, 6: 1.35, 7: 1.55, 8: 1.74 } },
  { id: "closer_skill_057", rawName: "수호신(셋업1)", score: { 5: 0.58, 6: 0.67, 7: 0.77, 8: 0.86 } },
  { id: "closer_skill_058", rawName: "진검승부", score: { 5: 0.48, 6: 0.58, 7: 0.67, 8: 0.77 } },
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
