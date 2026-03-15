import { useEffect, useMemo, useState } from "react";
import { CARD_TYPE_LABELS } from "./data/cardTypes";
import { calculateSkillTotal } from "./utils/calculate";
import type { CardType, PlayerType, SkillLevel } from "./types";
import { judgeSkillResult } from "./utils/judge";
import SkillSelect from "./components/SkillSelect";
import { RESULT_GRADE_COLORS } from "./data/uiColors";
import PlayerTypeToggle from "./components/PlayerTypeToggle";
import { getGameDataSet } from "./data/gameData";
import { Analytics } from "@vercel/analytics/react"

const DEFAULT_PLAYER_TYPE: PlayerType = "hitter";
const DEFAULT_CARD_TYPE: CardType = "signature";
const DEFAULT_SKILL_1 = "hitter_precision_hit";
const DEFAULT_SKILL_2 = "hitter_big_game_hunter";
const DEFAULT_SKILL_3 = "hitter_batting_machine";
const DEFAULT_LEVEL_1: SkillLevel = 6;
const DEFAULT_LEVEL_2: SkillLevel = 5;
const DEFAULT_LEVEL_3: SkillLevel = 5;

function App() {
  const [cardType, setCardType] = useState<CardType>(DEFAULT_CARD_TYPE);
  const [skill1, setSkill1] = useState(DEFAULT_SKILL_1);
  const [skill2, setSkill2] = useState(DEFAULT_SKILL_2);
  const [skill3, setSkill3] = useState(DEFAULT_SKILL_3);

  const [level1, setLevel1] = useState<SkillLevel>(DEFAULT_LEVEL_1);
  const [level2, setLevel2] = useState<SkillLevel>(DEFAULT_LEVEL_2);
  const [level3, setLevel3] = useState<SkillLevel>(DEFAULT_LEVEL_3);
  const [playerType, setPlayerType] = useState<PlayerType>(DEFAULT_PLAYER_TYPE);

  const gameData = useMemo(() => getGameDataSet(playerType), [playerType]);

  const handleReset = () => {
    setPlayerType(DEFAULT_PLAYER_TYPE);
    setCardType(DEFAULT_CARD_TYPE);
    setSkill1(DEFAULT_SKILL_1);
    setSkill2(DEFAULT_SKILL_2);
    setSkill3(DEFAULT_SKILL_3);
    setLevel1(DEFAULT_LEVEL_1);
    setLevel2(DEFAULT_LEVEL_2);
    setLevel3(DEFAULT_LEVEL_3);
  };

  if (!gameData) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <h1>V26 스킬 점수 계산기</h1>

        <PlayerTypeToggle
          value={playerType}
          onChange={setPlayerType}
          pitcherEnabled={false}
        />

        <div
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 8,
            background: "white",
          }}
        >
          투수 데이터는 아직 준비 중입니다.
        </div>
      </div>
    );
  }

  const filteredSkills = gameData.skills.filter((skill) =>
    skill.availableCardTypes.includes(cardType)
  );

  useEffect(() => {
    const filteredSkillIds = filteredSkills.map((skill) => skill.id);

    if (!filteredSkillIds.includes(skill1)) {
      setSkill1(filteredSkillIds[0] ?? "");
    }

    if (!filteredSkillIds.includes(skill2)) {
      setSkill2(filteredSkillIds[1] ?? filteredSkillIds[0] ?? "");
    }

    if (!filteredSkillIds.includes(skill3)) {
      setSkill3(filteredSkillIds[2] ?? filteredSkillIds[0] ?? "");
    }
  }, [cardType, filteredSkills, skill1, skill2, skill3]);

  const totalScore = calculateSkillTotal({
    cardType,
    skillIds: [skill1, skill2, skill3],
    skillLevels: [level1, level2, level3],
    scoreTable: gameData.scoreTable,
  });

  const judgeResult = judgeSkillResult(gameData.thresholds, cardType, totalScore);
  const resultGradeColor = RESULT_GRADE_COLORS[judgeResult.grade];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1>V26 스킬 점수 계산기</h1>

      <PlayerTypeToggle
        value={playerType}
        onChange={setPlayerType}
        pitcherEnabled={false}
      />

      <section style={{ marginTop: 24 }}>
        <label>카드 종류</label>
        <br />

        <select
          value={cardType}
          onChange={(e) => setCardType(e.target.value as CardType)}
        >
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
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 260 }}>
            <SkillSelect
              label={cardType === "impact" ? "스킬 1 (고정)" : "스킬 1"}
              value={skill1}
              options={filteredSkills}
              excludedSkillIds={[skill2, skill3]}
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
              value={skill2}
              options={filteredSkills}
              excludedSkillIds={[skill1, skill3]}
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
              value={skill3}
              options={filteredSkills}
              excludedSkillIds={[skill1, skill2]}
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
          판정 등급:{" "}
          <strong style={{ color: resultGradeColor }}>
            {judgeResult.grade}
          </strong>
        </p>
        <p>
          기준 확률:{" "}
          {judgeResult.matchedPercent !== null
            ? `${judgeResult.matchedPercent}%`
            : "기준표 범위 밖"}
        </p>

        {cardType === "impact" && (
          <p style={{ color: "crimson" }}>
            임팩트 카드는 1스킬을 고정하고 2, 3스킬만 합산합니다.
          </p>
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