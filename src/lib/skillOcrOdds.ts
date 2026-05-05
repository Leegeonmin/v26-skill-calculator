import { getGameDataSet } from "../data/gameData";
import { RESULT_GRADE_COLORS } from "../data/uiColors";
import type { HitterPositionGroup } from "../types";
import type { SkillOcrSelectedPlayer } from "../types/ocr";
import { calculateAdvancedSkillOdds } from "../utils/advancedSkillOdds";
import { formatTopPercent } from "../utils/formatOdds";
import { judgeSkillResultByProbability } from "../utils/judge";

export type SkillOcrPlayerOdds = {
  grade: string;
  gradeColor: string;
  topPercentLabel: string;
  basisLabel: string;
};

function getHitterPositionGroup(position: string | null | undefined): HitterPositionGroup {
  const normalized = (position ?? "").normalize("NFKC").replace(/\s+/g, "").toLowerCase();
  return normalized === "c" || normalized === "포수" || normalized === "catcher"
    ? "catcher"
    : "fielder";
}

export function getSkillOcrPlayerOdds(player: SkillOcrSelectedPlayer): SkillOcrPlayerOdds | null {
  if (player.skills.length < 3 || player.skills.some((skill) => !skill.skillId)) {
    return null;
  }

  const dataSet =
    player.calculatorMode === "hitter"
      ? getGameDataSet({ playerType: "hitter" })
      : getGameDataSet({
          playerType: "pitcher",
          pitcherRole: player.calculatorMode,
          starterHand: player.starterHand ?? "right",
        });

  if (!dataSet) {
    return null;
  }

  const [skill1, skill2, skill3] = player.skills;
  const targetScore =
    player.cardType === "impact"
      ? Number(
          (
            (dataSet.scoreTable[skill2.skillId ?? ""]?.[skill2.level] ?? 0) +
            (dataSet.scoreTable[skill3.skillId ?? ""]?.[skill3.level] ?? 0)
          ).toFixed(2)
        )
      : player.totalScore;
  const odds = calculateAdvancedSkillOdds({
    mode: player.calculatorMode,
    cardType: player.cardType,
    hitterPositionGroup: getHitterPositionGroup(player.position),
    skills: dataSet.skills,
    scoreTable: dataSet.scoreTable,
    skillIds: [skill1.skillId ?? "", skill2.skillId ?? "", skill3.skillId ?? ""],
    skillLevels: [skill1.level, skill2.level, skill3.level],
    targetScore,
  });
  const judgeResult = judgeSkillResultByProbability(odds?.scoreAtLeastProbability);

  return {
    grade: judgeResult?.grade ?? "-",
    gradeColor: judgeResult ? RESULT_GRADE_COLORS[judgeResult.grade] : "#94a3b8",
    topPercentLabel: formatTopPercent(odds?.scoreAtLeastProbability),
    basisLabel: player.cardType === "impact" ? "상위(2,3)" : "상위",
  };
}
