import { useMemo, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { CARD_TYPE_LABELS } from "./data/cardTypes";
import { getGameDataSet } from "./data/gameData";
import { RESULT_GRADE_COLORS } from "./data/uiColors";
import PlayerTypeToggle from "./components/PlayerTypeToggle";
import SkillSelect from "./components/SkillSelect";
import type {
  CardType,
  PitcherRole,
  PlayerType,
  SkillLevel,
} from "./types";
import { calculateSkillTotal } from "./utils/calculate";
import { judgeSkillResult } from "./utils/judge";

const DEFAULT_PLAYER_TYPE: PlayerType = "hitter";
const DEFAULT_PITCHER_ROLE: PitcherRole = "starter";
const DEFAULT_CARD_TYPE: CardType = "signature";
const DEFAULT_SKILL_1 = "hitter_precision_hit";
const DEFAULT_SKILL_2 = "hitter_big_game_hunter";
const DEFAULT_SKILL_3 = "hitter_batting_machine";
const DEFAULT_LEVEL_1: SkillLevel = 6;
const DEFAULT_LEVEL_2: SkillLevel = 5;
const DEFAULT_LEVEL_3: SkillLevel = 5;

function pickValidSkill(
  desired: string,
  candidates: string[],
  excluded: string[] = []
): string {
  if (desired && candidates.includes(desired) && !excluded.includes(desired)) {
    return desired;
  }

  const fallback = candidates.find((id) => !excluded.includes(id));
  return fallback ?? "";
}

function formatMatchedPercent(percent: number | null): string {
  if (percent === null) return "기준표 최저점 미만";
  if (percent <= 0) return "0% 미만";
  if (percent < 0.01) return "< 0.01%";
  return `${percent}%`;
}

function getEncouragementMessage(percent: number | null): string | null {
  if (percent === null) return null;
  if (percent <= 0.01) return "사기꾼";
  return null;
}

function App() {
  const [playerType, setPlayerType] = useState<PlayerType>(DEFAULT_PLAYER_TYPE);
  const [pitcherRole, setPitcherRole] = useState<PitcherRole>(DEFAULT_PITCHER_ROLE);

  const [cardType, setCardType] = useState<CardType>(DEFAULT_CARD_TYPE);
  const [skill1, setSkill1] = useState(DEFAULT_SKILL_1);
  const [skill2, setSkill2] = useState(DEFAULT_SKILL_2);
  const [skill3, setSkill3] = useState(DEFAULT_SKILL_3);

  const [level1, setLevel1] = useState<SkillLevel>(DEFAULT_LEVEL_1);
  const [level2, setLevel2] = useState<SkillLevel>(DEFAULT_LEVEL_2);
  const [level3, setLevel3] = useState<SkillLevel>(DEFAULT_LEVEL_3);

  const gameData = useMemo(
    () => getGameDataSet({ playerType, pitcherRole }),
    [playerType, pitcherRole]
  );

  const filteredSkills = useMemo(() => {
    if (!gameData) return [];
    return gameData.skills.filter((skill) => skill.availableCardTypes.includes(cardType));
  }, [gameData, cardType]);

  const filteredSkillIds = useMemo(
    () => filteredSkills.map((skill) => skill.id),
    [filteredSkills]
  );

  const resolvedSkill1 = pickValidSkill(skill1, filteredSkillIds);
  const resolvedSkill2 = pickValidSkill(skill2, filteredSkillIds, [resolvedSkill1]);
  const resolvedSkill3 = pickValidSkill(skill3, filteredSkillIds, [resolvedSkill1, resolvedSkill2]);

  const handleReset = () => {
    if (!gameData) return;

    setCardType(DEFAULT_CARD_TYPE);

    const resetSkills = gameData.skills
      .filter((skill) => skill.availableCardTypes.includes(DEFAULT_CARD_TYPE))
      .map((skill) => skill.id);

    setSkill1(resetSkills[0] ?? "");
    setSkill2(resetSkills[1] ?? resetSkills[0] ?? "");
    setSkill3(resetSkills[2] ?? resetSkills[0] ?? "");

    setLevel1(DEFAULT_LEVEL_1);
    setLevel2(DEFAULT_LEVEL_2);
    setLevel3(DEFAULT_LEVEL_3);
  };

  const pitcherSelectorSection =
    playerType === "pitcher" ? (
      <section style={{ marginTop: 16 }}>
        <label htmlFor="pitcher-role">보직</label>
        <br />
        <select
          id="pitcher-role"
          value={pitcherRole}
          onChange={(e) => setPitcherRole(e.target.value as PitcherRole)}
        >
          <option value="starter">선발</option>
          <option value="middle">중계</option>
          <option value="closer">마무리</option>
        </select>
      </section>
    ) : null;

  if (!gameData) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <h1>V26 Skill Calculator</h1>

        <PlayerTypeToggle value={playerType} onChange={setPlayerType} />
        {pitcherSelectorSection}

        <div
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 8,
            background: "white",
          }}
        >
          {playerType === "hitter"
            ? "데이터를 불러오지 못했습니다."
            : `${pitcherRole} 데이터는 아직 연결 전입니다.`}
        </div>
      </div>
    );
  }

  const totalScore = calculateSkillTotal({
    cardType,
    skillIds: [resolvedSkill1, resolvedSkill2, resolvedSkill3],
    skillLevels: [level1, level2, level3],
    scoreTable: gameData.scoreTable,
  });

  const judgeResult = judgeSkillResult(gameData.thresholds, cardType, totalScore);
  const resultGradeColor = RESULT_GRADE_COLORS[judgeResult.grade];
  const encouragementMessage = getEncouragementMessage(judgeResult.matchedPercent);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1>V26 Skill Calculator</h1>

      <PlayerTypeToggle value={playerType} onChange={setPlayerType} />
      {pitcherSelectorSection}

      <section style={{ marginTop: 24 }}>
        <label>카드 종류</label>
        <br />

        <select value={cardType} onChange={(e) => setCardType(e.target.value as CardType)}>
          {Object.entries(CARD_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleReset}
          style={{
            marginLeft: 12,
            padding: "8px 14px",
            border: "1px solid #ccc",
            borderRadius: 6,
            background: "white",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          초기화
        </button>
      </section>

      <section style={{ marginTop: 24 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <SkillSelect
              label={cardType === "impact" ? "스킬 1 (고정)" : "스킬 1"}
              value={resolvedSkill1}
              options={filteredSkills}
              excludedSkillIds={[resolvedSkill2, resolvedSkill3]}
              onChange={setSkill1}
              disabled={cardType === "impact"}
            />

            <select
              value={level1}
              onChange={(e) => setLevel1(Number(e.target.value) as SkillLevel)}
              disabled={cardType === "impact"}
              style={{ marginTop: 10, width: "100%" }}
            >
              {[5, 6, 7, 8].map((level) => (
                <option key={level} value={level}>
                  {level} 레벨
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 260 }}>
            <SkillSelect
              label="스킬 2"
              value={resolvedSkill2}
              options={filteredSkills}
              excludedSkillIds={[resolvedSkill1, resolvedSkill3]}
              onChange={setSkill2}
            />

            <select
              value={level2}
              onChange={(e) => setLevel2(Number(e.target.value) as SkillLevel)}
              style={{ marginTop: 10, width: "100%" }}
            >
              {[5, 6, 7, 8].map((level) => (
                <option key={level} value={level}>
                  {level} 레벨
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 260 }}>
            <SkillSelect
              label="스킬 3"
              value={resolvedSkill3}
              options={filteredSkills}
              excludedSkillIds={[resolvedSkill1, resolvedSkill2]}
              onChange={setSkill3}
            />

            <select
              value={level3}
              onChange={(e) => setLevel3(Number(e.target.value) as SkillLevel)}
              style={{ marginTop: 10, width: "100%" }}
            >
              {[5, 6, 7, 8].map((level) => (
                <option key={level} value={level}>
                  {level} 레벨
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section
        style={{
          marginTop: 32,
          padding: 16,
          border: `2px solid ${resultGradeColor}`,
          borderRadius: 8,
          background: "white",
        }}
      >
        <h2>결과</h2>
        <p>총 스킬 점수: {totalScore}</p>
        <p>
          판정 등급: <strong style={{ color: resultGradeColor }}>{judgeResult.grade}</strong>
        </p>
        <p>
          기준 확률: {formatMatchedPercent(judgeResult.matchedPercent)}
        </p>
        {encouragementMessage && (
          <p style={{ color: "#16a34a", fontWeight: 700 }}>{encouragementMessage}</p>
        )}

        {cardType === "impact" && (
          <p style={{ color: "crimson" }}>임팩트 카드는 1스킬 고정 + 2,3스킬만 합산합니다.</p>
        )}
      </section>

      <footer
        style={{
          marginTop: 40,
          paddingTop: 16,
          borderTop: "1px solid #ddd",
          textAlign: "center",
          color: "#666",
          fontSize: 14,
        }}
      >
        made by 우주
      </footer>
      <Analytics />
    </div>
  );
}

export default App;
