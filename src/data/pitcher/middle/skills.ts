import type { SkillGrade, SkillMeta, SkillScoreByLevel, SkillScoreTable } from "../../../types";
import { resolveAvailableCardTypes } from "../../cardAvailability";

type MiddleSkillRow = {
  id: string;
  rawName: string;
  score: SkillScoreByLevel;
};

const MIDDLE_SKILL_ROWS: MiddleSkillRow[] = [
  { id: "middle_skill_001", rawName: "마당쇠(불펜)", score: { 5: 23.45, 6: 28.08, 7: 32.7, 8: 37.33, 9: 41.96, 10: 46.59 } },
  { id: "middle_skill_002", rawName: "황금세대", score: { 5: 17.04, 6: 24.72 } },
  { id: "middle_skill_080", rawName: "위기탈출", score: { 5: 18.52, 6: 22.93 } },
  { id: "middle_skill_081", rawName: "타순공략", score: { 5: 18.08, 6: 22.5 } },
  { id: "middle_skill_082", rawName: "좌승사자(좌투, 계승만 가능)", score: { 5: 10.76, 6: 14.06, 7: 16.46, 8: 18.86, 9: 21.26, 10: 23.66 } },
  { id: "middle_skill_083", rawName: "좌승사자(우투, 계승만 가능)", score: { 5: 10.76, 6: 14.06, 7: 16.46, 8: 18.86, 9: 21.26, 10: 23.66 } },
  { id: "middle_skill_003", rawName: "철완(지구력 134~139)", score: { 5: 16.8, 6: 21.6, 7: 21.6, 8: 21.6, 9: 21.6, 10: 21.6 } },
  { id: "middle_skill_069", rawName: "긴급투입(추격조)", score: { 5: 19.19, 6: 22.11, 7: 25.04, 8: 27.96, 9: 30.88, 10: 33.8 } },
  { id: "middle_skill_004", rawName: "빅게임헌터", score: { 5: 19.5, 6: 21, 7: 24.9, 8: 26.4, 9: 29.3, 10: 30.8 } },
  { id: "middle_skill_005", rawName: "저니맨", score: { 5: 14.82, 6: 19.01, 7: 23.19, 8: 27.38, 9: 31.57, 10: 35.76 } },
  { id: "middle_skill_006", rawName: "파이어볼", score: { 5: 17, 6: 20.23, 7: 23.45, 8: 26.68, 9: 29.91, 10: 33.14 } },
  { id: "middle_skill_007", rawName: "투쟁심", score: { 5: 15.26, 6: 19.3 } },
  { id: "middle_skill_008", rawName: "철완(지구력 120~133)", score: { 5: 16.8, 6: 19.2, 7: 19.2, 8: 19.2, 9: 19.2, 10: 19.2 } },
  { id: "middle_skill_009", rawName: "철완(지구력 117~119)", score: { 5: 14.4, 6: 19.2, 7: 19.2, 8: 19.2, 9: 19.2, 10: 19.2 } },
  { id: "middle_skill_010", rawName: "패기(임팩불펜)", score: { 5: 16.8, 6: 19.2, 7: 21.6, 8: 24, 9: 26.4, 10: 28.8 } },
  { id: "middle_skill_070", rawName: "필승카드", score: { 5: 14.23, 6: 18.39, 7: 22.55, 8: 26.7, 9: 30.85, 10: 35 } },
  { id: "middle_skill_011", rawName: "해결사", score: { 5: 15.65, 6: 19.03 } },
  { id: "middle_skill_012", rawName: "전승우승", score: { 5: 12.86, 6: 18.1 } },
  { id: "middle_skill_013", rawName: "워크에식(중계)", score: { 5: 18.16, 6: 18.16, 7: 20.56, 8: 20.56, 9: 22.96, 10: 22.96 } },
  { id: "middle_skill_014", rawName: "비FA계약", score: { 5: 12.9, 6: 15.05, 7: 17.2, 8: 19.35, 9: 21.5, 10: 23.65 } },
  { id: "middle_skill_015", rawName: "리그탑플레이어", score: { 5: 14.4, 6: 16.8, 7: 19.2, 8: 21.6, 9: 24, 10: 26.4 } },
  { id: "middle_skill_016", rawName: "구속제어", score: { 5: 14.4, 6: 16.8, 7: 21.6, 8: 26.4, 9: 31.2, 10: 36 } },
  { id: "middle_skill_017", rawName: "전천후", score: { 5: 14.65, 6: 17.05, 7: 19.45, 8: 21.85, 9: 24.25, 10: 26.65 } },
  { id: "middle_skill_018", rawName: "순위경쟁", score: { 5: 14.15, 6: 16.55, 7: 18.95, 8: 21.35, 9: 23.75, 10: 26.15 } },
  { id: "middle_skill_019", rawName: "철완(지구력 100~116)", score: { 5: 14.4, 6: 16.8, 7: 16.8, 8: 16.8, 9: 16.8, 10: 16.8 } },
  { id: "middle_skill_071", rawName: "긴급투입(롱릴리프)", score: { 5: 13.16, 6: 15.05, 7: 16.93, 8: 18.82, 9: 20.71, 10: 22.6 } },
  { id: "middle_skill_020", rawName: "도전정신(4성)", score: { 5: 13.8, 6: 16.2, 7: 18.6, 8: 21, 9: 23.4, 10: 25.8 } },
  { id: "middle_skill_021", rawName: "가을사나이", score: { 5: 13.5, 6: 15.9, 7: 18.3, 8: 20.7, 9: 23.1, 10: 25.5 } },
  { id: "middle_skill_022", rawName: "패기(시그/올스타불펜)", score: { 5: 13.61, 6: 15.55, 7: 17.5, 8: 19.44, 9: 21.38, 10: 23.32 } },
  { id: "middle_skill_023", rawName: "약속의8회", score: { 5: 12.48, 6: 15.12 } },
  { id: "middle_skill_024", rawName: "국대에이스(버프o)", score: { 5: 12, 6: 14.4 } },
  { id: "middle_skill_076", rawName: "국대에이스(버프x)", score: { 5: 12, 6: 14.4 } },
  { id: "middle_skill_025", rawName: "도전정신(5성)", score: { 5: 12, 6: 14.4, 7: 16.8, 8: 19.2, 9: 21.6, 10: 24 } },
  { id: "middle_skill_026", rawName: "홈어드밴티지", score: { 5: 12, 6: 14.4, 7: 16.8, 8: 19.2, 9: 21.6, 10: 24 } },
  { id: "middle_skill_027", rawName: "에이스", score: { 5: 12, 6: 14.4, 7: 16.8, 8: 19.2, 9: 21.6, 10: 24 } },
  { id: "middle_skill_028", rawName: "국민계투", score: { 5: 12.32, 6: 14.3 } },
  { id: "middle_skill_029", rawName: "부동심", score: { 5: 11.79, 6: 13.77, 7: 16.18, 8: 18.58, 9: 20.98, 10: 23.38 } },
  { id: "middle_skill_030", rawName: "수호신(셋업2)", score: { 5: 10.94, 6: 12.77, 7: 14.59, 8: 16.42, 9: 18.25, 10: 20.08 } },
  { id: "middle_skill_031", rawName: "승리의함성(필승조)", score: { 5: 10.65, 6: 12.5, 7: 14.35, 8: 16.2, 9: 18.05, 10: 19.91 } },
  { id: "middle_skill_032", rawName: "베스트포지션", score: { 5: 9.6, 6: 12, 7: 16.8, 8: 21.6, 9: 26.4, 10: 31.2 } },
  { id: "middle_skill_033", rawName: "원포인트릴리프(셋업/마무리)", score: { 5: 10.85, 6: 12.67, 7: 14.48, 8: 16.3, 9: 18.12, 10: 19.94 } },
  { id: "middle_skill_034", rawName: "오버페이스(중계)", score: { 5: 12, 6: 12, 7: 14.4, 8: 14.4, 9: 16.8, 10: 16.8 } },
  { id: "middle_skill_035", rawName: "라이징스타(추격조)", score: { 5: 9.08, 6: 10.72, 7: 12.35, 8: 13.99, 9: 15.63, 10: 17.27 } },
  { id: "middle_skill_036", rawName: "난세의영웅(불펜)", score: { 5: 6.24, 6: 9.41, 7: 10.18, 8: 13.34, 9: 14.11, 10: 17.27 } },
  { id: "middle_skill_037", rawName: "얼리스타트(셋업/마무리)", score: { 5: 8.24, 6: 9.98, 7: 11.73, 8: 13.47, 9: 15.22, 10: 16.97 } },
  { id: "middle_skill_079", rawName: "슬로우스타트(불펜)", score: { 5: 9.79, 6: 11.45, 7: 13.11, 8: 14.77, 9: 16.43, 10: 18.08 } },
  { id: "middle_skill_038", rawName: "원포인트릴리프(셋업제외중계)", score: { 5: 10.01, 6: 11.73, 7: 13.46, 8: 15.18, 9: 16.9, 10: 18.62 } },
  { id: "middle_skill_039", rawName: "수호신(승리조)", score: { 5: 9.22, 6: 10.75, 7: 12.29, 8: 13.82, 9: 15.35, 10: 16.88 } },
  { id: "middle_skill_040", rawName: "집중력", score: { 5: 9.05, 6: 11.27, 7: 12.42, 8: 14.64, 9: 16.86, 10: 19.08 } },
  { id: "middle_skill_041", rawName: "얼리스타트(셋업제외중계)", score: { 5: 7.78, 6: 9.42, 7: 11.05, 8: 12.68, 9: 14.3, 10: 15.93 } },
  { id: "middle_skill_042", rawName: "승부사", score: { 5: 8.46, 6: 9.71, 7: 10.96, 8: 12.21, 9: 13.46, 10: 14.71 } },
  { id: "middle_skill_043", rawName: "아티스트", score: { 5: 9.2, 6: 10.35, 7: 11.5, 8: 12.65, 9: 13.8, 10: 14.95 } },
  { id: "middle_skill_044", rawName: "언터쳐블", score: { 5: 7.2, 6: 8.1, 7: 9, 8: 9.9, 9: 10.8, 10: 11.7 } },
  { id: "middle_skill_045", rawName: "흐름끊기(셋업/마무리)", score: { 5: 7.95, 6: 9.27, 7: 10.6, 8: 11.92, 9: 13.24, 10: 14.56 } },
  { id: "middle_skill_046", rawName: "승리의함성(롱릴리프)", score: { 5: 7.85, 6: 9.3, 7: 10.75, 8: 12.2, 9: 13.65, 10: 15.09 } },
  { id: "middle_skill_068", rawName: "백전노장", score: { 5: 7.67, 6: 9.45, 7: 10.92, 8: 12.39, 9: 13.85, 10: 15.31 } },
  { id: "middle_skill_047", rawName: "첫단추(불펜)", score: { 5: 6.25, 6: 7.5, 7: 8.75, 8: 10, 9: 11.25, 10: 12.5 } },
  { id: "middle_skill_048", rawName: "평정심", score: { 5: 7, 6: 8.25, 7: 9.75, 8: 11, 9: 12.5, 10: 13.75 } },
  { id: "middle_skill_072", rawName: "긴급투입(필승조/마무리)", score: { 5: 6.59, 6: 7.28, 7: 7.89, 8: 8.51, 9: 9.13, 10: 9.75 } },
  { id: "middle_skill_049", rawName: "라이징스타(배치X)", score: { 5: 5.4, 6: 6.3, 7: 7.2, 8: 8.1, 9: 9, 10: 9.9 } },
  { id: "middle_skill_050", rawName: "흐름끊기(셋업제외불펜)", score: { 5: 6.29, 6: 7.32, 7: 8.38, 8: 9.41, 9: 10.44, 10: 11.47 } },
  { id: "middle_skill_051", rawName: "위닝샷", score: { 5: 4.56, 6: 7.32, 7: 7.68, 8: 8.04, 9: 8.41, 10: 8.78 } },
  { id: "middle_skill_052", rawName: "승리의함성(추격조)", score: { 5: 6.1, 6: 7.3, 7: 8.5, 8: 9.7, 9: 10.9, 10: 12.09 } },
  { id: "middle_skill_053", rawName: "타선지원", score: { 5: 4.5, 6: 5.4, 7: 6.3, 8: 7.2, 9: 8.1, 10: 9 } },
  { id: "middle_skill_054", rawName: "우타킬러(좌투)", score: { 5: 5.29, 6: 6.35, 7: 7.4, 8: 8.47, 9: 9.54, 10: 10.61 } },
  { id: "middle_skill_077", rawName: "우타킬러(우투)", score: { 5: 4.48, 6: 5.37, 7: 6.27, 8: 7.16, 9: 8.05, 10: 8.94 } },
  { id: "middle_skill_055", rawName: "수호신(추격조/롱릴리프)", score: { 5: 4.61, 6: 5.38, 7: 6.14, 8: 6.91, 9: 7.68, 10: 8.45 } },
  { id: "middle_skill_056", rawName: "좌타킬러(우투)", score: { 5: 3.66, 6: 4.4, 7: 5.13, 8: 5.86, 9: 6.59, 10: 7.32 } },
  { id: "middle_skill_078", rawName: "좌타킬러(좌투)", score: { 5: 2.85, 6: 3.42, 7: 3.99, 8: 4.55, 9: 5.11, 10: 5.67 } },
  { id: "middle_skill_057", rawName: "완급조절", score: { 5: 3.84, 6: 4.61, 7: 5.38, 8: 6.14, 9: 6.9, 10: 7.66 } },
  { id: "middle_skill_058", rawName: "클러치피처", score: { 5: 3.68, 6: 4.41, 7: 5.15, 8: 5.89, 9: 6.64, 10: 7.38 } },
  { id: "middle_skill_059", rawName: "위기관리", score: { 5: 2.86, 6: 3.33, 7: 3.81, 8: 4.29, 9: 4.77, 10: 5.25 } },
  { id: "middle_skill_060", rawName: "변화구선호", score: { 5: 2.44, 6: 2.85, 7: 3.39, 8: 3.8, 9: 4.3, 10: 4.68 } },
  { id: "middle_skill_061", rawName: "기선제압(셋업/마무리)", score: { 5: 2.43, 6: 2.92, 7: 3.4, 8: 3.88, 9: 4.36, 10: 4.84 } },
  { id: "middle_skill_062", rawName: "기선제압(셋업제외불펜)", score: { 5: 1.91, 6: 2.3, 7: 2.68, 8: 3.06, 9: 3.44, 10: 3.82 } },
  { id: "middle_skill_063", rawName: "더러운볼끝", score: { 5: 1.76, 6: 2.05, 7: 2.34, 8: 2.63, 9: 2.92, 10: 3.21 } },
  { id: "middle_skill_064", rawName: "속구선호", score: { 5: 1.26, 6: 1.26, 7: 1.68, 8: 1.68, 9: 2.1, 10: 2.1 } },
  { id: "middle_skill_065", rawName: "자신감", score: { 5: 0.99, 6: 1.16, 7: 1.32, 8: 1.49, 9: 1.65, 10: 1.82 } },
  { id: "middle_skill_066", rawName: "수호신(셋업1)", score: { 5: 0.58, 6: 0.67, 7: 0.77, 8: 0.86, 9: 0.95, 10: 1.04 } },
  { id: "middle_skill_067", rawName: "진검승부", score: { 5: 0.48, 6: 0.58, 7: 0.67, 8: 0.77, 9: 0.87, 10: 0.97 } },
  { id: "middle_skill_073", rawName: "사고방지", score: { 5: 0, 6: 0, 7: 0, 8: 0 } },
  { id: "middle_skill_074", rawName: "이닝이터", score: { 5: 0, 6: 0, 7: 0, 8: 0 } },
  { id: "middle_skill_075", rawName: "리그의강자", score: { 5: 0, 6: 0, 7: 0, 8: 0 } },
];

const AMATEUR_SKILLS = new Set(["속구선호", "변화구선호", "진검승부", "사고방지"]);
const ROOKIE_SKILLS = new Set(["평정심", "이닝이터", "기선제압", "더러운볼끝", "자신감"]);
const MINOR_SKILLS = new Set(["좌타킬러", "우타킬러", "위기관리", "완급조절"]);
const NATIONAL_ONLY_SKILLS = new Set(["황금세대", "약속의8회", "투쟁심", "전승우승", "해결사", "국민계투", "국대에이스", "위기탈출", "타순공략"]);

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
  const baseName = getBaseName(row.rawName);
  const grade = resolveSkillGrade(baseName);

  return {
    id: row.id,
    name: row.rawName,
    grade,
    availableCardTypes: resolveAvailableCardTypes(row.rawName, grade),
  };
});

export const MIDDLE_SKILL_SCORES: SkillScoreTable = Object.fromEntries(
  MIDDLE_SKILL_ROWS.map((row) => [row.id, row.score])
);
