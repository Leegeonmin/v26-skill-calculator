import type { CardType, SkillLevel, SkillMeta } from "../types";
import type { ResultGrade } from "../utils/judge";
import { normalizeSkillBaseName } from "../utils/skillChangeRollCore";

export const TOOL_USAGE_SESSION_KEY = "v26-tool-usage-session";

export function getOrCreateToolUsageSessionId(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  const stored = window.sessionStorage.getItem(TOOL_USAGE_SESSION_KEY);
  if (stored) {
    return stored;
  }

  const nextId =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `tool-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  window.sessionStorage.setItem(TOOL_USAGE_SESSION_KEY, nextId);
  return nextId;
}

export function getDefaultLevels(cardType: CardType): [SkillLevel, SkillLevel, SkillLevel] {
  if (cardType === "goldenGlove") {
    return [6, 6, 6];
  }

  return [6, 5, 5];
}

export function pickValidSkill(
  desired: string,
  candidates: string[],
  excluded: string[] = [],
  skillMap?: Map<string, SkillMeta>
): string {
  if (!desired) {
    return "";
  }

  if (!candidates.includes(desired) || excluded.includes(desired)) {
    return "";
  }

  if (skillMap) {
    const desiredSkill = skillMap.get(desired);
    const desiredBaseName = desiredSkill ? normalizeSkillBaseName(desiredSkill.name) : null;
    const hasExcludedFamily = excluded.some((skillId) => {
      const excludedSkill = skillMap.get(skillId);
      return (
        desiredBaseName &&
        excludedSkill &&
        normalizeSkillBaseName(excludedSkill.name) === desiredBaseName
      );
    });

    if (hasExcludedFamily) {
      return "";
    }
  }

  return desired;
}

export function getSkillScoreLabel(score: number | undefined): string {
  if (score === undefined) return "점수 -";
  return `점수 ${score}`;
}

export function getEncouragementMessage(percent: number | null): string | null {
  if (percent === null) return null;
  if (percent <= 0.01) return "사기꾼";
  return null;
}

export function getResultSummaryMessage(percent: number | null): string {
  if (percent === null) {
    return "애매하다. 조금 더 돌려보는 걸 추천";
  }

  if (percent <= 0.5) {
    return "극극종결. 사장님 아니면 안돌려도됨";
  }

  if (percent <= 1.5) {
    return "매우 잘 뜬 편. 웬만하면 만족하고 써도 됨";
  }

  if (percent <= 7) {
    return "실사용 가능";
  }

  if (percent <= 12) {
    return "쓰다가 여유 생기면 돌리길 추천";
  }

  return "흔한 편. 임시로 쓰고 갈아타는 쪽 추천";
}

export function gradeRank(value: ResultGrade): number {
  const rankMap: Record<ResultGrade, number> = {
    F: 0,
    C: 1,
    A: 2,
    S: 3,
    "SSR+": 4,
  };

  return rankMap[value];
}
